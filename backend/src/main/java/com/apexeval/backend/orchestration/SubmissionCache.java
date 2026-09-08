package com.apexeval.backend.orchestration;

import java.util.Optional;

/**
 * Shared cache for deterministic grading results.
 *
 * <p>The cache key is {@code assignmentId + SHA-256(source content)}, not
 * {@code workspacePath} or commit SHA. Therefore identical submissions
 * from different students can reuse the same sandbox/static-check
 * result.
 *
 * <p>Implementations are selected at startup based on
 * {@code apexeval.cache.backend}: {@code in-memory} (default; dev only),
 * {@code redis} (production hot path), or {@code jdbc} (Postgres-backed,
 * durable across Redis outages). The selection is made by
 * {@link SubmissionCacheFactory}.
 */
public interface SubmissionCache {

    Optional<DeterministicResult> get(CacheKey key);

    void put(CacheKey key, DeterministicResult result);

    /**
     * Invalidate every cache entry for one assignment. Called when an
     * admin re-grades or when a runner image changes (which would
     * change the deterministic semantics). Idempotent.
     */
    long invalidateForAssignment(String assignmentId);

    /**
     * Diagnostic. Returns the number of entries currently in the
     * cache. Used by the superadmin /api/health endpoint.
     */
    long size();
}
