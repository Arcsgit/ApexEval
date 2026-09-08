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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class NativeRunner implements EvaluationRunner {

    private final SandboxExecutor sandboxExecutor;
    private final String defaultImage;

    public NativeRunner(
            DockerSandboxExecutor sandboxExecutor,
            @Value("${apexeval.runner.native.image:gcc:13}") String defaultImage
    ) {
        this.sandboxExecutor = sandboxExecutor;
        this.defaultImage = defaultImage;
    }

    @Override
    public String id() {
        return "native-runner";
    }

    @Override
    public boolean supports(ProjectDescriptor project) {
        return project.technology() == Technology.C
                || project.technology() == Technology.CPP;
    }

    @Override
    public RunnerResult evaluate(ProjectDescriptor project, RunnerContext context) {
        long start = System.currentTimeMillis();
        String assignmentId = project.assignmentId();

        try {
            // Build the test command - use project config or defaults
            String testCommand = project.testCommand() != null
                    ? project.testCommand()
                    : (project.buildCommand() != null
                            ? project.buildCommand() + " && ./test"
                            : "make test");
            String hiddenTestPath = project.envVars() != null
                    ? project.envVars().getOrDefault("hiddenTestPath", "")
                    : "";
            String hiddenTestBase = project.envVars() != null
                    ? project.envVars().getOrDefault("hiddenTestBase", "hidden-tests")
                    : "hidden-tests";
            String assignmentPath = context.assignmentPath();

            // Stage the assignment to /scratch and drop the hidden test
            // alongside the staged source. The project's Makefile expects
            // hidden-tests/<file>.c to be present in the assignment dir.
            String stageBase = "/scratch/" + assignmentPath + "/" + hiddenTestBase;
            String stageCmd = HiddenTestInstaller.stage(assignmentPath);
            String installHidden = HiddenTestInstaller.build(hiddenTestPath, stageBase);
            // After the stage step the shell's cwd is /tmp (the helper
            // does `cd /tmp` first so it can rm -rf the cwd). cd back
            // into the staged dir so the project's Makefile/npm test
            // finds the right working directory.
            String stagedDir = "/scratch/" + assignmentPath;
            String fullCommand = stageCmd
                    + (installHidden.isEmpty() ? "" : " && " + installHidden)
                    + " && cd " + stagedDir
                    + " && " + testCommand;
            String[] command = {"/bin/sh", "-c", fullCommand};

            // Prepare volumes. Read-only mounts prevent the runner from
            // touching the host filesystem.
            Map<String, String> volumes = Map.of(
                    context.workspacePath(), "/workspace:ro",
                    context.fixturesBasePath(), "/fixtures:ro"
            );

            // Prepare environment
            Map<String, String> env = new HashMap<>(Map.of(
                    "ASSIGNMENT_ID", assignmentId,
                    "CC", "gcc",
                    "CXX", "g++"
            ));

            if (project.envVars() != null) {
                env.putAll(project.envVars());
            }

            // Run from /tmp so the sandbox's default working directory
            // never collides with /scratch/<assignment>; the runner
            // command itself cd's into the staged dir.
            String workingDir = "/tmp";

            // Limits - native builds may need more memory/time
            SandboxLimits limits = SandboxLimits.from(context.limits());

            SandboxRequest request = new SandboxRequest(
                    project.runtimeImage() != null ? project.runtimeImage() : defaultImage,
                    command,
                    workingDir,
                    env,
                    volumes,
                    limits,
                    null
            );

            SandboxResult result = sandboxExecutor.execute(request);

            long durationMs = System.currentTimeMillis() - start;

            List<TestResult> testResults = parseTestOutput(result.stdout(), result.stderr(), result.exitCode());

            return new RunnerResult(
                    result.exitCode() == 0,
                    testResults,
                    result.stdout(),
                    result.stderr(),
                    durationMs,
                    Map.of("runner", "native-runner", "image", project.runtimeImage())
            );

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
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

    private List<TestResult> parseTestOutput(String stdout, String stderr, int exitCode) {
        // The C hidden test driver prints structured lines:
        //   TEST: <name> PASS
        //   TEST: <name> FAIL: <message>
        //   SUMMARY: <n> failure(s)
        // We also keep a synthetic "build" result so a compile failure
        // surfaces in the response rather than appearing as zero tests.
        List<TestResult> results = new ArrayList<>();
        Pattern testPattern = Pattern.compile("^TEST:\\s+(\\S+)\\s+(PASS|FAIL)(?:\\s*:\\s*(.*))?\\s*$");
        Pattern summaryPattern = Pattern.compile("^SUMMARY:\\s+(\\d+)\\s+failure", Pattern.MULTILINE);

        boolean anyTestLine = false;
        for (String line : stdout.split("\\R")) {
            Matcher m = testPattern.matcher(line.trim());
            if (m.find()) {
                anyTestLine = true;
                String name = m.group(1);
                String status = m.group(2);
                String msg = m.group(3);
                boolean passed = "PASS".equals(status);
                results.add(new TestResult(name, passed, passed ? null : msg));
            }
        }

        if (!anyTestLine) {
            // No structured output. The build probably failed or the
            // test binary didn't run. Surface the most informative bit
            // of stderr as a synthetic failing test so the response
            // actually shows something.
            String message = !stderr.isBlank() ? stderr.strip() : stdout.strip();
            if (message.isEmpty()) {
                message = "Test driver produced no TEST: lines (exit code " + exitCode + ")";
            }
            if (message.length() > 500) {
                message = message.substring(0, 500) + "...[truncated]";
            }
            results.add(new TestResult("build", false, message));
        }

        return results;
    }

    public ProjectDescriptor buildProjectDescriptor(
            String assignmentId,
            Technology technology,
            String runtimeImage,
            String buildCommand,
            String testCommand
    ) {
        return new ProjectDescriptor(
                assignmentId,
                technology,
                Framework.NONE,
                EvaluationMode.CLI,
                runtimeImage != null ? runtimeImage : defaultImage,
                buildCommand != null ? buildCommand : "make",
                testCommand != null ? testCommand : "make test",
                Map.of()
        );
    }
}