package com.apexeval.backend.orchestration;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Development implementation. One map is shared by all requests handled by
 * this backend process, including requests from different students.
 *
 * <p>Not annotated with {@code @Component} on purpose: the choice
 * between this and a Redis-backed cache is made at startup by
 * {@link com.apexeval.backend.orchestration.cache.SubmissionCacheFactory}
 * based on the {@code apexeval.cache.backend} property.</p>
 */
public class InMemorySubmissionCache implements SubmissionCache {

    private final Map<CacheKey, DeterministicResult> cache =
            new ConcurrentHashMap<>();

    @Override
    public Optional<DeterministicResult> get(CacheKey key) {
        return Optional.ofNullable(cache.get(key));
    }

    @Override
    public void put(CacheKey key, DeterministicResult result) {
        cache.putIfAbsent(key, result);
    }

    @Override
    public long invalidateForAssignment(String assignmentId) {
        long[] removed = {0};
        cache.entrySet().removeIf(e -> {
            if (e.getKey().assignmentId().equals(assignmentId)) {
                removed[0]++;
                return true;
            }
            return false;
        });
        return removed[0];
    }

    @Override
    public long size() {
        return cache.size();
    }
}
