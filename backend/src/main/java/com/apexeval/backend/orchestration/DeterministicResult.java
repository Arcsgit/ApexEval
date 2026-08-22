package com.apexeval.backend.orchestration;

import com.apexeval.backend.dbverify.DbVerificationResult;
import com.apexeval.backend.execution.ExecuteResponse;

/**
 * Only the parts of a grading result that are (a) expensive to produce
 * (Docker sandbox execution) and (b) purely a function of source content -
 * no file/line/column data, so safe to share across students with
 * byte-identical source for the same assignment.
 */
public record DeterministicResult(
        ExecuteResponse executionResults,
        DbVerificationResult dbVerification
) {
}
