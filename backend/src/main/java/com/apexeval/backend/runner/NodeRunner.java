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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NodeRunner implements EvaluationRunner {

    private final SandboxExecutor sandboxExecutor;
    private final String defaultImage;

    public NodeRunner(
            DockerSandboxExecutor sandboxExecutor,
            @Value("${apexeval.runner.node.image:node:20-slim}") String defaultImage
    ) {
        this.sandboxExecutor = sandboxExecutor;
        this.defaultImage = defaultImage;
    }

    @Override
    public String id() {
        return "node-runner";
    }

    @Override
    public boolean supports(ProjectDescriptor project) {
        return project.technology() == Technology.JAVASCRIPT
                || project.technology() == Technology.TYPESCRIPT;
    }

    @Override
    public RunnerResult evaluate(ProjectDescriptor project, RunnerContext context) {
        long start = System.currentTimeMillis();
        String assignmentId = project.assignmentId();

        try {
            // Build the test command
            String testCommand = project.testCommand() != null ? project.testCommand() : "npm test";
            String hiddenTestPath = project.envVars() != null
                    ? project.envVars().getOrDefault("hiddenTestPath", "")
                    : "";
            String hiddenTestBase = project.envVars() != null
                    ? project.envVars().getOrDefault("hiddenTestBase", "src")
                    : "src";
            String assignmentPath = context.assignmentPath();

            // Stage the assignment to /scratch and drop the hidden test
            // alongside the staged source so the project's own npm test
            // picks it up. HiddenTestInstaller.stage() copies the read-only
            // assignment to a writable scratch dir; nothing is written
            // back to the host workspace.
            String stageBase = "/scratch/" + assignmentPath + "/" + hiddenTestBase;
            String stageCmd = HiddenTestInstaller.stage(assignmentPath);
            String installHidden = HiddenTestInstaller.build(hiddenTestPath, stageBase);
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
                    "NODE_ENV", "test",
                    "ASSIGNMENT_ID", assignmentId,
                    "CI", "true"
            ));

            if (project.envVars() != null) {
                env.putAll(project.envVars());
            }

            // Run from /tmp so the sandbox's default working directory
            // never collides with /scratch/<assignment>; the runner
            // command itself cd's into the staged dir.
            String workingDir = "/tmp";

            // Limits
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
                    Map.of("runner", "node-runner", "image", project.runtimeImage())
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
        // Simplified - in production would parse Jest/Vitest/Mocha JSON/JUnit output
        return List.of();
    }

    public ProjectDescriptor buildProjectDescriptor(String assignmentId, String runtimeImage, String testCommand, Framework framework) {
        return new ProjectDescriptor(
                assignmentId,
                Technology.JAVASCRIPT,
                framework != null ? framework : Framework.NONE,
                EvaluationMode.CLI,
                runtimeImage != null ? runtimeImage : defaultImage,
                "npm ci",
                testCommand != null ? testCommand : "npm test",
                Map.of()
        );
    }
}