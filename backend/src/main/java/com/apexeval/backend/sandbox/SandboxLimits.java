package com.apexeval.backend.sandbox;

import java.util.Map;

public record SandboxLimits(
        long timeoutSeconds,
        long memoryMb,
        double cpuCores,
        long maxOutputBytes,
        int maxProcesses,
        boolean networkEnabled,
        boolean privileged
) {

    public static SandboxLimits defaults() {
        return new SandboxLimits(
                30,     // timeoutSeconds
                1024,   // memoryMb
                1.0,    // cpuCores
                1_000_000, // maxOutputBytes
                100,    // maxProcesses
                false,  // networkEnabled
                false   // privileged
        );
    }

    public static SandboxLimits from(Map<String, Object> limits) {
        if (limits == null || limits.isEmpty()) {
            return defaults();
        }
        return new SandboxLimits(
                ((Number) limits.getOrDefault("timeoutSeconds", 30)).longValue(),
                ((Number) limits.getOrDefault("memoryMb", 1024)).longValue(),
                ((Number) limits.getOrDefault("cpuCores", 1.0)).doubleValue(),
                ((Number) limits.getOrDefault("maxOutputBytes", 1_000_000)).longValue(),
                ((Number) limits.getOrDefault("maxProcesses", 100)).intValue(),
                (Boolean) limits.getOrDefault("networkEnabled", false),
                (Boolean) limits.getOrDefault("privileged", false)
        );
    }
}