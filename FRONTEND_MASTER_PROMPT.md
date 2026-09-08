# Master Prompt: Build the ApexEval Frontend (Angular)

You are building the **ApexEval Frontend** — a production web application for an on-premise AI-assisted assignment evaluation platform.

## Role

You are a senior full-stack engineer with deep Angular/TypeScript expertise. You build accessible, polished, production-grade UIs. You design before coding. You write tests alongside features. You never invent APIs that don't exist — read the backend code in `/Users/archit/projectS/ApexEval/backend/` and the existing endpoint definitions before binding the frontend to anything.

## Repository

ApexEval monorepo at `/Users/archit/projectS/ApexEval`. Existing pieces:

- **Backend** (`/backend`) — Spring Boot 4.1, Java 21, Maven. Already exposes REST endpoints (see "Existing API" below). Currently synchronous; an async redesign is planned but not required for the frontend to start.
- **Fixtures / workspaces** — student code, hidden tests, assignment manifests. Read-only reference for the frontend's mock data.
- **`master_prompt.md`** — the project-wide master prompt. Read it first; it is the canonical description of assignments, runners, static analysis, and the existing endpoint contract.
- **`SCALING_PLAN.md`** — architecture for 1000 concurrent students. Read it so you design the frontend's data-flow and WebSocket layer to match the planned backend shape.
- **`PROJECT_STATUS.md`** — current feature status, known gaps, and the pending-issues list. The frontend should not implement features that the backend can't actually serve.

The frontend lives in a sibling top-level directory: `/Users/archit/projectS/ApexEval-frontend/`. Do not nest it under `backend/`. Use the Angular CLI to scaffold (`npx -p @angular/cli ng new apexeval-frontend --routing --style=scss --strict --standalone`), then move/rename to the target path.

## Architecture: three user roles, three permission tiers

ApexEval serves three distinct user populations. The frontend must implement all three with strict role-based access control on every API call.

### 1. Superadmin (system owner)

The operator of the on-premise ApexEval installation. They:

- Create / disable / reset other Superadmins and Admins.
- Configure the platform itself: default Docker host pool, runner concurrency limits, cache TTL, global rate limits, feature flags, allowed email domains for sign-up.
- Inspect platform-wide health: per-runner p95 latency, queue depth, cache hit rate, sandbox error rate, disk usage per assignment, currently-running Docker containers.
- View audit log (every admin action, every grade override, every assignment publish).
- Force-purge the `SubmissionCache` (e.g. after an assignment is re-graded).
- Re-run a single submission by id (forces cache bypass + re-execution).

A superadmin is the only role that can see and manage other superadmins.

### 2. Admin (instructor / course staff)

Teaches one or more courses. They:

- Create / edit / publish assignments. An assignment is a JSON document (`AssignmentManifest` on the backend) plus the hidden-test files on disk. The admin form edits the manifest fields and uploads a `.zip` of the hidden test directory.
- See a roster of students enrolled in their courses.
- See every submission for any student in their courses. Drill into a single submission to see its diff, test results, static analysis findings with line/column locations.
- Override a `PASS` / `FAIL` / `FLAGGED_FOR_REVIEW` outcome. The override is recorded in the audit log with reason text.
- See class-wide analytics: pass-rate per assignment, common static-analysis violations, time-to-submit histogram, plagiarism flags (when the backend exposes them).

An admin can never see another admin's courses or submissions. They cannot see the superadmin dashboard.

### 3. Student

Takes courses. They:

- See only the courses they're enrolled in. Inside each course, see assignments grouped by **day** (a course has a schedule — week-1-day-1, week-1-day-2, …). Each day has 0..N assignments.
- Open an assignment to see: description, allowed languages, runtime limits, what static rules will be checked, due date.
- Submit code. The simplest flow is: paste code into a Monaco editor (with language auto-detect) → click Submit → see live progress (build → test → static analysis) → see results with per-test pass/fail and per-finding file/line/column locations.
- See their own submission history for the course. Each history row links to the full result detail.
- Resubmit. Re-submissions within a 30-second window should be debounced client-side; the backend's content-addressed cache will dedupe exact same content automatically.
- Cannot see other students' code or results, cannot see admin-only fields (e.g. the hidden test source), cannot navigate to other students' workspaces.

A student is always scoped to their own `workspacePath` — every API call carries their identity, and the backend (which you must update to support this) will reject any request whose `workspacePath` doesn't match the authenticated user's.

## Existing API surface (read these before designing)

The backend's controllers are in `backend/src/main/java/com/apexeval/backend/`:

- `orchestration/RunTestController.java` — `POST /api/run-test` (the main grading entrypoint).
- `orchestration/RunTestRequest.java` — request body: `{workspacePath, assignmentPath, assignmentId, lastTestedCommit}`.
- `orchestration/RunTestResponse.java` — response: `{diff, executionResults, dbVerification, staticCheck, overallStatus}`. Where:
  - `executionResults.results: List<TestResult>` — each test has `testName`, `passed`, `failureMessage`.
  - `staticCheck.requiredFindings` and `staticCheck.suspiciousFindings` — each has `rule`, `value`, `severity`, `message`, `satisfied`, `file`, `line`, `column`, `symbol`, `evidence`.
  - `overallStatus` ∈ `PASS` / `FAIL` / `FLAGGED_FOR_REVIEW`.
- `diff/DiffController.java` — `POST /api/diff` (git diff between HEAD and `lastTestedCommit`).
- `staticcheck/StaticCheckController.java` — `POST /api/static-check` (static analysis only, no execution).
- `execution/ExecuteController.java` — `POST /api/execute` (raw execution, no static analysis, no cache).
- `orchestration/WebhookEmitter.java` — fires a `SubmissionEvent` to `apexeval.webhook.url` (currently a no-op logger when unset).

There is **no** `/api/login`, `/api/me`, `/api/users`, `/api/assignments` (CRUD), `/api/submissions` (history), or `/api/ws/results` (WebSocket). **You will need to add all of these on the backend as part of this work, OR document them as TODOs in the frontend with a clear mock-data fallback.** See the "Adding the missing backend endpoints" section below.

## Target scale

The system is meant to serve **1000 concurrent students**. The frontend must:

- Render a course list with 20 courses × 30 assignments in under 1 s.
- Sustain 1000 simultaneous live-result WebSocket connections per backend replica (the backend is replicated horizontally; design the WS layer to round-robin).
- Initial bundle under 1.0 MB gzipped for the entry route. Lazy-load route chunks.
- No blocking work on the main thread. All data fetches go through RxJS streams + `async` pipe. Optimistic UI for status transitions.
- Skeleton loaders for every async surface. No layout shift on data arrival (always reserve space).
- A11y AA at minimum. AAA for color contrast in critical UI (status banners).

## Frontend tech stack (use these, do not invent)

- **Framework:** Angular 18+, **standalone components** (no NgModules in new code), **signals** for component-local reactive state, **RxJS** for cross-component / async streams. Use the new `provideHttpClient`, `provideRouter`, `provideAnimationsAsync` bootstrap. **No NgModules.** Use `ChangeDetectionStrategy.OnPush` on every component.
- **Language:** TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true`).
- **Styling:** Angular Material 18+ as the component library. Use the **M3 token system** with a custom ApexEval theme that maps to the backend's `PASS` / `FAIL` / `FLAGGED_FOR_REVIEW` status taxonomy. Do **not** add Tailwind. Do **not** add a second component library. If Material doesn't have what you need, build the smallest possible custom component using `@angular/cdk` (overlay, a11y, portal) as the foundation.
- **API client:** Plain `HttpClient` with a typed `ApiService` wrapper. Each method takes a typed DTO and returns `Observable<T>`. Use `rxjs` operators (`switchMap`, `catchError`, `shareReplay`, `retry`) instead of `.then()`/`.catch()`. **Don't add tRPC** — tRPC is React-flavored; the backend is Java/Spring. The frontend's API contract is plain REST + JSON.
- **State management:** Angular **signals** for component-local state. **No NgRx, no Akita, no Elf.** For cross-cutting state that doesn't fit a service (`currentUser`, `themePreference`, `pendingSubmissions`), use a single small `AppStore` service with signals. Everything else stays in route-level services.
- **Auth:** Angular's `CanActivateFn` guard. JWT in `localStorage` (acceptable for SPA, with a comment explaining why we don't use httpOnly cookies yet — answer: the Spring Security work that adds the cookie layer is a separate backend story). HTTP interceptor attaches `Authorization: Bearer <token>`. Refresh-token rotation handled by the backend. Route guards in `src/app/core/guards/`.
- **Forms:** Reactive Forms (`FormControl`, `FormGroup`, `FormBuilder`). Inline error messages via `<mat-error>`. Zod-equivalent: **Zod is JS-only**; use **`valibot`** or **`zod`** (yes zod works in Angular too — it's framework-agnostic) for schema validation, or write tiny hand-rolled validators. Pick one. Recommendation: `zod` for cross-stack familiarity.
- **Editor (assignment view):** **Monaco Editor** via `ngx-monaco-editor-v2` (the maintained Angular wrapper) or `monaco-editor` directly. Lazy-loaded. No syntax-highlighting bundle for languages the assignment doesn't allow — use Monaco's `setModelLanguage` with the languages the manifest allows.
- **Charts (admin analytics):** **ng2-charts** (wraps Chart.js) or **ngx-charts** (Swiss Army knife). Pick one. Recommendation: **ngx-charts** for richer interactions (drill-down, ranges, brush).
- **Date / time:** `date-fns` (locale-aware, tree-shakeable). Never use `moment`.
- **WebSocket:** Native `WebSocket` wrapped in a small RxJS-based `WebSocketService`. No `socket.io` on the frontend. Reconnection with exponential backoff. Heartbeat every 30 s. Close on tab hidden, reopen on visible.
- **i18n:** `@angular/localize` from day one. All user-facing strings in `src/locale/messages.{lang}.xlf`. Default `en`. Even if you only ship `en` initially, the structure is in place.
- **Testing:** **Jasmine + Karma** for unit (Angular's default; do not swap), **Playwright** for end-to-end. **Angular Testing Library** (`@testing-library/angular`) for component tests. Target: 80% coverage on `core/`, `shared/`, 60% on `features/`.
- **Linting:** ESLint with `@angular-eslint`, `@typescript-eslint`, `eslint-plugin-import` (forbid default exports in `core/` and `shared/`, enforce alphabetized imports). Stylistic rules via `@stylistic/eslint-plugin`. **Do not** add TSLint (deprecated).
- **Formatting:** Prettier with 2-space indent, single quotes, trailing commas.
- **Build:** Angular CLI (`ng build`). Target ES2022. Source maps in production for stack traces but stripped at the CDN edge.
- **State of routing:** Use the new `provideRouter` with `loadComponent` for lazy routes. **No eager route imports** for feature pages.

Do **not** add: NgRx, Akita, RxJS Subjects for state (use signals), Bootstrap (use Material), Tailwind, tRPC, GraphQL clients (REST only), moment, Lodash (use ES2022 built-ins), axios (use `HttpClient`).

## Repository layout

```
ApexEval-frontend/
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── .eslintrc.json (or eslint.config.mjs)
├── .prettierrc
├── .editorconfig
├── .env.example                  # never committed; copy from .env.example
├── proxy.conf.json               # dev server proxy → /api → http://localhost:8080
├── src/
│   ├── main.ts                   # bootstrapApplication(AppConfig)
│   ├── index.html
│   ├── styles.scss               # global styles, Material theme import
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── app/
│   │   ├── app.config.ts         # ApplicationConfig: providers, router, etc.
│   │   ├── app.routes.ts         # top-level route table (lazy-loaded)
│   │   ├── app.component.ts      # <router-outlet> + global header
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── core/                 # singleton services, guards, interceptors
│   │   │   ├── api/              # ApiService base, all DTO types
│   │   │   ├── auth/             # AuthService, JWT, role helpers, requireRole()
│   │   │   ├── guards/           # CanActivateFn: superadminGuard, adminGuard, studentGuard
│   │   │   ├── interceptors/     # authInterceptor, errorInterceptor
│   │   │   ├── ws/               # WebSocketService (RxJS wrapper)
│   │   │   ├── state/            # AppStore (signals-based global state)
│   │   │   ├── grading/          # status taxonomy mirror + formatters
│   │   │   ├── i18n/             # locale loader
│   │   │   └── utils/            # cn-equivalent, date helpers, zod schemas
│   │   ├── shared/               # presentational components used in 2+ features
│   │   │   ├── components/       # StatusBadge, FindingCard, DiffViewer, EmptyState
│   │   │   ├── pipes/            # status-label.pipe.ts, time-ago.pipe.ts
│   │   │   └── directives/       # highlight-line.directive.ts
│   │   └── features/             # one folder per top-level route group
│   │       ├── auth/
│   │       │   ├── sign-in/
│   │       │   │   ├── sign-in.component.ts
│   │       │   │   ├── sign-in.component.html
│   │       │   │   └── sign-in.component.scss
│   │       │   └── sign-in.routes.ts
│   │       ├── superadmin/
│   │       │   ├── superadmin.routes.ts
│   │       │   ├── dashboard/
│   │       │   ├── admins/
│   │       │   ├── platform/
│   │       │   ├── health/
│   │       │   ├── audit/
│   │       │   └── submissions/
│   │       ├── admin/
│   │       │   ├── admin.routes.ts
│   │       │   ├── dashboard/
│   │       │   ├── courses/
│   │       │   │   ├── [courseId]/
│   │       │   │   │   ├── course-detail.component.ts
│   │       │   │   │   ├── assignments/
│   │       │   │   │   │   ├── new/                # wizard
│   │       │   │   │   │   ├── [assignmentId]/     # edit
│   │       │   │   │   │   │   ├── edit-assignment.component.ts
│   │       │   │   │   │   │   ├── submissions/   # roster × submissions
│   │       │   │   │   │   │   └── analytics/
│   │       │   └── students/
│   │       ├── student/
│   │       │   ├── student.routes.ts
│   │       │   ├── dashboard/
│   │       │   ├── courses/
│   │       │   │   └── [courseId]/
│   │       │   │       ├── course-home.component.ts
│   │       │   │       └── assignments/
│   │       │   │           └── [assignmentId]/
│   │       │   │               ├── assignment-detail.component.ts
│   │       │   │               └── submissions/[submissionId]/
│   │       │   └── history/
│   │       └── shared/           # cross-cutting shell components
│   │           ├── app-header/
│   │           ├── app-sidebar/  # shown on admin/superadmin
│   │           ├── user-menu/
│   │           ├── status-banner/ # PASS/FAIL/FLAGGED banner
│   │           └── theme-toggle/
│   ├── assets/                   # static images, icons
│   ├── locale/
│   │   ├── messages.en.xlf
│   │   └── messages.es.xlf       # stub
│   └── styles/
│       ├── _theme.scss           # M3 token overrides
│       └── _status-colors.scss    # PASS=green, FAIL=red, FLAGGED=amber
├── e2e/
│   ├── fixtures/
│   ├── auth.spec.ts
│   ├── student.spec.ts
│   ├── admin.spec.ts
│   └── superadmin.spec.ts
├── tests/                        # (optional) non-e2e tests that don't fit karma
└── README.md
```

## Phase plan

Build in five phases. Each phase ends with a commit, an `ng test` run, a Playwright e2e run, and a short progress note in `PROGRESS.md` at the repo root. Don't move to the next phase until the current phase's e2e tests are green.

### Phase 0 — Skeleton (1 day)

- `npx -p @angular/cli@latest ng new apexeval-frontend --routing --style=scss --strict --standalone --skip-install`. Move the created directory to `../ApexEval-frontend/` and adjust.
- Add `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`, `provideRouter(routes, withComponentInputBinding())`, `provideAnimationsAsync()` in `app.config.ts`. **No `NgModule`s.**
- Add `@angular/material` via `ng add @angular/material`. Pick a custom theme that maps to the backend's status taxonomy: `--apexeval-status-pass: #1B873F; --apexeval-status-fail: #C0392B; --apexeval-status-flagged: #B7791F; --apexeval-status-running: #2B6CB0; --apexeval-status-queued: #718096;`. Use M3 token system, not M2.
- `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noFallthroughCasesInSwitch": true`, `"forceConsistentCasingInFileNames": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`. Build must typecheck with zero errors and zero `any` outside of typed third-party boundaries.
- ESLint flat config + Prettier. Add `npm run lint` and `npm run typecheck` scripts. Both pass on the empty starter.
- Add a root `AppComponent` that renders `<router-outlet>` inside a `<mat-sidenav-container>` (or just a centered `<router-outlet>` for the skeleton).
- Set up Karma (Angular default) and one smoke test for a `cn`-like helper in `core/utils/`.
- Set up Playwright: `npm i -D @playwright/test && npx playwright install --with-deps chromium`. One e2e that loads `/` and asserts the page renders.
- Add `.env.example` with placeholders: `API_BASE_URL`, `WS_URL`, `AUTH_STORAGE_KEY`, `MOCK_API=true`. Read via a typed `EnvironmentService` (not `process.env`).
- Add a root `README.md` with prereqs (Node 20+, Angular CLI 18+), setup, scripts, env vars, and a "where to read the API contract" link.
- Add `proxy.conf.json` to forward `/api/*` and `/ws/*` to `http://localhost:8080` during dev.
- Deliverable: `ng serve` works, `/` renders, all checks pass. **Merge as `feat/frontend-skeleton`.**

### Phase 1 — Auth + role guards + HTTP plumbing (2 days)

- Configure JWT auth. `AuthService` stores the token in `localStorage` (key from `EnvironmentService.authStorageKey`). On `sign-in`, the service calls `POST /api/auth/sign-in` (or mock), stores the JWT, and decodes its claims (`role`, `userId`, `courseIds`, `adminCourseIds`, `workspacePath`) into an `AppStore` signal.
- `authInterceptor` (functional `HttpInterceptorFn`): adds `Authorization: Bearer <token>`, handles 401 by clearing auth and redirecting to `/sign-in`. `errorInterceptor`: maps 4xx to typed `ApiError` and surfaces via a global toast service (`MatSnackBar`).
- Three route guards as standalone functions:
  - `superadminGuard: CanActivateFn` — checks `AppStore.role() === 'SUPERADMIN'`, else `router.parseUrl('/403')`.
  - `adminGuard: CanActivateFn` — `['ADMIN', 'SUPERADMIN']`.
  - `studentGuard: CanActivateFn` — `['STUDENT', 'ADMIN', 'SUPERADMIN']`.
- Lazy-load all three role-based route groups via `loadChildren`. Apply the corresponding guard on each group.
- Sign-in form: reactive form with email + password fields, `mat-form-field` with `<mat-error>` for inline validation, `aria-live="polite"` region for submit status. Submit button shows a `<mat-spinner>` while pending.
- Sign-out button in a `<app-user-menu>` (Angular Material menu) in the global header.
- Dark mode toggle (M3 `mat-slide-toggle` bound to a `prefers-color-scheme` + `localStorage` signal in `AppStore`).
- API service skeletons (`ApiService` base + per-feature services in `core/api/`): `AuthService`, `UsersService`, `CoursesService`, `AssignmentsService`, `SubmissionsService`, `AdminService`, `HealthService`. Each method takes typed input, returns `Observable<T>` of typed output, **uses an HTTP interceptor that maps `501 Not Implemented` to a mock-data fallback**.
- Tests: at least one Playwright test per role, asserting that a student gets a 403 on `/admin`, an admin gets a 403 on `/superadmin`, etc.
- Deliverable: working auth, role-based routing, HTTP service layer with mock-data fallback for unimplemented endpoints. **Merge as `feat/frontend-auth-http`.**

### Phase 2 — Student experience (3 days)

- `features/student/dashboard/` — "My courses" dashboard. Each course card shows title, instructor name, day-count, completion progress (X of Y assignments done). Built as a smart component that subscribes to `CoursesService.myCourses()` via `toSignal()`.
- `features/student/courses/[courseId]/` — course home. Day-by-day schedule grouped by `week × day`. Each day card lists its assignments with `StatusBadge` chips: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED_PASS`, `SUBMITTED_FAIL`, `FLAGGED`, `OVERRIDDEN`, `OVERDUE`. Vertical timeline with today highlighted using `mat-divider`.
- `features/student/courses/[courseId]/assignments/[assignmentId]/` — assignment detail. Two-column `<mat-grid-list>`:
  - Left: description (rendered from markdown via `ngx-markdown`), language allow-list, runtime limits, static-check rules preview (read-only — the student should see "we'll check for X", not the actual rule), due date, "best of N attempts" counter.
  - Right: Monaco editor (`ngx-monaco-editor-v2`) with the student's current code (or the starter template if first attempt). Action bar: "Submit" (primary), "Run static check" (secondary, calls `/api/static-check` only, no execution), "Save draft" (stores in `localStorage` keyed by `assignmentId`).
- Submit flow: a `SubmitService` handles the mutation. While pending, show a progress card with the four phases (build → test → static check → DB verify) — each flips to a checkmark/spinner as it completes via a Server-Sent Event stream (or, if SSE isn't ready, poll `submissions.getById` every 1.5 s). When the final result lands, navigate to the result detail route and celebrate appropriately (confetti for `PASS`, helpful diff for `FAIL`, "talk to your instructor" for `FLAGGED_FOR_REVIEW`).
- `features/student/courses/[courseId]/assignments/[assignmentId]/submissions/[submissionId]/` — **result detail**. The most important screen in the app. Renders:
  - Big status banner with the result taxonomy.
  - Per-test pass/fail list (the `executionResults.results` array). Failing tests show the `failureMessage` in a code block via `<pre>`; passing tests are collapsed into `<mat-expansion-panel>`.
  - Static analysis findings grouped into "Required" and "Suspicious" using `<mat-tab-group>`. Each finding is a card showing the rule name, message, and file/line/column — click to open the Monaco editor at that location with a transient highlight.
  - The git diff vs `lastTestedCommit` (the `diff` field), rendered via a `<app-diff-viewer>` component (use `diff2html` or a hand-rolled renderer). Additions in green, removals in red, line-numbered.
  - DB verification result if present.
  - "Resubmit" button (calls `submissions.reRun`).
- `features/student/history/` — global submission history. Filter by course, by assignment, by status. Pagination (cursor-based, page size 25) using `<mat-paginator>`. Inline sparkline of "pass-rate over time" using ngx-charts.
- Tests: end-to-end submit-and-see-result test (mock the backend response). The 1000-concurrent concern: profile the assignment page to confirm the initial render is under 100 KB JS and the request waterfall is parallel (don't sequentially fetch assignment then submissions then results — fork all in parallel with `forkJoin`).
- Deliverable: student can sign in, see courses, open an assignment, paste code, submit, see results with file/line feedback. **Merge as `feat/frontend-student`.**

### Phase 3 — Admin experience (3 days)

- `features/admin/dashboard/` — admin dashboard. "My courses" with quick links: roster, recent submissions, anomalies (submissions flagged for review).
- `features/admin/courses/` + `[courseId]/` — same shell as the student view, with a teacher toolbar: "Edit course", "Manage roster", "Publish assignment".
- `features/admin/courses/[courseId]/assignments/new/` — assignment creation form. Step-by-step wizard using `<mat-stepper>`:
  1. **Basics** — title, description (rich-text editor via `ngx-quill` or a simple markdown textarea, your call), due date, language.
  2. **Runtime** — image, memory/CPU/time limits (sliders with sensible defaults from the manifest schema).
  3. **Build & test** — two large text areas for `build.commands[]` and `test.commands[]`, with a "Dry-run in sample workspace" button.
  4. **Hidden tests** — drag-and-drop upload of a `.zip` containing the hidden-test directory using Angular CDK `DragDropModule`. After upload, the frontend calls `submissions.previewHiddenTest` which lists the files and shows a sample `make test` run on a fixture.
  5. **Static analysis** — multi-select of available rules from a catalog; free-form custom rules with severity.
  6. **Review & publish** — full preview, "Save as draft" or "Publish".
- `features/admin/courses/[courseId]/assignments/[assignmentId]/` — edit existing assignment. Same form, prefilled.
- `features/admin/courses/[courseId]/assignments/[assignmentId]/submissions/` — the **roster × submissions** matrix. Rows = students, columns = attempts. Cell color = status (M3 status colors). Click a cell to drill into that submission's full result. Filter by status, search by student name/email. CSV export button.
- `features/admin/courses/[courseId]/assignments/[assignmentId]/analytics/` — class-wide analytics. Charts via ngx-charts:
  - Pass-rate per assignment (bar chart, color-coded by threshold).
  - Time-to-submit histogram.
  - Most common static-analysis violations (top 10 bar chart).
  - Per-student "danger score" derived from FLAGGED count + late submissions.
- Grade override dialog: pick a submission → "Override to PASS/FAIL" → reason text (required, min 10 chars via `Validators.minLength(10)`) → confirm. Records the override in the audit log.
- Tests: full wizard completion test (mock backend). Override flow test. Roster × submissions filter test.
- Deliverable: admin can manage courses, create/publish assignments, drill into any submission, override grades, see class analytics. **Merge as `feat/frontend-admin`.**

### Phase 4 — Superadmin + observability (2 days)

- `features/superadmin/dashboard/` — operator dashboard. Top-level cards: active runners, queue depth, cache hit rate, p95 latency, sandbox error rate, total submissions in last 24h.
- `features/superadmin/admins/` — manage admins and superadmins. CRUD table with role selector. "Create admin" opens a form (email + initial password + which courses they manage). "Reset password" sends a magic link.
- `features/superadmin/platform/` — global config. Form fields: default Docker image per technology, runner concurrency per host, cache TTL, rate limits, feature flags. Save calls `admin.updatePlatformConfig`. All changes logged to the audit log.
- `features/superadmin/health/` — live system health. Use RxJS `timer(0, 5000)` with `switchMap` to `/api/health` for real-time charts. Three sections: per-runner stats (CPU, memory, queue depth), per-sandbox-image stats (failure rate, average runtime), and a "currently running" list with a cancel button per row.
- `features/superadmin/audit/` — audit log. Virtualized table using Angular CDK `cdk-virtual-scroll-viewport` for the 100k+ row range. Filters: actor, action type, time range, target id. Click to expand a row and see the JSON diff.
- `features/superadmin/submissions/` — every submission across every tenant. Read-only (superadmin cannot grade, only view). Search by student email, assignment id, status, content-hash. Force-purge-cache and force-rerun actions.
- Tests: superadmin role gate test, audit log pagination test (with 10k mocked rows), cache purge test.
- Deliverable: superadmin dashboard is functional. **Merge as `feat/frontend-superadmin`.**

### Phase 5 — Live updates, polish, accessibility (2 days)

- Implement the live-result WebSocket client at `core/ws/`. Use a single `WebSocket` per session to a `wss://.../ws/results` endpoint. On `runSubmitted` event, update the relevant RxJS subjects / signals. Exponential backoff reconnection. Heartbeat ping every 30 s; close the socket on tab hidden, reopen on visible.
- Empty states for every list: no courses, no assignments, no submissions. Each empty state has a one-line explanation and a primary action ("Ask your instructor to add you to a course" / "Create the first assignment" / etc).
- Loading states: every async surface has an `<app-skeleton>` placeholder. Use Angular Material's `<mat-progress-bar mode="indeterminate">` for top-of-page route loads. No layout shift on load.
- Error states: every async surface has a friendly error component with a "Retry" button. Toasts via `MatSnackBar` for transient errors.
- Accessibility audit: every interactive element has a visible focus ring (Material's default is fine but verify), every form has labels via `<mat-label>` + `for`, every dialog has `aria-modal` + `aria-labelledby` + focus trap (Material handles this), every chart has a text alternative, every color choice passes WCAG AA contrast in both light and dark mode. Run `axe-core` in Playwright e2e on the student dashboard, the submit page, and the result detail page.
- Performance: enable Angular's `optimizeFonts`, `outputHashing: 'all'`, `vendorChunk: 'separate'`. Lazy-load Monaco (it adds 300 KB) and ngx-charts (adds 200 KB) only on the routes that need them. Verify the initial bundle stays under 1 MB gzipped.
- Final pass: remove all `console.log`, all `// TODO` left in code, all `any` in `core/` and `shared/`. Add JSDoc to every exported function in `core/`. README updated with deployment instructions (`ng build --configuration production && serve dist/ApexEval-frontend/browser`).
- Deliverable: production-ready frontend, all phases green. **Tag `v1.0.0-frontend`.**

## Adding the missing backend endpoints

The frontend will need a small number of new endpoints that the current Spring Boot backend doesn't expose. **The frontend work is not blocked on the backend** — implement the frontend to call these endpoints, and document them as TODOs. Use a mock-data adapter layer so the frontend works in isolation.

The list:

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/sign-in` | POST | credentials or magic-link | public |
| `/api/auth/sign-out` | POST | invalidate session | any |
| `/api/auth/me` | GET | current session with role | any |
| `/api/users` | GET | list users (superadmin) | SUPERADMIN |
| `/api/users` | POST | create admin | SUPERADMIN |
| `/api/users/:id` | PATCH | update role / disable | SUPERADMIN |
| `/api/courses` | GET | list my courses | any |
| `/api/courses/:id` | GET | course detail with day-schedule | enrolled |
| `/api/courses/:id/roster` | GET | list enrolled students | ADMIN, SUPERADMIN |
| `/api/courses/:id/roster` | POST | enroll / unenroll student | ADMIN, SUPERADMIN |
| `/api/assignments` | GET | list my assignments | any |
| `/api/assignments` | POST | create | ADMIN, SUPERADMIN |
| `/api/assignments/:id` | GET | assignment detail | enrolled |
| `/api/assignments/:id` | PATCH | update | ADMIN, SUPERADMIN |
| `/api/assignments/:id/publish` | POST | flip draft → published | ADMIN, SUPERADMIN |
| `/api/assignments/:id/submissions` | GET | list submissions for assignment (roster × attempts) | ADMIN, SUPERADMIN |
| `/api/submissions` | GET | list my submissions (paginated) | STUDENT |
| `/api/submissions/:id` | GET | submission detail | owner, ADMIN, SUPERADMIN |
| `/api/submissions/:id/rerun` | POST | force cache bypass + re-execute | owner, ADMIN, SUPERADMIN |
| `/api/submissions/:id/override` | POST | grade override | ADMIN, SUPERADMIN |
| `/api/submissions/preview-hidden-test` | POST | run hidden test against a fixture | ADMIN, SUPERADMIN |
| `/api/platform/config` | GET / PATCH | global config | SUPERADMIN |
| `/api/health` | GET | runner / queue / cache stats | SUPERADMIN |
| `/api/audit` | GET | paginated audit log | SUPERADMIN |
| `/api/ws/results` | WS | live result updates for the caller's submissions | any |

The backend work is in scope for a follow-up. **Document each missing endpoint in `PROGRESS.md` under a "Backend TODOs blocking frontend" section**, with a clear "frontend has mock fallback" annotation. The mock adapter lives at `core/api/mock.ts` (or `core/api/mock.interceptor.ts`) and is selected by `environment.useMockApi === true` (default in dev).

## Visual / UX principles

- **The result detail page is the heart of the app.** When a student sees their submission come back, the screen should be unambiguous and instructive. No marketing copy, no "great job!" confetti unless the result is `PASS`. For `FAIL`, show the first failing test at the top, the static findings sorted by severity, and the diff vs the last passing attempt. For `FLAGGED_FOR_REVIEW`, show the suspicious findings and tell the student to talk to their instructor — do not show the diff (it might leak the answer).
- **No modal-on-modal.** `MatDialog` never stacks. A dialog opening from inside a `mat-menu` closes the menu first.
- **Optimistic updates** for any mutation the user can predict (toggle a flag, mark as read, reorder rows). Roll back on error with a `MatSnackBar`.
- **No surprise loading spinners** for sub-200-ms operations. Use a skeleton only for data the user actually needs before the next interaction.
- **Keyboard-first.** Every page is fully usable with the keyboard alone. `?` opens a help dialog listing every shortcut.
- **Empty state is a feature.** The first thing a new student sees should be "Welcome, here's how this works" with a 30-second guided tour, not a blank dashboard.

## Angular-specific hard rules (these are not negotiable)

- **`ChangeDetectionStrategy.OnPush` on every component.** Including Material wrappers we customize.
- **No `any` in `core/`, `shared/`, or feature services.** If a backend type is `unknown`, use `zod` to validate at the boundary and refine. If a third-party library forces `any`, wrap it in a typed adapter in `core/api/`.
- **No `console.log` in committed code.** Use a small `Logger` service backed by Angular's `inject(Injector)` pattern.
- **No `NgModule`s in new code.** Standalone components only. Existing `NgModule`s (from Material, third-party) get imported directly into the component that needs them.
- **No `BehaviorSubject` in `OnPush` components for state.** Use signals. RxJS is for async streams only.
- **No client-side secret access.** All backend URLs, API keys, etc. go through `EnvironmentService` which is `providedIn: 'root'` and read-only.
- **No `innerHTML` / `bypassSecurityTrustHtml` without `DomSanitizer`.** Editor previews are fine because Monaco handles them; anywhere else, sanitize. Monaco content rendered in templates goes through `[innerText]`, never `[innerHTML]`.
- **Every form must use `ReactiveFormsModule`.** No `ngModel` two-way binding for anything but the simplest internal toggles.
- **Every page must set `title` via `Title` service** (or `provideRouter`'s `withTitleStrategy` for declarative titles). Routes should have meaningful `data: { title: '...' }`.
- **Every dependency must be vetted**: is it actively maintained? compatible with Angular 18 standalone? tree-shakeable? Add it to `package.json` with a `^` range, never `*` or `latest`. Pin Angular framework packages to a single version (use `^18.x.x`).
- **Every component must have at least one test.** Trivial components get a smoke test ("renders without crashing").
- **Every API call must handle the three failure modes**: loading (skeleton), error (retry button), empty (helpful message).

## Reading order before you start

1. `/Users/archit/projectS/ApexEval/master_prompt.md` — the project-wide source of truth.
2. `/Users/archit/projectS/ApexEval/PROJECT_STATUS.md` — current state and known gaps.
3. `/Users/archit/projectS/ApexEval/SCALING_PLAN.md` — the target backend shape; design the WS layer and state model to match.
4. The four existing backend controllers (`RunTestController`, `DiffController`, `StaticCheckController`, `ExecuteController`) — to know exactly what the backend serves today.
5. `/Users/archit/projectS/ApexEval/backend/src/main/java/com/apexeval/backend/assignment/AssignmentManifest.java` — to understand the assignment shape (so the admin form matches the JSON schema).
6. `/Users/archit/projectS/ApexEval/backend/src/main/java/com/apexeval/backend/orchestration/RunTestResponse.java` — to know what fields the result detail page renders.

## Final check before each commit

- `npm run lint && npm run typecheck && npm test && npm run e2e` all pass.
- `ng build --configuration production` produces a clean build with no warnings.
- The new code is reachable from a real user flow — at least one Playwright test exercises it end-to-end.
- The new code is **role-gated** — no route can be reached by the wrong role.
- The new code is **keyboard-accessible** — Tab through the form works.
- The diff is focused — one phase per PR.

## Reference docs

- Angular standalone components: https://angular.dev/guide/components
- Angular signals: https://angular.dev/guide/signals
- Angular Material: https://material.angular.io/
- Angular Router: https://angular.dev/guide/routing
- Reactive Forms: https://angular.dev/guide/forms/reactive-forms
- Angular CDK: https://material.angular.io/cdk/categories
- Ngx-Monaco-Editor: https://github.com/ngstack/monaco-editor
- ngx-charts: https://swimlane.gitbook.io/ngx-charts
- Zod: https://zod.dev
- Playwright: https://playwright.dev/docs/intro
- axe-core: https://github.com/dequelabs/axe-core

You may consult these, but do not invent APIs that don't exist. If a library's API has changed since training, search the current docs before relying on it.

When you start, output a one-paragraph plan-of-attack for phase 0, then implement. Be explicit about every decision. Be skeptical of every shortcut. Ship something a real teacher and a real student would actually use.
