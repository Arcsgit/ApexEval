package com.apexeval.backend.runner;

/**
 * Builds shell prefixes for sandboxed test execution.
 *
 * The student workspace is mounted read-only at /workspace inside the
 * sandbox. Anything the runner needs to write (copied hidden tests,
 * pip/npm caches, build artifacts) must go under /scratch, a tmpfs
 * that is torn down with the container. The stage() helper copies the
 * assignment directory from the read-only mount to a writable scratch
 * location, and build() drops the hidden test next to that staged copy.
 */
public final class HiddenTestInstaller {

    private HiddenTestInstaller() {
    }

    /**
     * Stage the assignment directory from the read-only /workspace mount
     * to a writable /scratch location. Returns the staged path so the
     * caller can chdir there for the actual test command.
     *
     * <p>The destination directory is removed first so a re-run on a
     * fresh container cannot end up with a double-nested
     * {@code /scratch/<assignment>/<assignment>/...} layout (which
     * would make the project's Makefile/package.json invisible to
     * its build commands).</p>
     *
     * <p>The shell uses {@code cd /tmp} before removing the destination
     * because the sandbox's working directory is
     * {@code /scratch/<assignment>} - removing it under the runner's
     * feet would leave subsequent commands unable to resolve the
     * working directory.</p>
     *
     * <p>Example output:
     * {@code cd /tmp && rm -rf /scratch/c-assignment && cp -r /workspace/c-assignment /scratch/c-assignment}</p>
     */
    public static String stage(String assignmentPath) {
        if (assignmentPath == null || assignmentPath.isEmpty()) {
            assignmentPath = "assignment";
        }
        return "cd /tmp && rm -rf /scratch/" + assignmentPath
                + " && cp -r /workspace/" + assignmentPath + " /scratch/" + assignmentPath;
    }

    /**
     * Build a shell snippet that copies a hidden test from /fixtures
     * into the staged scratch directory. Returns "" when no hidden test
     * path is configured.
     *
     * @param hiddenTestPath manifest-declared path relative to fixtures root
     * @param stagedBase     absolute directory the test should land in
     *                       (e.g. /scratch/c-assignment/src)
     */
    public static String build(String hiddenTestPath, String stagedBase) {
        if (hiddenTestPath == null || hiddenTestPath.isBlank()) {
            return "";
        }
        if (stagedBase == null || stagedBase.isBlank()) {
            stagedBase = "/scratch";
        }

        String normalized = hiddenTestPath.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        String fileName = (slash >= 0) ? normalized.substring(slash + 1) : normalized;
        // Preserve subdirectories inside hiddenTests/ (e.g. for
        // multi-file test fixtures). The "hidden-tests" prefix itself
        // is dropped because the staged directory mirrors the
        // assignment layout, not the fixtures root.
        String subDir = "";
        if (slash > 0) {
            String dirPart = normalized.substring(0, slash);
            int hiddenIdx = dirPart.lastIndexOf("hidden-tests");
            if (hiddenIdx >= 0) {
                subDir = dirPart.substring(hiddenIdx + "hidden-tests".length());
                if (subDir.startsWith("/")) {
                    subDir = subDir.substring(1);
                }
            }
        }
        String destDir = stagedBase + (subDir.isEmpty() ? "" : "/" + subDir);
        String destPath = destDir + "/" + fileName;

        return "mkdir -p " + destDir + " && cp /fixtures/" + normalized + " " + destPath;
    }
}