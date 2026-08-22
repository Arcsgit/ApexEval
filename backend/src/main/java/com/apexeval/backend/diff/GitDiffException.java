package com.apexeval.backend.diff;

/**
 * Thrown when the diff engine cannot open the workspace repo,
 * resolve a commit, or compute a diff.
 */
public class GitDiffException extends RuntimeException {

    public GitDiffException(String message) {
        super(message);
    }

    public GitDiffException(String message, Throwable cause) {
        super(message, cause);
    }
}
