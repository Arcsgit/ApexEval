package com.apexeval.backend.runner;

import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.EvaluationMode;

import java.util.Map;

public record ProjectDescriptor(
        String assignmentId,
        Technology technology,
        Framework framework,
        EvaluationMode evaluationMode,
        String runtimeImage,
        String buildCommand,
        String testCommand,
        Map<String, String> envVars
) {
}