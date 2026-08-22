package com.apexeval.backend.orchestration;

import java.util.Optional;

/**
 * Shared cache for deterministic grading results.
 *
 * The cache key is assignmentId + SHA-256(source content), not workspacePath
 * or commit SHA. Therefore identical submissions from different students can
 * reuse the same sandbox/static-check result.
 */
public interface SubmissionCache {

    Optional<DeterministicResult> get(CacheKey key);

    void put(CacheKey key, DeterministicResult result);
}
