package com.apexeval.backend.execution;

import com.apexeval.backend.assignment.AssignmentPathValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.utility.DockerImageName;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

@Component
public class PlainJavaExecutionStrategy implements ExecutionStrategy {

    private static final String WORKDIR = "/config/workspace";
    private static final String REPORTS = "/tmp/reports";

    private final AssignmentRegistry assignmentRegistry;
    private final AssignmentPathValidator pathValidator;
    private final String junitJar;
    private final String dockerImage;

    public PlainJavaExecutionStrategy(
            AssignmentRegistry assignmentRegistry,
            AssignmentPathValidator pathValidator,
            @Value("${apexeval.execution.docker-image}") String dockerImage,
            @Value("${apexeval.execution.junit-console-jar}") String junitJar
    ) {
        this.assignmentRegistry = assignmentRegistry;
        this.pathValidator = pathValidator;
        this.dockerImage = dockerImage;
        this.junitJar = junitJar;
    }

    @Override
    public String getAssignmentType() {
        return "PLAIN_JAVA";
    }

    @Override
    public ExecuteResponse execute(
            String workspacePath,
            String assignmentPath,
            String assignmentId
    ) {
        long start = System.currentTimeMillis();
        AssignmentConfig config = assignmentRegistry.get(assignmentId);
        Path assignmentDir = pathValidator.resolve(workspacePath, assignmentPath);

        try (GenericContainer<?> container = new GenericContainer<>(DockerImageName.parse(dockerImage))
                .withCommand("tail", "-f", "/dev/null")) {
            container.start();
            container.execInContainer("mkdir", "-p", WORKDIR, REPORTS);

            copyStudentSources(container, assignmentDir);
            copyHiddenTest(container, config);
            compile(container);
            runTests(container, config.getTestClassName());

            List<TestResult> results = readReports(container);
            return new ExecuteResponse(results, System.currentTimeMillis() - start);

        } catch (IOException | InterruptedException e) {
            throw new ExecutionException("Core Java execution failed", e);
        }
    }

    private void copyStudentSources(GenericContainer<?> container, Path assignmentDir)
            throws IOException {
        try (Stream<Path> files = Files.walk(assignmentDir)) {
            List<Path> javaFiles = files
                    .filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(path -> !path.toString().contains("/.git/"))
                    .toList();

            if (javaFiles.isEmpty()) {
                throw new ExecutionException("No student .java files found in " + assignmentDir);
            }

            for (Path javaFile : javaFiles) {
                String relative = assignmentDir.relativize(javaFile)
                        .toString().replace('\\', '/');
                String target = WORKDIR + "/src/" + relative;
                container.copyFileToContainer(
                        Transferable.of(Files.readAllBytes(javaFile)), target
                );
            }
        }
    }

    private void copyHiddenTest(GenericContainer<?> container, AssignmentConfig config)
            throws IOException {
        Path hiddenTest = config.getHiddenTestFile();

        // Try container path first (/opt/fixtures/... due to docker-compose mount),
        // then fall back to host path
        String hiddenTestPath = config.getSpecification().getHiddenTestPath() != null
                ? config.getSpecification().getHiddenTestPath()
                : (config.getSpecification().getHiddenTests() != null
                        ? config.getSpecification().getHiddenTests().getPath()
                        : null);
        Path containerPath = Paths.get("/opt/fixtures", hiddenTestPath);
        Path actualHiddenTest = containerPath.toFile().exists() ? containerPath : hiddenTest;
        if (!actualHiddenTest.toFile().exists()) {
            throw new ExecutionException("Hidden test file not found at container path or host path");
        }

        // Mirror the same relative path under WORKDIR/src/ so javac picks it up
        // together with the student sources (the build-helper-maven-plugin is
        // not available in this minimal image; the console launcher needs the
        // compiled class on the classpath).
        String relative = Paths.get(hiddenTestPath).toString().replace('\\', '/');
        if (relative.startsWith("/")) {
            relative = relative.substring(1);
        }
        String target = WORKDIR + "/src/" + relative;
        container.copyFileToContainer(
                Transferable.of(Files.readAllBytes(actualHiddenTest)),
                target
        );
    }

    private void compile(GenericContainer<?> container)
            throws IOException, InterruptedException {
        var result = container.execInContainer("bash", "-c",
                "mkdir -p " + WORKDIR + "/classes && " +
                        "find " + WORKDIR + "/src -name '*.java' > " + WORKDIR + "/sources.txt && " +
                        "javac -cp " + junitJar + " -d " + WORKDIR + "/classes @" +
                        WORKDIR + "/sources.txt"
        );

        if (result.getExitCode() != 0) {
            throw new ExecutionException("Compilation failed:\n" + result.getStdout() + result.getStderr());
        }
    }

    private void runTests(GenericContainer<?> container, String testClass)
            throws IOException, InterruptedException {
        var result = container.execInContainer("bash", "-c",
                "java -jar " + junitJar +
                        " --class-path " + WORKDIR + "/classes" +
                        " --select-class " + testClass +
                        " --reports-dir=" + REPORTS +
                        " --details=none"
        );

        if (result.getExitCode() == 2) {
            throw new ExecutionException("JUnit launcher failed:\n" + result.getStdout() + result.getStderr());
        }
    }

    private List<TestResult> readReports(GenericContainer<?> container)
            throws IOException, InterruptedException {
        var list = container.execInContainer("bash", "-c", "ls " + REPORTS + "/*.xml 2>/dev/null || true");
        if (list.getStdout().trim().isEmpty()) {
            throw new ExecutionException("No JUnit XML report generated");
        }

        List<TestResult> results = new ArrayList<>();
        for (String report : list.getStdout().trim().split("\\R")) {
            var xml = container.execInContainer("cat", report.trim());
            results.addAll(parseXml(xml.getStdout()));
        }
        return results;
    }

    private List<TestResult> parseXml(String xml)
            throws IOException {
        List<TestResult> results = new ArrayList<>();
        try {
            var factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document document = factory.newDocumentBuilder().parse(
                    new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))
            );

            NodeList testcases = document.getElementsByTagName("testcase");
            for (int i = 0; i < testcases.getLength(); i++) {
                Element testcase = (Element) testcases.item(i);
                NodeList failures = testcase.getElementsByTagName("failure");
                NodeList errors = testcase.getElementsByTagName("error");
                boolean passed = failures.getLength() == 0 && errors.getLength() == 0;
                String message = null;
                if (!passed) {
                    Element failure = failures.getLength() > 0
                            ? (Element) failures.item(0)
                            : (Element) errors.item(0);
                    message = failure.getAttribute("message");
                }
                results.add(new TestResult(testcase.getAttribute("name"), passed, message));
            }
        } catch (ParserConfigurationException | SAXException e) {
            throw new ExecutionException("Failed to parse JUnit XML", e);
        }
        return results;
    }
}
