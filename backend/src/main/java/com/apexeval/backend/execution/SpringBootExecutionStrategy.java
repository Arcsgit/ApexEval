package com.apexeval.backend.execution;

import org.springframework.stereotype.Component;

/**
 * STUB - not implemented in this phase.
 *
 * Future implementation: Maven + Testcontainers with an ephemeral
 * Postgres/Mongo container, running `mvn test` against the student's
 * Spring Boot project, then parsing surefire XML reports the same way
 * PlainJavaExecutionStrategy parses JUnit console-launcher XML reports.
 *
 * Wired into the strategy registry now so the orchestrator (Step 8+)
 * can route by assignmentType without changes once this is implemented.
 */
@Component
public class SpringBootExecutionStrategy implements ExecutionStrategy {

    @Override
    public String getAssignmentType() {
        return "SPRING_BOOT";
    }

    @Override
    public ExecuteResponse execute(
            String workspacePath,
            String assignmentPath,
            String assignmentId
    ) {
        throw new UnsupportedOperationException(
                "SpringBootExecutionStrategy is not implemented yet. "
                        + "The current phase supports PLAIN_JAVA assignments only."
        );
    }
}
