package com.apexeval.backend.dbverify;

public interface DbVerificationStrategy {

    DbVerificationResult verify(
            String workspacePath,
            String assignmentId
    );

    String getAssignmentType();
}