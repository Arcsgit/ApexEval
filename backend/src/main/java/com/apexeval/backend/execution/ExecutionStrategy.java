package com.apexeval.backend.execution;

public interface ExecutionStrategy {

    ExecuteResponse execute(
            String workspacePath,
            String assignmentPath,
            String assignmentId
    );

    String getAssignmentType();
}
