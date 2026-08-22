package com.apexeval.backend.dbverify;

import org.springframework.stereotype.Component;

@Component
public class NoOpDbVerification implements DbVerificationStrategy {

    @Override
    public DbVerificationResult verify(
            String workspacePath,
            String assignmentId
    ) {
        return new DbVerificationResult(false, null, null);
    }

    @Override
    public String getAssignmentType() {
        return "PLAIN_JAVA";
    }
}