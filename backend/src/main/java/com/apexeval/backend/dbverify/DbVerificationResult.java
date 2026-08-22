package com.apexeval.backend.dbverify;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class DbVerificationResult {

    private boolean applicable;
    private Boolean passed;
    private String details;

    public DbVerificationResult() {
    }

    public DbVerificationResult(
            boolean applicable,
            Boolean passed,
            String details
    ) {
        this.applicable = applicable;
        this.passed = passed;
        this.details = details;
    }
}
