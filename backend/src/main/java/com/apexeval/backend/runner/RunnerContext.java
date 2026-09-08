package com.apexeval.backend.runner;

import java.util.Map;

public record RunnerContext(
        String workspacePath,
        String assignmentPath,
        String fixturesBasePath,
        Map<String, Object> limits
) {
}