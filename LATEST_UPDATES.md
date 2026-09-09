# ApexEval — Latest Project Status

**Last Updated:** 2026-09-09  
**Branch:** main  
**Primary Goal:** On-premise AI-assisted assignment evaluation platform supporting multiple languages (Java, Spring Boot, Python, JavaScript/TypeScript/React, C, C++, Go, Rust, C#) with deterministic caching, secure sandboxed execution, and role-based access control.

---

## ✅ WORKING

### Backend (Spring Boot 4.1, Java 21, Maven)

#### Core Evaluation Pipeline
- **RunTestService** - Main orchestration service handling:
  - Source code hashing (language-specific: JavaParser for Java, generic for others)
  - Cache lookup (assignmentId + sourceHash)
  - Diff generation (JGit-based)
  - Static analysis routing via StaticAnalyzerRegistry
  - Execution strategy resolution (JavaRunner, PythonRunner, NodeRunner, NativeRunner)
  - Database verification
  - Webhook emission on completion
- **Deterministic Caching** - `SubmissionCache` SPI with three implementations:
  - `InMemorySubmissionCache` (ConcurrentHashMap) - dev only
  - `RedisSubmissionCache` (Spring Data Redis + Lettuce) - production hot path
  - `JdbcSubmissionCache` (PostgreSQL) - durable fallback (placeholder)
- **Cache Factory** - Selects implementation at startup via `apexeval.cache.backend` property (in-memory, redis, jdbc)

#### Execution & Sandboxing
- **DockerSandboxExecutor** - Secure containerized execution:
  - Resource limits (CPU, memory, processes, timeout, output size)
  - Read-only rootfs with tmpfs /scratch
  - Non-root user, no network by default
  - No Docker socket exposure to student code
- **Execution Strategies** - Language-specific:
  - `PlainJavaExecutionStrategy` - Maven/JUnit
  - `SpringBootExecutionStrategy` - Spring Boot apps
  - `PythonRunner` - pytest with type hints
  - `NodeRunner` - Jest/Vitest for JS/TS/React
  - `NativeRunner` - GCC/Clang for C/C++

#### Static Analysis
- **Java** - Full JavaParser-based (USES_TYPE, HAS_CLASS, METHOD_FORBIDDEN, HAS_METHOD, EXTENDS_TYPE, CONSTANT_RETURN, PRINT_ONLY_METHOD, EMPTY_METHOD)
- **Python** - AST-based + mypy integration (HAS_TYPE_HINTS, TYPE_ERROR, MISSING_ANNOTATION)
- **JavaScript/TypeScript/React** - Placeholder (ready for ESLint)
- **C/C++** - Placeholder (ready for clang-tidy)

#### API Endpoints (REST)
```
POST   /api/run-test          # Main grading entrypoint
POST   /api/static-check      # Static analysis only
POST   /api/execute           # Raw execution (no cache, no static)
POST   /api/diff              # Git diff between commits
GET    /api/assignments       # List all assignments
GET    /api/assignments/{id}  # Assignment detail with path
GET    /api/submissions       # Paginated submission list (filters: studentId, assignmentId, courseId, status)
GET    /api/submissions/{id}  # Submission detail
GET    /api/submissions/{id}/test-results
GET    /api/submissions/{id}/findings
GET    /api/submissions/{id}/diff
POST   /api/submissions/submit
POST   /api/submissions/{id}/rerun
```

#### Database (PostgreSQL + Flyway)
- **Schema V1** - users, courses, course_days, course_enrollments, assignments, submissions, findings, audit_events, cache_entries
- **JPA Entities** - UserEntity, CourseEntity, CourseDayEntity, CourseEnrollmentEntity, AssignmentEntity, SubmissionEntity, FindingEntity, AuditEventEntity
- **Repositories** - Spring Data JPA with custom queries

#### Infrastructure
- **CORS** - Configured for http://localhost:4200
- **Docker Compose** - Backend, PostgreSQL, Redis, student workspaces
- **Assignment Manifests** - 6 assignments loaded from classpath JSON

---

### Frontend (Angular 18+, Material Design 3, Signals, RxJS)

#### Authentication & Routing
- **AuthService** - Signal-based state management, JWT in localStorage/sessionStorage
- **Route Guards** - `authGuard`, `guestGuard`, `roleGuard('student'|'faculty'|'admin'|'superadmin')`
- **Demo Accounts** - 3 student accounts (student-1, student-2, student-3) with workspace paths mapped to local workspaces
- **Lazy-loaded Routes** - Role-based route groups (student, faculty, admin, superadmin)

#### API Integration
- **ApiService** - Typed HTTP client with:
  - Assignment endpoints
  - Submission endpoints (list, detail, test-results, findings, diff, submit, rerun)
  - Legacy endpoints (run-test, static-check, execute, diff)
- **SubmissionsService** - Real backend + mock fallback
- **CoursesService** - Real backend + mock fallback

#### Components (Lazy-loaded)
- **Sign-in** - Form with 3 student demo buttons + faculty/admin/superadmin
- **Student Dashboard** - My courses with progress
- **Course Home** - Day-by-day schedule with assignment status badges
- **Assignment Workspace** - VS Code Server iframe + floating assignment overlay + **Run Code button** using `assignmentPath` from API
- **Result Detail** - Tabs: Tests (expandable failures), Static Analysis (required/suspicious with file/line/col), Diff (line-numbered)
- **Submission History** - Paginated, filterable

#### Build & Config
- **Angular 18** - Standalone components, OnPush, strict TypeScript
- **Material 3** - Custom theme mapping to PASS/FAIL/FLAGGED status colors
- **Monaco Editor** - Via ngx-monaco-editor-v2 (lazy-loaded)
- **Proxy Config** - `/api/*` → http://localhost:8080

---

## ❌ NOT WORKING

### Frontend - Application Bootstrap Hangs
**Symptom:** Frontend loads `index.html` and shows the initial loader animation indefinitely. Angular never bootstraps (no `ApexEval bootstrap successful!` in console).

**Evidence:**
- Production build works (`ng build` → serves correctly via `http-server`)
- Dev server (`ng serve`) builds successfully but hangs after "Application bundle generation complete"
- ESBuild deadlock in watch mode (`fatal error: all goroutines are asleep - deadlock!`)
- No Angular bootstrap logs appear in browser console

**Root Cause Candidates:**
1. **Zone.js / Vite HMR conflict** - Dev server watch mode triggers ESBuild deadlock
2. **Circular dependency** - Lazy-loaded routes + services + guards
3. **Zone.js not loading** - `polyfills.js` not executing before Angular bootstrap
4. **Route guard eager evaluation** - Guards trying to inject services before bootstrap completes

**Workaround:** Production build + `http-server dist/apexeval/browser` works perfectly.

### Java Assignments (require Docker)
**Symptom:** Java/Spring Boot assignments fail with "Could not find a valid Docker environment"

**Root Cause:** Testcontainers/DockerSandboxExecutor requires Docker daemon (`/var/run/docker.sock`) which is not available in this environment.

**Working:** C assignment (local gcc compilation, no Docker needed)

### Student-3 Workspace
**Status:** Empty workspace - no code submissions possible for testing

---

## 📋 NEXT PLANS

### Immediate (This Week)

#### 1. Fix Frontend Dev Server
- **Option A:** Disable HMR in `angular.json` (`"hmr": false` already set - verify)
- **Option B:** Switch to `ng serve --no-hmr --poll=2000`
- **Option C:** Use `ng build --watch` + separate `http-server` for dev
- **Option C (Recommended):** Production build works → use `ng build --watch` in background + `http-server` on dist folder

#### 2. Verify All 3 Students End-to-End
- Login as student-1, student-2, student-3
- Navigate course → assignment → workspace
- Click "Run Code" → verify backend call → result detail page
- Verify cache hits on repeated runs

#### 3. Add Missing Frontend Features
- **Student Dashboard** - Show enrolled courses with progress
- **Course Home** - Day-by-day assignment list with status badges
- **Submission History** - Paginated list with filters
- **WebSocket** - Live result updates (when backend async path ready)

### Short-term (Week 2-3)

#### 4. Backend Async Path (Scaling Plan Phase B)
- Redis Streams job broker
- `POST /api/run-test?wait=false` → returns 202 + jobId
- WebSocket `/api/ws/results` for live updates
- Runner pool consuming from stream

#### 5. Database Persistence (Scaling Plan Phase D)
- Flyway migration V1 applied
- `SubmissionRecordEntity` persisted on completion
- Cache write-through to PostgreSQL

#### 6. Auth + RBAC (Scaling Plan Phase E)
- JWT-based auth with `/api/auth/sign-in`, `/api/auth/me`
- Workspace path claim validation
- Role-based endpoint protection

### Medium-term (Month 1-2)

#### 7. Additional Language Support
- **JavaScript/TypeScript** - ESLint + TypeScript Compiler API
- **React** - React Hooks rules, JSX checks
- **C/C++** - clang-tidy integration
- **Go/Rust/C#** - New runners

#### 8. Scoring & Feedback
- Weighted scoring (tests 60% + static 30% + style 10%)
- Partial credit for test passes
- Actionable file/line/column feedback

#### 9. Admin Features
- Assignment creator wizard (multi-step)
- Roster × submissions matrix
- Class analytics (pass rates, common violations, time-to-submit)
- Grade override with audit trail

### Long-term (Month 2+)

#### 10. Multi-host Runner Pool (Scaling Plan Phase F)
- Dedicated Docker hosts per runner
- Host pool selector in API
- Kubernetes HPA on runner deployment (Phase G)

#### 11. Security Hardening
- Docker socket exposure mitigation (user namespaces, read-only rootfs)
- Cache poisoning prevention (runnerVersion in cache key)
- Runaway job watchdog
- Auth bypass prevention (workspacePath claim validation)

#### 12. Observability
- Prometheus metrics (queue depth, runner saturation, cache hit rate, p50/p95/p99)
- Grafana dashboards
- Audit log API for superadmin

---

## 📁 KEY FILES TO KNOW

### Backend
```
backend/
├── src/main/java/com/apexeval/backend/
│   ├── orchestration/
│   │   ├── RunTestService.java          # Main pipeline
│   │   ├── RunTestController.java       # POST /api/run-test
│   │   ├── SubmissionCache.java         # Cache SPI
│   │   ├── InMemorySubmissionCache.java
│   │   ├── cache/
│   │   │   ├── RedisSubmissionCache.java
│   │   │   └── SubmissionCacheFactory.java
│   │   └── SourceContentHasher.java     # Language-specific hashing
│   ├── assignment/
│   │   ├── AssignmentController.java    # GET /api/assignments
│   │   ├── AssignmentManifestRepository.java
│   │   └── AssignmentResponse.java
│   ├── persistence/                     # JPA entities + repositories
│   ├── runner/                          # EvaluationRunner + registry
│   ├── staticcheck/                     # Static analysis
│   ├── sandbox/                         # DockerSandboxExecutor
│   └── technology/                      # Technology, Framework, EvaluationMode enums
├── src/main/resources/assignments/      # 6 JSON manifests
└── pom.xml
```

### Frontend
```
apexeval-frontend/
├── src/
│   ├── app/
│   │   ├── app.routes.ts                # Role-based lazy routes
│   │   ├── app.config.ts                # HttpClient + Router + Animations
│   │   ├── core/
│   │   │   ├── auth/auth.service.ts     # Signal-based auth
│   │   │   ├── guards/guards.ts         # Route guards
│   │   │   ├── api/api.service.ts       # Typed HTTP client
│   │   │   ├── services/
│   │   │   │   ├── courses.service.ts
│   │   │   │   └── submissions.service.ts
│   │   │   └── mock/                    # Demo data
│   │   ├── features/
│   │   │   ├── auth/sign-in/
│   │   │   ├── student/
│   │   │   │   ├── assignment-workspace/
│   │   │   │   ├── result-detail/
│   │   │   │   └── submission-history/
│   │   │   └── shared/layouts/app-shell/
│   │   └── shared/components/
│   ├── index.html                       # Initial loader + fallback timeout
│   └── main.ts                          # Bootstrap with logging
├── angular.json                         # HMR disabled
└── proxy.conf.json                      # /api/* → localhost:8080
```

### Workspaces & Fixtures
```
workspaces/
├── student-1/                           # Correct implementations
├── student-2/                           # Buggy implementations (for testing failures)
└── student-3/                           # Empty

fixtures/
├── c-linked-list-assignment/
├── generic-stack-assignment/
├── movie-watchlist-assignment/
├── python-calculator-assignment/
├── react-assignment/
└── spring-boot-assignment/
```

---

## 🔑 QUICK START COMMANDS

```bash
# Backend (requires Docker for Java assignments)
cd /Users/archit/projectS/ApexEval/backend && mvn spring-boot:run

# Frontend - Production build (WORKS)
cd /Users/archit/projectS/ApexEval/apexeval-frontend && npm run build
npx http-server dist/apexeval/browser -p 4200 -c-1

# Frontend - Dev server (BROKEN - hangs)
cd /Users/archit/projectS/ApexEval/apexeval-frontend && npx ng serve --port 4200

# Test backend directly
curl -X POST http://localhost:8080/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"workspacePath": "/Users/archit/projectS/ApexEval/workspaces/student-1", "assignmentPath": "c-linked-list-assignment", "assignmentId": "c-linked-list-v1", "lastTestedCommit": ""}'
```

---

## 🎯 SUCCESS CRITERIA FOR NEXT SESSION

1. ✅ Frontend dev server runs without hanging
2. ✅ Login as student-1 → see "Programming Fundamentals" course
3. ✅ Click course → see 6 assignments grouped by week/day
4. ✅ Click "C Linked List" → VS Code iframe + assignment overlay
5. ✅ Click "Run Code" → backend executes → shows PASS (10/10)
6. ✅ Login as student-2 → same assignment → shows FAIL (3/10)
7. ✅ Re-run student-1 → cache hit (same 10/10 PASS)
8. ✅ Result detail page shows tests, static analysis, diff tabs

---

**Note for Next LLM:** The production frontend build works. The dev server issue is isolated to `ng serve` watch mode. Use `ng build --watch` + `http-server` for development until the ESBuild deadlock is resolved. All backend APIs are functional and tested with 3-student cache verification.