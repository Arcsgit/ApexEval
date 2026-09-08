package com.apexeval.backend.sandbox;

public record SandboxResult(
        int exitCode,
        String stdout,
        String stderr,
        long durationMs,
        boolean timedOut,
        boolean oomKilled
) {
}