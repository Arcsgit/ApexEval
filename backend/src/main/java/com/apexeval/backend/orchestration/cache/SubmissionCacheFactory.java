package com.apexeval.backend.orchestration.cache;

import com.apexeval.backend.orchestration.InMemorySubmissionCache;
import com.apexeval.backend.orchestration.SubmissionCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Selects which {@link SubmissionCache} implementation to expose as the
 * primary bean. Read at startup from {@code apexeval.cache.backend}:
 *
 * <ul>
 *   <li>{@code in-memory} (default) - always available, dev only.
 *       The single-process cache dies on restart. Suitable for unit
 *       tests, classroom demos, and the no-Postgres dev path.</li>
 *   <li>{@code redis} - the production hot path. Requires the {@code db}
 *       profile to be active (so Spring Boot's Redis auto-config has
 *       wired up a {@code StringRedisTemplate}). See
 *       {@link RedisSubmissionCache}. Sub-millisecond reads across all
 *       backend replicas sharing the same Redis cluster.</li>
 *   <li>{@code jdbc} - Postgres-backed via {@code cache_entries} table.
 *       Slower than Redis (~5-20 ms) but durable across Redis
 *       outages. Used as a fallback when Redis is unavailable.
 *       (Implementation in a follow-up; the slot is reserved.)</li>
 * </ul>
 *
 * The factory pattern (rather than three separate {@code @Component}
 * classes) means the in-memory implementation is never accidentally
 * loaded alongside Redis in the same context. If we used
 * {@code @ConditionalOnProperty} on each, both would be created in a
 * dev setup where the property is unset, leading to two beans of the
 * same type.
 */
@Configuration
public class SubmissionCacheFactory {

    private static final Logger log = LoggerFactory.getLogger(SubmissionCacheFactory.class);

    private final ObjectProvider<RedisSubmissionCache> redisProvider;

    public SubmissionCacheFactory(ObjectProvider<RedisSubmissionCache> redisProvider) {
        this.redisProvider = redisProvider;
    }

    @Bean
    @Primary
    public SubmissionCache submissionCache(
            @Value("${apexeval.cache.backend:in-memory}") String backend) {
        return switch (backend.toLowerCase()) {
            case "redis" -> {
                RedisSubmissionCache r = redisProvider.getIfAvailable();
                if (r == null) {
                    log.warn("apexeval.cache.backend=redis but no RedisSubmissionCache bean is " +
                            "available (db profile not active?). Falling back to in-memory.");
                    yield new InMemorySubmissionCache();
                }
                log.info("Using RedisSubmissionCache for the submission cache");
                yield r;
            }
            case "jdbc" -> {
                // Reserved for a follow-up. Today, fall through to
                // in-memory and log a warning. When the JDBC cache
                // lands, this branch swaps in JdbcSubmissionCache.
                log.warn("apexeval.cache.backend=jdbc is not yet implemented; " +
                        "using in-memory. (The cache_entries table exists; only the read/write path is missing.)");
                yield new InMemorySubmissionCache();
            }
            case "in-memory" -> {
                log.info("Using InMemorySubmissionCache for the submission cache (dev only)");
                yield new InMemorySubmissionCache();
            }
            default -> {
                log.warn("Unknown apexeval.cache.backend='{}'; using in-memory. " +
                        "Allowed: in-memory, redis, jdbc.", backend);
                yield new InMemorySubmissionCache();
            }
        };
    }
}
