package com.apexeval.backend.orchestration;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Development implementation. One map is shared by all requests handled by
 * this backend process, including requests from different students.
 */
@Component
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
}
