package com.apexeval.backend.orchestration.cache;

import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.dbverify.DbVerificationResult;
import com.apexeval.backend.orchestration.CacheKey;
import com.apexeval.backend.orchestration.DeterministicResult;
import com.apexeval.backend.orchestration.SubmissionCache;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Redis-backed {@link SubmissionCache}.
 *
 * <p>Keys are namespaced under {@code apx:cache:&lt;aid&gt;:&lt;hash&gt;} and
 * values are JSON-serialised {@link DeterministicResult}. A configurable
 * TTL (default 1 hour) keeps Redis from filling up; superseded
 * results expire automatically.
 *
 * <p>This bean is only constructed when the Redis auto-config fires,
 * which happens in the {@code db} profile. In the default profile
 * {@link SubmissionCacheFactory} selects
 * {@link InMemorySubmissionCache} instead.
 */
@Component
public class RedisSubmissionCache implements SubmissionCache {

    private static final Logger log = LoggerFactory.getLogger(RedisSubmissionCache.class);
    private static final String KEY_PREFIX = "apx:cache:";
    // LRU-friendly: SET ... EX 3600 caps memory growth while keeping
    // hot results hot. A more sophisticated policy (LFU or adaptive TTL)
    // can be added later without changing this class.
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final Duration ttl;

    public RedisSubmissionCache(
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            @Value("${apexeval.cache.ttl-seconds:3600}") long ttlSeconds) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.ttl = Duration.ofSeconds(ttlSeconds);
    }

    private static String redisKey(CacheKey key) {
        return KEY_PREFIX + key.assignmentId() + ":" + key.sourceHash();
    }

    @Override
    public Optional<DeterministicResult> get(CacheKey key) {
        String raw = redis.opsForValue().get(redisKey(key));
        if (raw == null) return Optional.empty();
        try {
            StoredValue v = objectMapper.readValue(raw, StoredValue.class);
            return Optional.of(new DeterministicResult(v.execution, v.dbVerification));
        } catch (JsonProcessingException e) {
            // A malformed cache entry is treated as a miss. We log and
            // delete the entry so the next put() overwrites cleanly.
            log.warn("Discarding malformed cache entry for {}: {}", key, e.getMessage());
            try { redis.delete(redisKey(key)); } catch (Exception ignore) { }
            return Optional.empty();
        }
    }

    @Override
    public void put(CacheKey key, DeterministicResult result) {
        try {
            StoredValue v = new StoredValue(result.executionResults(), result.dbVerification());
            String json = objectMapper.writeValueAsString(v);
            redis.opsForValue().set(redisKey(key), json, ttl);
        } catch (JsonProcessingException e) {
            // If we can't serialise the result, we just don't cache it.
            // A subsequent identical request will recompute. This is
            // safer than throwing - the user's submission should still
            // succeed.
            log.warn("Failed to serialise cache entry for {}: {}", key, e.getMessage());
        }
    }

    @Override
    public long invalidateForAssignment(String assignmentId) {
        // SCAN-based delete. KEYS is O(N) and blocks Redis; SCAN is
        // iterative. For typical assignment sizes (<10k entries) this
        // returns in a few hundred ms. We accumulate up to 500 keys
        // per batch and DEL them together to minimise round-trips.
        String pattern = KEY_PREFIX + assignmentId + ":*";
        long removed = 0;
        java.util.ArrayList<String> batch = new java.util.ArrayList<>(500);
        try (var cursor = redis.scan(
                org.springframework.data.redis.core.ScanOptions.scanOptions().match(pattern).count(500).build())) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                if (key == null) continue;
                batch.add(key);
                if (batch.size() >= 500) {
                    Long deleted = redis.delete(batch);
                    if (deleted != null) removed += deleted;
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                Long deleted = redis.delete(batch);
                if (deleted != null) removed += deleted;
            }
        }
        log.info("Invalidated {} cache entries for assignmentId={}", removed, assignmentId);
        return removed;
    }

    @Override
    public long size() {
        // Approximate: SCAN over the entire prefix. Don't run this on
        // the hot path. Used by /api/health at most every 5 s.
        long count = 0;
        try (var cursor = redis.scan(
                org.springframework.data.redis.core.ScanOptions.scanOptions().match(KEY_PREFIX + "*").count(1000).build())) {
            while (cursor.hasNext()) {
                if (cursor.next() != null) count++;
            }
        }
        return count;
    }

    /**
     * StoredValue is a hand-rolled DTO rather than relying on
     * Jackson's record support, so we don't need to add the
     * jackson-modules-parameter-names dependency.
     */
    public static class StoredValue {
        public ExecuteResponse execution;
        public DbVerificationResult dbVerification;
        public StoredValue() { }
        public StoredValue(ExecuteResponse execution, DbVerificationResult dbVerification) {
            this.execution = execution;
            this.dbVerification = dbVerification;
        }
    }
}
