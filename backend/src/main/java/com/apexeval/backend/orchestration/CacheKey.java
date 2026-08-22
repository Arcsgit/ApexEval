package com.apexeval.backend.orchestration;

/**
 * Identity for the cacheable (execution + DB verification) portion of a
 * grading result. Deliberately excludes workspacePath, student identity,
 * and Git commit SHA - two students with byte-identical source for the
 * same assignment should hit the same cache entry.
 */
public record CacheKey(String assignmentId, String sourceHash) {
}
