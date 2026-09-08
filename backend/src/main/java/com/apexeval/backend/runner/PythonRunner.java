package com.apexeval.backend.runner;

import com.apexeval.backend.execution.TestResult;
import com.apexeval.backend.sandbox.DockerSandboxExecutor;
import com.apexeval.backend.sandbox.SandboxExecutor;
import com.apexeval.backend.sandbox.SandboxLimits;
import com.apexeval.backend.sandbox.SandboxRequest;
import com.apexeval.backend.sandbox.SandboxResult;
import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.EvaluationMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PythonRunner implements EvaluationRunner {

    private static final Logger log = LoggerFactory.getLogger(PythonRunner.class);

    private final SandboxExecutor sandboxExecutor;
    private final String defaultImage;

    public PythonRunner(
            DockerSandboxExecutor sandboxExecutor,
            @Value("${apexeval.runner.python.image:python:3.12-slim}") String defaultImage
    ) {
        this.sandboxExecutor = sandboxExecutor;
        this.defaultImage = defaultImage;
    }

    @Override
    public String id() {
        return "python-runner";
    }

    @Override
    public boolean supports(ProjectDescriptor project) {
        return project.technology() == Technology.PYTHON;
    }

    @Override
    public RunnerResult evaluate(ProjectDescriptor project, RunnerContext context) {
        long start = System.currentTimeMillis();
        String assignmentId = project.assignmentId();

        log.info("PythonRunner.evaluate started for assignmentId={}", assignmentId);

        try {
            // Build the full command: install pytest, copy hidden tests, run tests
            String hiddenTestPath = project.envVars().getOrDefault("hiddenTestPath", "");
            String hiddenTestBase = project.envVars().getOrDefault("hiddenTestBase", "src/main/python");
            String assignmentPath = context.assignmentPath();
            
            String testCommand = buildTestCommand(project, hiddenTestPath, hiddenTestBase, assignmentPath);
            String[] command = {"/bin/sh", "-c", testCommand};

            log.info("PythonRunner test command: {}", testCommand);

            // Prepare volumes. The student workspace is mounted read-only so
            // the runner cannot pollute it; the sandbox's /scratch tmpfs
            // holds the staged copy and any build artifacts.
            Map<String, String> volumes = Map.of(
                    context.workspacePath(), "/workspace:ro",
                    context.fixturesBasePath(), "/fixtures:ro"
            );

            // Prepare environment
            String fullSourcePath = assignmentPath + "/" + (hiddenTestBase != null && !hiddenTestBase.isEmpty() ? hiddenTestBase : "src/main/python");
            Map<String, String> env = new HashMap<>(Map.of(
                    "PYTHONPATH", "/scratch/" + fullSourcePath,
                    "ASSIGNMENT_ID", assignmentId
            ));

            if (project.envVars() != null) {
                env.putAll(project.envVars());
            }

            // Working directory - run from /tmp. The runner command
            // itself cd's into the staged source dir before invoking
            // pytest, so the sandbox's default working directory is
            // never /scratch/<assignment> (which the stage step
            // briefly removes).
            String workingDir = "/tmp";

            // Limits
            SandboxLimits limits = SandboxLimits.from(context.limits());

            SandboxRequest request = new SandboxRequest(
                    resolveImage(project.runtimeImage()),
                    command,
                    workingDir,
                    env,
                    volumes,
                    limits,
                    null
            );

            log.info("PythonRunner calling sandboxExecutor.execute()");
            SandboxResult result = sandboxExecutor.execute(request);
            log.info("PythonRunner sandboxExecutor.execute() returned: exitCode={}, durationMs={}, stdoutLen={}, stderrLen={}", 
                    result.exitCode(), System.currentTimeMillis() - start, 
                    result.stdout() != null ? result.stdout().length() : 0,
                    result.stderr() != null ? result.stderr().length() : 0);

            long durationMs = System.currentTimeMillis() - start;

            // Parse test results from pytest output
            List<TestResult> testResults = parseTestOutput(result.stdout(), result.stderr(), result.exitCode());

            return new RunnerResult(
                    result.exitCode() == 0,
                    testResults,
                    result.stdout(),
                    result.stderr(),
                    durationMs,
                    Map.of("runner", "python-runner", "image", project.runtimeImage())
            );

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
            log.error("PythonRunner exception: {}", e.getMessage(), e);
            return new RunnerResult(
                    false,
                    List.of(),
                    "",
                    e.getMessage(),
                    durationMs,
                    Map.of("error", e.getClass().getSimpleName())
            );
        }
    }

    private String buildTestCommand(ProjectDescriptor project, String hiddenTestPath, String hiddenTestBase, String assignmentPath) {
        String testCmd = project.testCommand() != null ? project.testCommand() : "pytest -v --tb=short";

        // The runner stages the assignment from the read-only /workspace
        // mount to a writable /scratch directory, then copies the hidden
        // test alongside the staged student source. Nothing is ever
        // written back to the host filesystem.
        String stageBase = "/scratch/" + assignmentPath + "/" +
                (hiddenTestBase != null ? hiddenTestBase : "src/main/python");

        StringBuilder cmd = new StringBuilder();
        cmd.append(HiddenTestInstaller.stage(assignmentPath)).append(" && ");
        cmd.append("pip install pytest -q > /dev/null 2>&1 && ");

        String install = HiddenTestInstaller.build(hiddenTestPath, stageBase);
        if (!install.isEmpty()) {
            cmd.append(install).append(" && ");
        }

        cmd.append("cd ").append(stageBase).append(" && ");
        cmd.append(testCmd);

        return cmd.toString();
    }

    private List<TestResult> parseTestOutput(String stdout, String stderr, int exitCode) {
        List<TestResult> results = new ArrayList<>();
        
        // Parse pytest output for test results
        // Pattern matches lines like: test_file.py::TestClass::test_name PASSED/FAILED
        Pattern pattern = Pattern.compile("(\\S+)::(\\S+)::(\\S+)\\s+(PASSED|FAILED|ERROR|SKIPPED)");
        Matcher matcher = pattern.matcher(stdout);
        
        while (matcher.find()) {
            String fileName = matcher.group(1);
            String className = matcher.group(2);
            String testName = matcher.group(3);
            String status = matcher.group(4);
            
            String fullTestName = className + "." + testName;
            boolean passed = "PASSED".equals(status);
            String message = null;
            
            if (!passed) {
                // Try to extract failure message from output
                message = extractFailureMessage(stdout, fullTestName);
            }
            
            results.add(new TestResult(fullTestName, passed, message));
        }
        
        return results;
    }

    private String extractFailureMessage(String output, String testName) {
        // Simple extraction - find the failure section for this test
        int testIndex = output.indexOf(testName);
        if (testIndex >= 0) {
            // Find the next test or end of failure section
            int nextTestIndex = output.indexOf("PASSED", testIndex);
            int nextFailIndex = output.indexOf("FAILED", testIndex);
            int endIndex = output.length();
            
            if (nextTestIndex > testIndex) endIndex = Math.min(endIndex, nextTestIndex);
            if (nextFailIndex > testIndex) endIndex = Math.min(endIndex, nextFailIndex);
            
            String failureSection = output.substring(testIndex, Math.min(testIndex + 500, endIndex));
            // Extract assertion error
            int assertIndex = failureSection.indexOf("AssertionError");
            if (assertIndex >= 0) {
                return failureSection.substring(assertIndex).lines().findFirst().orElse("Test failed");
            }
            return "Test failed";
        }
        return "Test failed";
    }

    public ProjectDescriptor buildProjectDescriptor(String assignmentId, String runtimeImage, String testCommand, String hiddenTestPath, String hiddenTestBase) {
        return new ProjectDescriptor(
                assignmentId,
                Technology.PYTHON,
                Framework.NONE,
                EvaluationMode.CLI,
                runtimeImage != null ? runtimeImage : defaultImage,
                "python -m py_compile",
                testCommand != null ? testCommand : "pytest -v --tb=short",
                Map.of(
                        "hiddenTestPath", hiddenTestPath != null ? hiddenTestPath : "",
                        "hiddenTestBase", hiddenTestBase != null ? hiddenTestBase : "src/main/python"
                )
        );
    }

    private String resolveImage(String runtimeImage) {
        if (runtimeImage == null || runtimeImage.isBlank()) {
            return defaultImage;
        }
        // If the runtime image looks like a strategy name (uppercase, no colon), use default
        if (!runtimeImage.contains(":") && runtimeImage.equals(runtimeImage.toUpperCase())) {
            return defaultImage;
        }
        return runtimeImage;
    }
}