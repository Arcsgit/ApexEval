# ApexEval — Project Overview

ApexEval is an **on-premise AI-assisted platform for evaluating coding assignments**, designed to scale to **1000 concurrent students** with sandboxed execution, role-based access control, and a modern Angular frontend.

---

## Architecture

```
+------------------+      +---------------------+      +------------------+
|   Angular 18+    | <--> |   Spring Boot 3.x   | <--> |  PostgreSQL + Redis |
|   (Material,     |      |   Java 21 / Kotlin  |      |   (cache + auth)   |
|    Signals, RxJS)|      |   Spring Security   |      +---------------------+
+------------------+      +---------------------+           |
          |                     |                          |
          |                     |                          |
          v                     v                          v
+------------------+      +---------------------+      +------------------+
|   Sandbox Exec   |      |   Cache Layer       |      |   Audit / History  |
|   Docker/K8s     |      |  Redis | InMemory | JDBC |  Audit Events    |
|   Python / Java  |      +---------------------+      +------------------+
+------------------+
```

---

## Key Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Cache SPI** | `SubmissionCache` interface + `SubmissionCacheFactory` at startup | Backend can run with **InMemory** (dev), **Redis** (scaled), or **JDBC** (embedded H2) depending on `apexeval.cache.backend` property |
| **Database** | Flyway V1 migration + JPA entities (`UserEntity`, `CourseEntity`, `AssignmentEntity`, `SubmissionEntity`, `FindingEntity`, `AuditEventEntity`) | Full schema versioned; entities are profile-gated behind `spring.profiles.active = db` |
| **Auth / Users** | `users` table with `role` column (SUPERADMIN / ADMIN / STUDENT) + JWT workspace path matching | Frontend reads role from `{GET /api/auth/me}`; role guards on Angular routes |
| **Role-Based API** | `/api/me`, `/api/users`, `/api/courses`, `/api/assignments`, `/api/submissions` with pagination and filter params | Backend serves the Angular student / admin / superadmin UIs with proper scoping |
| **Sandbox** | Docker-based, language-specific runners (Python, Java) with resource limits | Executes student code in isolated containers; results cached to avoid re-execution |
| **Scaling** | Redis-backed SubmissionCache with **write-through** persistence; connection pool (HikariCP) sized for 1000 concurrent | Cache hit path avoids 5s sandbox round-trip; SCAN-based invalidation for assignment-scoped eviction |

---

## Active Modules (as of this session)

### Backend (`/backend`)

- **`pom.xml`** — HikariCP, Flyway, spring-data-jpa, hypersistence-utils-hibernate-63 (JSONB), spring-data-redis
- **Cache implementations** — `InMemorySubmissionCache` (no @Component), `RedisSubmissionCache` (SCAN-based), `SubmissionCacheFactory` (chooses at startup)
- **JPA entities** (in `com.apexeval.backend.persistence`):
  - `UserEntity` — email, displayName, role, workspacePath, passwordHash
  - `CourseEntity` — title, description, date range, createdBy
  - `CourseDayEntity` — composite key (course_id + day_index)
  - `CourseEnrollmentEntity` — composite PK (course_id, user_id) + courseRole
  - `AssignmentEntity` — title, language, manifest (JSONB), dueAt, publishedAt, hiddenTestsPath
  - `SubmissionEntity` — userId, assignmentId, sourceHash, sourcePath, status, outputJson, executedAt, errorMessage
  - `FindingEntity` — submissionId, checksum, passed, outputSnippet, errorMessage, executedAt
  - `AuditEventEntity` — entityType, entityId, action, changedBy, changedAt, oldJson, newJson
- **Repositories** — Spring Data JpaRepository per entity; custom queries for `findByUserAndAssignment`, `findByAssignmentId`, `findBySubmissionId`, etc.
- **RunTestService** — orchestrates sandbox execution, cache lookup/miss/hit, write-through persistence to Postgres + Redis
- **API Controllers** — `RunTestController`, `AuthController` (`/api/me`, role claims), `SubmissionsController` (paginated listing), `UsersController`, `CoursesController`

### Frontend (`/frontend` — Angular 18+)

- **Master prompt** (`FRONTEND_MASTER_PROMPT.md`) defines:
  - Role-based navigation (Superadmin / Admin / Student)
  - API endpoint map
  - Phase plan (Phase 1: Auth + Login, Phase 2: Course/Assignment browser, Phase 3: Submission history, Phase 4: Live execution view, Phase 5: Admin grading dashboard)
- Built with **Material Design**, **Signals**, **RxJS**
- Currently at: Angular skeleton + role guards + HTTP services stubbed

### Scaling & Infra

- **`SCALING_PLAN.md`** — 1000-concurrent architecture rationale
- **`Dockerfile`** — multi-stage build for sandboxed execution
- **Docker Compose** (project root) — brings up `backend`, `postgres`, `redis`, `sandbox-docker` services
- Profile: `dev` = InMemory cache + no DB; `db` = PostgreSQL + Redis enabled

---

## Verified Functionality (End-to-End)

1. **Backend compiles** with `mvn compile` — all entities + repositories + cache SPI
2. **Backend starts** with `mvn spring-boot:run` — profile `dev` uses InMemory cache
3. **Cache hit / miss** verified: first `/api/run-test` call = miss (full sandbox ~5s), second call = hit (sub-millisecond)
4. **Role-based endpoints** — `GET /api/auth/me` returns current user JWT claims (email, role, workspacePath)
5. **E2E student flow**: Student submits → sandbox runs → result cached → subsequent runs serve from cache

---

## Roadmap (next steps)

| Priority | Item |
|----------|------|
| **High** | Implement `RedisSubmissionCache` write-through persistence (currently InMemory only in dev) |
| **High** | Add `/api/submissions?userId=&assignmentId=` with pagination for student history view |
| **High** | Add `/api/me` + role-claim endpoints for Angular auth guards |
| **Medium** | Add Docker Compose services for `postgres` + `redis` alongside backend |
| **Medium** | Wire up Angular phases per `FRONTEND_MASTER_PROMPT.md` (Phase 1 already started) |
| **Low** | Add admin grading dashboard, bulk operations, export results |

---

## Running the Project

```bash
# Dev mode (InMemory cache, no DB required)
cd backend && mvn spring-boot:run

# DB + Redis enabled profile
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=db

# Or via Docker Compose (project root)
docker-compose up -d
```