# ApexEval Scaling Plan — 1000 Concurrent Students

## Current state (the bottleneck)

`/Users/archit/projectS/ApexEval/backend/src/main/java/com/apexeval/backend/orchestration/RunTestService.java:78` and `/Users/archit/projectS/ApexEval/backend/src/main/java/com/apexeval/backend/sandbox/DockerSandboxExecutor.java:128` together make the system **synchronously** call `docker run --rm` on the HTTP request thread. A 1000-student traffic spike with each request running 5–60 s of compile + test + static analysis will:

- Block 1000 Tomcat threads simultaneously. Default `server.tomcat.threads.max=200` → 800 requests get queued, then 30 s of timeout, then 503.
- Spawn 1000 concurrent `docker run` processes on a single Docker host. A typical 8-core 16 GB host tops out at ~50 concurrent containers before CPU/IO contention makes everything slow instead of fast.
- Hold all submission cache state in one JVM's heap (`InMemorySubmissionCache`). Restart the JVM → cache gone, every request cold again.

We need three things to fix this: **a queue**, **a worker pool**, and **a shared cache**.

## Target architecture (5-20 Docker hosts, 1000 concurrent students)

```
                                    ┌────────────────────────────┐
                                    │  PostgreSQL 15               │  users, courses, assignments,
                                    │  (single primary + 2 replicas│  submissions, results, audit,
                                    │  for read scaling)           │  static_findings, metrics
                                    └────────────────────────────┘
                                              ▲
                                              │ writes (rare, transactional)
                                              │
┌────────────────┐  HTTPS   ┌─────────────┴──────────────┐    HTTPS     ┌─────────────────────┐
│  Next.js FE     │◀────────▶│  Backend API (apexeval-api)  │◀────────────▶│  WebSocket / SSE    │
│  (Next 14 SSR)  │         │  Spring Boot 4.1 stateless,   │              │  for live results   │
│  static + RSC   │         │  N=3-5 pods behind a LB,       │              │  (sticky per user)  │
│  1000s of users │         │  no Docker (cache-only path)   │              │                     │
└────────────────┘         └─────────────┬────────────────┘              └─────────────────────┘
                                       │ XADD submission:<aid>:<hash>:<jobId>
                                       ▼
                              ┌────────────────────┐
                              │  Redis 7            │  - Streams (job broker)
                              │  (single, 1-2 nodes │  - pub/sub for WS fan-out
                              │   for HA)           │  - cache (sub-ms reads)
                              └─────────┬──────────┘
                                        │ XREADGROUP consumer group "runners"
                                        ▼
        ┌─────────────────────────────────────────────────────────────┐
        │ Runner Pool — N pods, each on its own Docker host         │
        │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
        │ │runner-1  │ │runner-2  │ │runner-3  │ │ ...      │         │
        │ │jvm       │ │jvm       │ │jvm       │ │          │         │
        │ │docker.sock│ │docker.sock│ │docker.sock│ │          │         │
        │ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
        │      │              │              │                         │
        │      ▼              ▼              ▼                         │
        │ ┌──────────────────────────────────────────────────┐         │
        │ │  Docker Host Pool (3-20 dedicated hosts)         │         │
        │ │  apexeval/runner-host:{1..20}                    │         │
        │ │  runs the actual gcc/javac/python containers      │         │
        │ └──────────────────────────────────────────────────┘         │
        └─────────────────────────────────────────────────────────────┘
```

## Why each layer exists

### Layer 1 — Frontend (Next.js)

Already covered in `FRONTEND_MASTER_PROMPT.md`. Key constraints: bundle size, parallel data fetching, role-based routing. Caching happens at multiple layers (browser HTTP cache, TanStack Query, server-side response cache).

### Layer 2 — API (`apexeval-api`)

Stateless Spring Boot pods behind a load balancer. Their only stateful interactions are:
- Reads from Redis (cache, hot assignment manifest cache) — sub-ms
- Reads from PostgreSQL (cold paths) — ms
- Writes to Redis Stream (enqueue cold runs) — sub-ms
- Writes to PostgreSQL (persistence, audit) — ms
- Connection upgrade to WebSocket (sticky by user id at the LB)

Three things must change here from the current implementation:

1. **`/api/run-test` becomes async-first.** Compute cache key, look up in Redis, return cached if hit. On miss, enqueue a `SubmissionJob` to a Redis Stream and return `202 { jobId, statusUrl }` immediately. The student's frontend subscribes to the WS channel for that `jobId` and gets the result when ready.
   - Backward-compat: keep a `?wait=true` query param for synchronous callers (CI, scripts, classroom demos) that polls the queue internally and blocks. Default cap: 30 s. After 30 s, return 202 + the same payload.
   - File: `RunTestController.java:13` — add a new `submit` method that does the enqueue and returns 202; keep `run` for the synchronous case.
2. **Persist to PostgreSQL.** The current `SubmissionCache` is `ConcurrentHashMap` in JVM. Replace with `RedisSubmissionCache` (write-through, TTL 1 h by default, configurable per assignment). Add a `SubmissionRecord` JPA entity that stores every `jobId` → request → result tuple so we have history, audit, analytics. File: replace `InMemorySubmissionCache.java:14` with `RedisSubmissionCache.java` (interface unchanged) and add `SubmissionRecordRepository.java`.
3. **Auth + RBAC.** Spring Security with JWT (issuer = NextAuth.js on the FE). Roles: `SUPERADMIN`, `ADMIN`, `STUDENT`. Per-student `workspacePath` claim in the JWT. Every tRPC/REST call enforces that `workspacePath` in the request matches the JWT. File: new `security/` package; update `RunTestController` to extract `userId` and `workspacePath` from the principal.

### Layer 3 — Broker (Redis 7)

Two roles for Redis:
- **Job broker** — Redis Streams. `submission-jobs` stream, consumer group `runners`. Each runner `XREADGROUP`s up to 16 messages at a time, ACKs after the result is persisted and the cache is updated. Failed jobs go to a `submission-jobs-dlq` stream with a poison-pill marker. Use `XAUTOCLAIM` to recover abandoned jobs from dead runners.
- **Cache** — plain `SET submission:<aid>:<hash> <json> EX 3600`. Sub-ms reads. Write-through from the API on result persistence. Cluster mode: hash-slot the keys across 3 masters; no replication of hot keys (cache loss is acceptable).
- **WebSocket fan-out** — Redis Pub/Sub channels `user:<userId>:results` and `job:<jobId>:status`. Runner publishes when a job completes; the API's WS gateway subscribes and forwards to the right client. (Alternative: a dedicated broker like NATS for higher throughput, but Pub/Sub is fine up to ~10k subscribers per channel — way more than we need.)

### Layer 4 — Runner pool

Each runner is a separate Spring Boot jar (or a stripped-down main class) that:
1. Subscribes to the `submission-jobs` stream consumer group.
2. For each job: stages the workspace, runs static analysis, runs the Docker container, parses the test output, writes the result to Redis cache + PostgreSQL.
3. Publishes a `job:<jobId>:status` event for the API to fan out.
4. ACKs the stream message.

Runners should be **sized for Docker host capacity, not request count**. Rule of thumb: 1 runner per Docker host, with `runner.parallelism = floor(host.cpu_cores * 0.7)`. A 16-core host → 11 concurrent jobs. For 1000 students in a 10-minute window = 100 students/minute = ~1.7/s. With average 30 s per job, we need ~50 concurrent slots → 5-7 Docker hosts → 5-7 runner pods.

Runners need to be **stateless and crash-safe**. The Redis Stream + consumer group model gives us this: a runner that crashes mid-job has its `XREADGROUP` messages automatically reclaimed by `XAUTOCLAIM` after a visibility timeout (default 5 min — should be > the worst-case job duration).

**Static analysis runs in the runner, not the API.** This is a load-shedding win: the API stays fast (just cache + enqueue), and the runner is allowed to spend 1-2 s on JavaParser / pycparser. Already correct in current code; just make sure the runner shares the same `SourceContentHasher` and `StaticCheckService` as the API so cache keys match.

**Docker is per-runner, not shared.** The runner process has `/var/run/docker.sock` mounted (or a remote Docker API endpoint). Each runner talks to its local Docker host. When you add a host, you add a runner. When a host dies, its runner restarts and the Stream consumer group rebalances.

### Layer 5 — Docker host pool

3-20 dedicated hosts (or k8s nodes with Docker). Each runs:
- 1 runner pod
- 50-200 short-lived `apexeval/runner-host:N` containers (`gcc:13`, `python:3.12-slim`, `node:20-slim`, `apexeval/student-workspace:latest`, `apexeval/python-runner:latest`, etc.) — one per concurrent job.
- Per-container resource limits via Docker: `--memory=`, `--cpus=`, `--pids-limit=`. These are already in `DockerSandboxExecutor.java:128-148`.
- A `--read-only` rootfs with `--tmpfs=/scratch:rw,exec` for the writable surface. Already correct.

Container images should be **pre-pulled on every host** so the first job on a new host doesn't pay a 500 MB image pull cost. Use a registry mirror (Harbor, ECR, or the docker `--registry-mirror` daemon option).

**Spot-instance / preemptible VM support.** The runner pool should tolerate a host disappearing. The consumer-group rebalance + idempotent result processing (cache key dedupes) make this safe. The only thing you lose is a few in-flight jobs, which the system re-enqueues automatically.

## Database (PostgreSQL 15)

Schema sketch (idempotent migration, Flyway):

```sql
-- Users & roles
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('SUPERADMIN','ADMIN','STUDENT')),
  workspace_path TEXT,             -- for STUDENT: the runner resolves this
  is_disabled   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  starts_on   DATE NOT NULL,
  ends_on     DATE NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Day-wise schedule
CREATE TABLE course_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_index     INT NOT NULL,           -- 0-based within course
  scheduled_for DATE NOT NULL,
  UNIQUE (course_id, day_index),
  UNIQUE (course_id, scheduled_for)
);

CREATE TABLE course_enrollments (
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

-- Assignments
CREATE TABLE assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  language        TEXT NOT NULL,
  manifest        JSONB NOT NULL,         -- mirrors AssignmentManifest.java
  hidden_tests_url TEXT,                 -- S3/path/whatever
  published_at    TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submissions
CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_hash       TEXT NOT NULL,        -- matches Redis cache key
  status            TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','PASS','FAIL','FLAGGED','OVERRIDDEN_PASS','OVERRIDDEN_FAIL','ERROR')),
  queued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ,
  duration_ms       INT,
  payload           JSONB,                 -- RunTestResponse
  override_reason   TEXT,
  overridden_by     UUID REFERENCES users(id),
  overridden_at     TIMESTAMPTZ
);
CREATE INDEX idx_submissions_user_assignment ON submissions(user_id, assignment_id, queued_at DESC);
CREATE INDEX idx_submissions_assignment_status ON submissions(assignment_id, status);
CREATE INDEX idx_submissions_source_hash ON submissions(assignment_id, source_hash);

-- Static findings (denormalized for query speed)
CREATE TABLE submission_findings (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('REQUIRED','SUSPICIOUS')),
  rule            TEXT NOT NULL,
  file            TEXT,
  line            INT,
  column          INT,
  symbol          TEXT,
  message         TEXT NOT NULL,
  satisfied       BOOLEAN NOT NULL
);
CREATE INDEX idx_findings_submission ON submission_findings(submission_id);

-- Audit
CREATE TABLE audit_events (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_events(target_type, target_id, created_at DESC);
```

This replaces `InMemorySubmissionCache` (`orchestration/InMemorySubmissionCache.java:14`) as the system of record. The Redis cache stays as a hot-path optimization on top.

## Rollout

**Phase A — instrument the current monolith (1 week).** Add metrics: per-route latency, queue depth, runner saturation. Switch `InMemorySubmissionCache` to `Caffeine` (in-process LRU with TTL) so a JVM restart doesn't lose everything. Add per-assignment rate limiting in `RunTestController`. No external dependencies. Validate that we can sustain 1000 sequential requests (even if they're slow).

**Phase B — add the async path alongside the sync one (2 weeks).** Add `submitAsync()` to `RunTestService` that enqueues + returns 202. Add a `submitSync()` (the current behaviour, `?wait=true`). Add a single runner process that consumes the queue. Keep the current `?wait=true` as the default for now. Frontend work (Phase 1+ of the frontend master prompt) can start. Make sure the cache is shared between sync and async paths.

**Phase C — scale out the runner pool (1 week).** Add a few runner pods. Load test: 1000 concurrent submissions in a 5-min window. Measure: queue depth, runner saturation, cache hit rate, p50/p95/p99 latencies for `?wait=true` requests. Add Prometheus + Grafana dashboards for these.

**Phase D — replace in-memory cache with Redis + add PostgreSQL (2 weeks).** Migration in two phases: (1) write-through to BOTH old `InMemorySubmissionCache` and new `RedisSubmissionCache`; read from either, prefer Redis. (2) After 1 week of clean comparison, drop the in-memory fallback. Same pattern for `SubmissionRecord`: write to both, then drop the in-memory one.

**Phase E — add auth + RBAC + frontend (4 weeks).** Spring Security with JWT, tRPC adapter, Next.js. During this phase the frontend drives backend endpoint additions.

**Phase F — multi-host (2 weeks).** Add runners to multiple Docker hosts. Add a host pool selector to the API. Add per-host saturation metrics. Load test at 1000 concurrent.

**Phase G — autoscaling (1 week).** Kubernetes HPA on the runner Deployment, driven by Redis Stream consumer-group lag. Scale down to 0 runners at night if the school is closed.

## What NOT to do

- **Don't switch to k8s first.** Plain Docker on a few VMs is fine up to ~30 hosts. K8s adds operational overhead (RBAC, ingress, secrets, helm, observability stack) that pays off only at much larger scale. The Runner Pool + Redis Stream + Docker host pattern *is* portable to k8s — every Docker host is just a node — but you don't need k8s to run the pattern.
- **Don't use Postgres LISTEN/NOTIFY for the WS fan-out.** Postgres connection limits will bite you. Use Redis Pub/Sub.
- **Don't make the API pods run `docker run` themselves.** Even at 5 pods, that's 5 Docker daemons with their own state, capacity, and failure modes. The API stays Docker-free; runners are the only ones that touch the Docker socket.
- **Don't trust that "async = faster for everyone".** The sync `?wait=true` path is still useful for CI, scripts, and demo deployments. Keep both. The default for the FE is async + WebSocket; `?wait=true` is opt-in.
- **Don't shard by `workspacePath` at the cache layer.** The whole point of the cache is that student A's submission and student B's submission with the same source hash get the same result. The cache key is `assignmentId + sourceHash`, never the workspace.

## What this changes in code today

Files to update in priority order (do these in order, each as a separate PR):

1. `backend/src/main/java/com/apexeval/backend/orchestration/InMemorySubmissionCache.java` — keep, but rename to `CaffeineSubmissionCache` and add TTL. Adds nothing external, but the LRU protects against OOM.
2. New: `backend/src/main/java/com/apexeval/backend/orchestration/RedisSubmissionCache.java` — implements the same `SubmissionCache` interface, wraps Lettuce + Jedis. The `RunTestService` constructor switches to whichever is configured.
3. `backend/src/main/java/com/apexeval/backend/orchestration/RunTestController.java` — add the async endpoint, the WS endpoint, the new `?wait=true` flag, and the JWT principal extraction.
4. New: `backend/src/main/java/com/apexeval/backend/orchestration/SubmissionJobBroker.java` — Spring `@Service` that wraps `XADD submission-jobs * <fields>` and `XREADGROUP`.
5. New: `backend/src/main/java/com/apexeval/backend/runner/AsyncRunnerApplication.java` — a separate Spring Boot main class with `@RabbitListener`-equivalent for Redis Streams. Same `RunTestService` injected, same `DockerSandboxExecutor`. The async path lives here, the sync path stays in the API.
6. `docker-compose.yml` (the root one) — add `redis`, `postgres`, `apexeval-runner-1..N`, plus per-runner `apexeval/runner-host:N` overlay networks. Document the host-pool topology in `docs/deployment.md`.
7. New: `backend/src/main/java/com/apexeval/backend/security/` — Spring Security config, JWT decoder (use `nimbus-jose-jwt`), principal model with `role` claim, method-security annotations. Add `requireWorkspaceMatch(workspacePath)` helper that compares the JWT's `workspacePath` to the request's and throws 403 on mismatch. This is the security backbone for the multi-tenant model.
8. New: `backend/src/main/resources/db/migration/V1__init.sql` (Flyway) — the schema above.
9. `backend/pom.xml` — add `spring-boot-starter-data-jpa`, `postgresql`, `flyway-core`, `spring-boot-starter-security`, `spring-boot-starter-websocket`, `lettuce-core` or `jedis`. None of these are heavyweight; the Spring Boot starters are < 50 MB.

## The cost model

For 1000 concurrent students submitting over a 10-minute window:

- **API pods**: 3 × `apexeval-api` (4 vCPU, 8 GB each) = 12 vCPU, 24 GB. ~$100/mo on a cloud VM.
- **Runner pods**: 7 × `apexeval-runner` (8 vCPU, 16 GB each, 1 per host) = 56 vCPU, 112 GB. ~$500/mo.
- **Docker hosts**: 7 hosts (or k8s nodes) with 16 vCPU / 32 GB / 200 GB SSD each. ~$50/mo per host = $350/mo. Or 7 large cloud VMs.
- **Redis**: 1 × `apexeval-redis` (4 GB, persistence on) = ~$30/mo. Or managed Redis at $50/mo.
- **PostgreSQL**: 1 primary + 1 replica (8 GB, 100 GB SSD) = ~$80/mo. Or managed Postgres at $100/mo.
- **Frontend**: 1 × Vercel/Next.js host (or self-hosted) = ~$20/mo or self-host.

Total: **~$1100/month** at 1000-concurrent scale, mostly compute. Drop the API to 2 pods and the runner pool to 3-4 hosts during off-hours, and it's $500/month at idle.

## The riskiest parts

1. **Docker socket exposure to runner pods** is the largest blast radius. Mitigate by running the runner as a non-root user, using a read-only rootfs for the runner's own container, mounting `/var/run/docker.sock` from a dedicated path (`/run/docker.sock` on a separate filesystem), and using user namespaces (`userns-remap`) on the Docker daemon. Document the threat model in `docs/security.md`.
2. **Cache poisoning** is the second-largest. The cache key must include `runnerVersion` and `runnerImage` (already noted in `master_prompt.md` under "Cache Requirements") so a Docker image update invalidates the cache. The Redis cache must have a per-assignment max size and an LRU eviction policy so a single student can't fill it.
3. **Runaway job** — a student code that takes 10 minutes. Currently mitigated by the manifest's `timeoutSeconds` and the Docker `--pids-limit`. Add a runner-level timeout watchdog that `kill -9`s the container after `manifest.limits.timeoutSeconds + 30s` regardless. Log the kill so a teacher can see "this student submitted a 1-hour loop".
4. **Auth bypass via workspace_path tampering** — a student sending `workspacePath: "/somebody-elses-workspace"`. Already discussed: JWT `workspacePath` claim must be checked server-side on every call. Add integration tests for this specifically.
5. **Redis as a SPOF** — if Redis dies, the system can't cache, can't queue, can't fan out WebSocket events. Run two Redis nodes in a primary-replica configuration with `Sentinel`. The API tolerates a brief outage by falling back to in-memory cache (Caffeine LRU from step 1) and direct synchronous execution (`?wait=true`).
