package com.apexeval.backend.runner;

import com.apexeval.backend.execution.TestResult;

import java.util.List;
import java.util.Map;

public record RunnerResult(
        boolean success,
        List<TestResult> testResults,
        String stdout,
        String stderr,
        long durationMs,
        Map<String, Object> metadata
) {
}