package com.apexeval.backend.execution;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class ExecuteResponse {

    private List<TestResult> results;
    private long executionTimeMs;

    public ExecuteResponse() {
    }

    public ExecuteResponse(List<TestResult> results, long executionTimeMs) {
        this.results = results;
        this.executionTimeMs = executionTimeMs;
    }
}
