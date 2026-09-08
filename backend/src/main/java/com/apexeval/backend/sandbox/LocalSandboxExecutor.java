package com.apexeval.backend.sandbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Component
public class LocalSandboxExecutor implements SandboxExecutor {

    private static final Logger log = LoggerFactory.getLogger(LocalSandboxExecutor.class);

    @Override
    public SandboxResult execute(SandboxRequest request) {
        log.warn("LocalSandboxExecutor is for DEVELOPMENT ONLY - not secure for production use");

        long start = System.currentTimeMillis();
        ProcessBuilder builder = new ProcessBuilder(request.command());
        builder.directory(request.workingDirectory() != null
                ? Path.of(request.workingDirectory()).toFile()
                : null);
        builder.environment().putAll(request.environment());

        try {
            Process process = builder.start();

            if (request.stdin() != null && !request.stdin().isEmpty()) {
                try (OutputStream stdin = process.getOutputStream()) {
                    stdin.write(request.stdin().getBytes(StandardCharsets.UTF_8));
                }
            }

            ByteArrayOutputStream stdout = new ByteArrayOutputStream();
            ByteArrayOutputStream stderr = new ByteArrayOutputStream();
            long maxOutput = request.limits().maxOutputBytes();

            Thread stdoutThread = readStream(process.getInputStream(), stdout, maxOutput);
            Thread stderrThread = readStream(process.getErrorStream(), stderr, maxOutput);

            boolean finished = process.waitFor(request.limits().timeoutSeconds(), TimeUnit.SECONDS);

            stdoutThread.join(1000);
            stderrThread.join(1000);

            long durationMs = System.currentTimeMillis() - start;

            if (!finished) {
                process.destroyForcibly();
                return new SandboxResult(
                        -1,
                        truncate(stdout.toString(StandardCharsets.UTF_8), maxOutput),
                        truncate(stderr.toString(StandardCharsets.UTF_8), maxOutput),
                        durationMs,
                        true,
                        false
                );
            }

            return new SandboxResult(
                    process.exitValue(),
                    truncate(stdout.toString(StandardCharsets.UTF_8), maxOutput),
                    truncate(stderr.toString(StandardCharsets.UTF_8), maxOutput),
                    durationMs,
                    false,
                    false
            );

        } catch (IOException | InterruptedException e) {
            long durationMs = System.currentTimeMillis() - start;
            return new SandboxResult(
                    -1,
                    "",
                    e.getMessage(),
                    durationMs,
                    false,
                    false
            );
        }
    }

    private Thread readStream(java.io.InputStream input, OutputStream output, long maxBytes) {
        Thread thread = new Thread(() -> {
            try {
                byte[] buffer = new byte[4096];
                int read;
                long total = 0;
                while ((read = input.read(buffer)) != -1 && total < maxBytes) {
                    int toWrite = Math.min(read, (int) (maxBytes - total));
                    output.write(buffer, 0, toWrite);
                    total += toWrite;
                }
            } catch (IOException ignored) {
            }
        });
        thread.start();
        return thread;
    }

    private String truncate(String s, long maxBytes) {
        byte[] bytes = s.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) {
            return s;
        }
        return new String(bytes, 0, (int) maxBytes, StandardCharsets.UTF_8) + "\n[TRUNCATED]";
    }
}