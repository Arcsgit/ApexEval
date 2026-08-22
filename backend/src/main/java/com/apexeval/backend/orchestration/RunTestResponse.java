package com.apexeval.backend.orchestration;

import com.apexeval.backend.dbverify.DbVerificationResult;
import com.apexeval.backend.diff.DiffResponse;
import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.staticcheck.StaticCheckResponse;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class RunTestResponse {

    private DiffResponse diff;
    private ExecuteResponse executionResults;
    private DbVerificationResult dbVerification;
    private StaticCheckResponse staticCheck;
    private String overallStatus;

    public RunTestResponse() {
    }

    public RunTestResponse(
            DiffResponse diff,
            ExecuteResponse executionResults,
            DbVerificationResult dbVerification,
            StaticCheckResponse staticCheck,
            String overallStatus
    ) {
        this.diff = diff;
        this.executionResults = executionResults;
        this.dbVerification = dbVerification;
        this.staticCheck = staticCheck;
        this.overallStatus = overallStatus;
    }
}
