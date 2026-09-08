-- V1: Core schema for ApexEval.
--
-- This migration is idempotent-by-version: re-running it is a no-op
-- because the file is versioned. If you need to change the schema, add
-- a V2__...sql file; never edit this one after it has been applied
-- to a production database.
--
-- The schema mirrors SCALING_PLAN.md §"Database (PostgreSQL 15)".

-- gen_random_uuid() lives in pgcrypto, which is built into modern Postgres.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- citext gives us case-insensitive email without writing LOWER() everywhere.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- Users & RBAC
-- ---------------------------------------------------------------------

CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT       UNIQUE NOT NULL,
    display_name    TEXT         NOT NULL,
    -- Three roles. The frontend Angular app maps these to route guards.
    --   SUPERADMIN: operator of the platform itself
    --   ADMIN:      instructor / course staff
    --   STUDENT:    end user
    role            TEXT         NOT NULL
                    CHECK (role IN ('SUPERADMIN', 'ADMIN', 'STUDENT')),
    -- For STUDENT: the absolute path to the student's git workspace.
    -- For ADMIN/SUPERADMIN: NULL (admins don't have a workspace).
    -- The RunTestService rejects requests whose request.workspacePath
    -- does not match the JWT's workspacePath. See SCALING_PLAN.md §Auth.
    workspace_path  TEXT,
    is_disabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- The bcrypt/argon2 hash. NULL only when the user is created
    -- via a magic-link flow that hasn't yet completed first sign-in.
    password_hash   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ
);
CREATE INDEX idx_users_role ON users(role) WHERE NOT is_disabled;

-- ---------------------------------------------------------------------
-- Courses & day-schedule
-- ---------------------------------------------------------------------

CREATE TABLE courses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT         NOT NULL,
    description TEXT,
    starts_on   DATE         NOT NULL,
    ends_on     DATE         NOT NULL,
    created_by  UUID         NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- The course must have at least one day. Enforced at the application
    -- layer (a course without days has no place to publish assignments).
    CHECK (ends_on >= starts_on)
);

-- A course's day-wise schedule. day_index is 0-based within the course
-- so the front-end can render "Week 1, Day 2" without parsing dates.
CREATE TABLE course_days (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    day_index     INT  NOT NULL,
    scheduled_for DATE NOT NULL,
    -- The student app groups days by week; this is computed at the
    -- application layer (no need to store a week_index that drifts on
    -- timezone changes).
    UNIQUE (course_id, day_index),
    UNIQUE (course_id, scheduled_for),
    CHECK (day_index >= 0)
);
CREATE INDEX idx_course_days_course ON course_days(course_id, day_index);

-- Enrollments. Composite primary key gives us idempotent inserts.
CREATE TABLE course_enrollments (
    course_id   UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- The role this user plays in the course. A single user might be
    -- an ADMIN in one course and a STUDENT in another.
    course_role TEXT         NOT NULL
                 CHECK (course_role IN ('STUDENT', 'ASSISTANT', 'INSTRUCTOR')),
    PRIMARY KEY (course_id, user_id)
);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);

-- ---------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------

CREATE TABLE assignments (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title             TEXT         NOT NULL,
    description_md    TEXT,
    -- The 'technology' from AssignmentManifest.java (e.g. JAVA, PYTHON).
    language          TEXT         NOT NULL,
    -- The full AssignmentManifest as JSONB. The hidden test paths, build
    -- commands, etc. all live in here. See AssignmentManifest.java.
    manifest          JSONB        NOT NULL,
    -- Where the hidden test bundle lives. For now: a relative path under
    -- apexeval.fixtures.base-path. Later: an S3 URL or a git URL.
    hidden_tests_path TEXT,
    -- NULL while a draft. Set when the admin clicks "publish".
    published_at      TIMESTAMPTZ,
    due_at            TIMESTAMPTZ,
    created_by        UUID         NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (published_at IS NULL OR published_at >= created_at)
);
CREATE INDEX idx_assignments_course ON assignments(course_id, published_at DESC NULLS LAST);
CREATE INDEX idx_assignments_published ON assignments(published_at)
    WHERE published_at IS NOT NULL;

-- Which course day(s) an assignment belongs to. One assignment can
-- span multiple days, but typically it's exactly one.
CREATE TABLE assignment_days (
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    course_day_id UUID NOT NULL REFERENCES course_days(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, course_day_id)
);
CREATE INDEX idx_assignment_days_day ON assignment_days(course_day_id);

-- ---------------------------------------------------------------------
-- Submissions & results
-- ---------------------------------------------------------------------
--
-- The content-addressed cache key is (assignment_id, source_hash). The
-- source_hash is the SHA-256 of the canonicalised source produced by
-- SourceContentHasher / GenericSourceContentHasher. It deliberately
-- excludes workspace_path / student identity so identical submissions
-- from different students share a single cached result. See
-- SCALING_PLAN.md §Layer 2.

CREATE TABLE submissions (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id       UUID         NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_hash         TEXT         NOT NULL,
    -- The lifecycle: QUEUED -> RUNNING -> (PASS|FAIL|FLAGGED|ERROR).
    -- OVERRIDDEN_PASS / OVERRIDDEN_FINAL are set when an admin override
    -- happens after the original status was already recorded.
    status              TEXT         NOT NULL
                        CHECK (status IN (
                            'QUEUED','RUNNING','PASS','FAIL','FLAGGED',
                            'ERROR','OVERRIDDEN_PASS','OVERRIDDEN_FAIL'
                        )),
    queued_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    duration_ms         INT,
    -- The full RunTestResponse payload as JSONB. Lets us reconstruct
    -- the result-detail page after the fact without re-running.
    payload             JSONB,
    -- If a human overrode the auto-status:
    override_reason     TEXT,
    overridden_by       UUID         REFERENCES users(id),
    overridden_at       TIMESTAMPTZ,
    -- Last commit SHA the student was on when this submission was made.
    -- Used to power the "diff vs last submission" view.
    last_tested_commit  TEXT,
    CHECK (
        (started_at IS NULL OR started_at >= queued_at)
        AND (finished_at IS NULL OR finished_at >= started_at)
    )
);
-- Common query: "show me the last 20 submissions for this student on
-- this assignment". Cover that exact shape.
CREATE INDEX idx_submissions_user_assignment
    ON submissions(user_id, assignment_id, queued_at DESC);
-- "Show me all PASS/FAIL/FLAGGED for this assignment, paginated".
CREATE INDEX idx_submissions_assignment_status
    ON submissions(assignment_id, status, queued_at DESC);
-- The cache key. Submissions with the same (assignment_id, source_hash)
-- should collapse to a single cached result. Note this is NOT a
-- unique index — the same student (or different students) can submit
-- the same code multiple times; we just want fast lookups.
CREATE INDEX idx_submissions_cache_key
    ON submissions(assignment_id, source_hash);

-- ---------------------------------------------------------------------
-- Static findings (denormalized for query speed)
-- ---------------------------------------------------------------------
--
-- The static analyzer emits one row per finding per submission. The
-- RunTestResponse.staticCheck object in the payload is the source of
-- truth; this table is for fast queries ("which assignments have
-- students missing type hints?").

CREATE TABLE submission_findings (
    id              BIGSERIAL    PRIMARY KEY,
    submission_id   UUID         NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    kind            TEXT         NOT NULL
                    CHECK (kind IN ('REQUIRED', 'SUSPICIOUS')),
    rule            TEXT         NOT NULL,
    file            TEXT,
    line            INT,
    "column"        INT,
    symbol          TEXT,
    message         TEXT         NOT NULL,
    satisfied       BOOLEAN       NOT NULL
);
CREATE INDEX idx_findings_submission ON submission_findings(submission_id);
-- "Top violated rules across all submissions" type queries.
CREATE INDEX idx_findings_rule ON submission_findings(rule, satisfied);

-- ---------------------------------------------------------------------
-- Cache entries (the persisted side of the SubmissionCache)
-- ---------------------------------------------------------------------
--
-- The Redis cache is the hot path; this table is the durable backing
-- store. A background job (or a fallback path) reconciles them. The
-- write-through happens in RunTestService.

CREATE TABLE cache_entries (
    assignment_id   UUID         NOT NULL,
    source_hash     TEXT         NOT NULL,
    -- The full DeterministicResult JSON-serialised. We re-construct the
    -- record on read; nothing about this is opaque to SQL.
    payload         JSONB        NOT NULL,
    computed_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- For TTL support without cron jobs: a query `WHERE expires_at > now()`
    -- can be used by a sweeper, or a partial index can exclude expired.
    expires_at      TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (assignment_id, source_hash)
);
CREATE INDEX idx_cache_entries_expires ON cache_entries(expires_at);

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
--
-- Every privileged action (admin override, user create/disable,
-- assignment publish, platform config change) is recorded here. The
-- superadmin /audit page is read-only against this table.

CREATE TABLE audit_events (
    id          BIGSERIAL    PRIMARY KEY,
    actor_id    UUID         NOT NULL REFERENCES users(id),
    action      TEXT         NOT NULL,
    target_type TEXT,
    target_id   UUID,
    details     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor_time ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_events(target_type, target_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Seed data for development & demo deployments
-- ---------------------------------------------------------------------
--
-- A single superadmin with email [email protected] and password
-- "change-me-in-production". Bcrypt hash is for "admin123" (cost 10).
-- Insert only if no users exist yet, so re-running on a populated
-- database is a no-op.

INSERT INTO users (email, display_name, role, password_hash)
SELECT '[email protected]', 'Default Superadmin', 'SUPERADMIN',
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92YYreuV6QW8g5gZ6k9.K'
WHERE NOT EXISTS (SELECT 1 FROM users);
