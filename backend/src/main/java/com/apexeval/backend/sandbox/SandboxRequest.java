package com.apexeval.backend.sandbox;

import java.util.Map;

public record SandboxRequest(
        String image,
        String[] command,
        String workingDirectory,
        Map<String, String> environment,
        Map<String, String> volumes,
        SandboxLimits limits,
        String stdin
) {
}