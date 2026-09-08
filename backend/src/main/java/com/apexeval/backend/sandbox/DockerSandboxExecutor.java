package com.apexeval.backend.sandbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class DockerSandboxExecutor implements SandboxExecutor {

    private static final Logger log = LoggerFactory.getLogger(DockerSandboxExecutor.class);

    private final boolean enabled;
    private final String dockerHost;

    public DockerSandboxExecutor(
            @Value("${apexeval.sandbox.docker.enabled:true}") boolean enabled,
            @Value("${apexeval.sandbox.docker.host:unix:///var/run/docker.sock}") String dockerHost
    ) {
        this.enabled = enabled;
        this.dockerHost = dockerHost;
        if (!enabled) {
            log.warn("DockerSandboxExecutor is DISABLED - set apexeval.sandbox.docker.enabled=true to enable");
        }
    }

    @Override
    public SandboxResult execute(SandboxRequest request) {
        if (!enabled) {
            return new SandboxResult(
                    -1,
                    "",
                    "Docker sandbox is disabled",
                    0,
                    false,
                    false
            );
        }

        long start = System.currentTimeMillis();
        String[] dockerCmd = buildDockerCommand(request);
        log.info("Executing Docker command: {}", String.join(" ", dockerCmd));

        try {
            // Build docker run command
            ProcessBuilder builder = new ProcessBuilder(dockerCmd);
            builder.directory(Path.of(".").toFile());
            builder.redirectErrorStream(false);

            Process process = builder.start();

            // Handle stdin
            if (request.stdin() != null && !request.stdin().isEmpty()) {
                try (OutputStream stdin = process.getOutputStream()) {
                    stdin.write(request.stdin().getBytes(StandardCharsets.UTF_8));
                }
            }

            // Read stdout/stderr with size limits
            ByteArrayOutputStream stdout = new ByteArrayOutputStream();
            ByteArrayOutputStream stderr = new ByteArrayOutputStream();
            long maxOutput = request.limits().maxOutputBytes();

            Thread stdoutThread = readStream(process.getInputStream(), stdout, maxOutput);
            Thread stderrThread = readStream(process.getErrorStream(), stderr, maxOutput);

            boolean finished = process.waitFor(request.limits().timeoutSeconds(), TimeUnit.SECONDS);

            stdoutThread.join(2000);
            stderrThread.join(2000);

            String stdoutStr = stdout.toString(StandardCharsets.UTF_8);
            String stderrStr = stderr.toString(StandardCharsets.UTF_8);
            
            log.info("Docker process finished: exitCode={}, durationMs={}, stdoutLen={}, stderrLen={}", 
                    process.exitValue(), System.currentTimeMillis() - start, stdoutStr.length(), stderrStr.length());
            if (!stderrStr.isEmpty()) {
                log.warn("Docker stderr: {}", stderrStr);
            }

            long durationMs = System.currentTimeMillis() - start;

            if (!finished) {
                process.destroyForcibly();
                return new SandboxResult(
                        -1,
                        truncate(stdoutStr, maxOutput),
                        truncate(stderrStr, maxOutput),
                        durationMs,
                        true,
                        false
                );
            }

            return new SandboxResult(
                    process.exitValue(),
                    truncate(stdoutStr, maxOutput),
                    truncate(stderrStr, maxOutput),
                    durationMs,
                    false,
                    false
            );

        } catch (IOException | InterruptedException e) {
            long durationMs = System.currentTimeMillis() - start;
            log.error("Docker sandbox execution failed", e);
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

    private String[] buildDockerCommand(SandboxRequest request) {
        StringBuilder cmd = new StringBuilder();
        cmd.append("docker run --rm ");

        // Limits
        cmd.append("--memory=").append(request.limits().memoryMb()).append("m ");
        cmd.append("--cpus=").append(request.limits().cpuCores()).append(" ");
        cmd.append("--pids-limit=").append(request.limits().maxProcesses()).append(" ");
        if (!request.limits().networkEnabled()) {
            cmd.append("--network=none ");
        }
        if (request.limits().privileged()) {
            cmd.append("--privileged ");
        }
        cmd.append("--read-only ");
        // Writable scratch space for the runner to stage hidden tests,
        // pip/npm caches, and pytest/node_modules build artifacts. These
        // are torn down with the container -- the host filesystem is
        // never touched, so a malicious or buggy student submission
        // cannot pollute the workspace.
        cmd.append("--tmpfs=/tmp:rw,noexec,nosuid,size=200m ");
        cmd.append("--tmpfs=/scratch:rw,exec,nosuid,size=300m ");

        // Working directory
        String workDir = request.workingDirectory() != null ? request.workingDirectory() : "/work";
        cmd.append("-w ").append(workDir).append(" ");

        // Environment
        if (request.environment() != null) {
            for (Map.Entry<String, String> env : request.environment().entrySet()) {
                cmd.append("-e ").append(env.getKey()).append("=").append(env.getValue()).append(" ");
            }
        }

        // Volumes (hostPath -> containerPath). The student workspace is
        // mounted read-only at /workspace to prevent the runner (or a
        // malicious payload) from writing hidden test files, caches, or
        // build artifacts back to the host filesystem. Anything the
        // runner needs to write to goes under /scratch.
        if (request.volumes() != null) {
            for (Map.Entry<String, String> vol : request.volumes().entrySet()) {
                String hostPath = vol.getKey();
                String containerPath = vol.getValue();
                String mountSpec = hostPath + ":" + containerPath;
                // If the caller did not already mark the mount read-only,
                // force it to read-only. Hidden tests and fixture data
                // must never be modified by sandbox execution.
                if (!containerPath.contains(":ro") && !containerPath.contains(":rw")) {
                    mountSpec = mountSpec + ":ro";
                }
                cmd.append("-v ").append(mountSpec).append(" ");
            }
        }

        // Image and command
        cmd.append(request.image()).append(" ");
        for (String arg : request.command()) {
            // Quote arguments that contain spaces or special shell characters
            if (arg.contains(" ") || arg.contains("&&") || arg.contains(">") || arg.contains("<") || arg.contains("|") || arg.contains(";")) {
                cmd.append("'").append(arg.replace("'", "'\\''")).append("' ");
            } else {
                cmd.append(arg).append(" ");
            }
        }

        return new String[]{"sh", "-c", cmd.toString().trim()};
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