package com.apexeval.backend.runner;

import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.execution.ExecutionStrategyResolver;
import com.apexeval.backend.execution.AssignmentConfig;
import com.apexeval.backend.execution.AssignmentRegistry;
import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.EvaluationMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.List;
import java.util.Optional;

@Component
public class JavaRunner implements EvaluationRunner {

    private final ExecutionStrategyResolver strategyResolver;
    private final AssignmentRegistry assignmentRegistry;
    private final String fixturesBasePath;
    private final String dockerImage;
    private final String junitJar;

    public JavaRunner(
            ExecutionStrategyResolver strategyResolver,
            AssignmentRegistry assignmentRegistry,
            @Value("${apexeval.fixtures.base-path}") String fixturesBasePath,
            @Value("${apexeval.execution.docker-image}") String dockerImage,
            @Value("${apexeval.execution.junit-console-jar}") String junitJar
    ) {
        this.strategyResolver = strategyResolver;
        this.assignmentRegistry = assignmentRegistry;
        this.fixturesBasePath = fixturesBasePath;
        this.dockerImage = dockerImage;
        this.junitJar = junitJar;
    }

    @Override
    public String id() {
        return "java-runner";
    }

    @Override
    public boolean supports(ProjectDescriptor project) {
        return project.technology() == Technology.JAVA;
    }

    @Override
    public RunnerResult evaluate(ProjectDescriptor project, RunnerContext context) {
        long start = System.currentTimeMillis();
        String assignmentId = project.assignmentId();

        try {
            AssignmentConfig config = assignmentRegistry.get(assignmentId);
            ExecuteResponse response = strategyResolver.executeFor(
                    context.workspacePath(),
                    context.assignmentPath(),
                    assignmentId
            );

            long durationMs = System.currentTimeMillis() - start;
            return new RunnerResult(
                    true,
                    response.getResults(),
                    "",
                    "",
                    durationMs,
                    Map.of("assignmentType", config.getAssignmentType())
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

    public ProjectDescriptor buildProjectDescriptor(String assignmentId) {
        AssignmentConfig config = assignmentRegistry.get(assignmentId);
        return new ProjectDescriptor(
                assignmentId,
                Technology.JAVA,
                Framework.NONE,
                EvaluationMode.CLI,
                dockerImage,
                "javac",
                "junit-console",
                Map.of(
                        "junitJar", junitJar,
                        "fixturesBasePath", fixturesBasePath,
                        "assignmentType", config.getAssignmentType()
                )
        );
    }

    public String getFixturesBasePath() {
        return fixturesBasePath;
    }
}