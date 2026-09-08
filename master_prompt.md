# Master Prompt: Continue ApexEval as a Technology-Agnostic Assignment Evaluation Platform

You are continuing development of **ApexEval**, an on-premise AI-assisted platform for evaluating coding assignments.

## Role

Act as a senior software architect and implementation engineer. Work carefully from the actual repository. Do not invent classes, APIs, database tables, configuration, or behavior that you have not inspected.

The current backend is Spring Boot. Keep Spring Boot as the main control-plane backend. Redesign the evaluation system incrementally so it can evaluate assignments written in multiple programming languages and frameworks without breaking existing Java and Spring Boot functionality.

## Repository

Repository:

```text
https://github.com/Arcsgit/ApexEval
```

Branch:

```text
main
```

Create a feature branch before modifying code:

```text
feature/runner-architecture
```

Do not push or create a pull request unless explicitly requested by the user.

## Product Goal

ApexEval should evaluate student assignments across technologies such as:

- Plain Java.
- Spring Boot.
- Python.
- Django.
- FastAPI.
- JavaScript.
- TypeScript.
- Express.
- React.
- Angular.
- C.
- C++.
- Go.
- Rust.
- C#.
- Other technologies that can be added through runners.

The system must support:

- Build and compilation.
- Unit tests.
- CLI tests.
- HTTP/API tests.
- Frontend/browser tests.
- Static analysis.
- Framework-specific checks.
- Diagnostics with file, line, and column when available.
- Deterministic execution-result caching.
- Student-specific feedback.
- Secure isolated execution of untrusted student code.

## Current Repository Facts

The repository currently contains a Spring Boot backend under:

```text
backend/src/main/java/com/apexeval/backend/
```

Important packages and classes currently present include:

```text
assignment/
dbverify/
diff/
execution/
    AssignmentConfig.java
    AssignmentRegistry.java
    ExecuteController.java
    ExecuteRequest.java
    ExecuteResponse.java
    ExecutionException.java
    ExecutionExceptionHandler.java
    ExecutionStrategy.java
    ExecutionStrategyResolver.java
    PlainJavaExecutionStrategy.java
    SpringBootExecutionStrategy.java
    TestResult.java
orchestration/
    CacheKey.java
    DeterministicResult.java
    InMemorySubmissionCache.java
    RunTestController.java
    RunTestRequest.java
    RunTestResponse.java
    RunTestService.java
    SourceContentHasher.java
    SubmissionCache.java
    SubmissionEvent.java
    WebhookEmitter.java
staticcheck/
```

The root also contains:

```text
docker-compose.yml
fixtures/
student-workspace/
workspaces/
backend/pom.xml
```

These facts are starting context only. Inspect all relevant files before making implementation decisions.

## Existing Evaluation Flow

The current system has an execution-strategy design:

```text
RunTestController
    ↓
RunTestService
    ├── source hashing
    ├── cache lookup
    ├── diff generation
    ├── static checks
    ├── execution strategy resolution
    ├── deterministic result handling
    └── response/webhook handling

ExecutionStrategyResolver
    ├── PlainJavaExecutionStrategy
    └── SpringBootExecutionStrategy
```

Treat the existing execution strategies as valuable working implementations. Do not delete or rewrite them during the first migration. Wrap them behind a new runner boundary.

## Target Architecture

The intended architecture is:

```text
Frontend/client
    ↓
Spring Boot API/control plane
    ├── authentication and authorization
    ├── student management
    ├── assignment management
    ├── evaluation-job management
    ├── runner selection
    ├── cache management
    ├── result persistence
    ├── score calculation
    ├── feedback generation
    └── sandbox orchestration
            ↓
        EvaluationRunner
            ├── JavaRunner
            │   ├── Plain Java profile
            │   └── Spring Boot profile
            ├── PythonRunner
            │   ├── Python profile
            │   ├── Django profile
            │   └── FastAPI profile
            ├── NodeRunner
            │   ├── JavaScript profile
            │   ├── TypeScript profile
            │   ├── Express profile
            │   ├── React profile
            │   └── Angular profile
            └── NativeRunner
                ├── C profile
                └── C++ profile
                    ↓
              SandboxExecutor
                    ↓
          Docker/container or worker execution
```

Spring Boot is the control plane. It must not contain hard-coded assumptions that every project uses Java, Maven, JUnit, or JavaParser.

## Architectural Principles

1. **Incremental migration.** Preserve existing behavior first.
2. **Spring Boot remains the main backend.** Do not replace it merely because submitted code can use other languages.
3. **Runners own technology-specific behavior.** Build commands, test commands, parsers, source analysis, and runtime setup belong to runners or profiles.
4. **The control plane owns orchestration.** Requests, jobs, cache lookup, persistence, scoring, and response shaping remain technology-neutral.
5. **Untrusted code must be isolated.** Never execute arbitrary student commands directly on the host or inside the Spring Boot JVM in production.
6. **Assignment configuration is authoritative.** Do not infer dangerous commands from untrusted student files.
7. **Shared execution results must be deterministic.** Cache keys must include assignment/test/runtime/build versions.
8. **Student-specific diagnostics must be recomputed.** Do not reuse another student’s line/column/evidence data merely because execution results were reused.
9. **Do not use one universal source parser.** Use language-specific adapters or tokenizers.
10. **Do not confuse semantic similarity with execution equivalence.** Keep separate fingerprints for execution caching and plagiarism/similarity analysis.

## Required Migration Phases

### Phase 0: Repository inspection

Before editing:

- Inspect the complete repository tree.
- Read `pom.xml`.
- Read `docker-compose.yml`.
- Read the application entry point.
- Read all classes in `execution`, `orchestration`, `assignment`, `diff`, `staticcheck`, and `dbverify`.
- Identify database configuration and persistence.
- Identify API endpoints and request/response formats.
- Identify existing tests.
- Identify all direct process execution and shell-command code.
- Identify how workspaces are created and validated.
- Identify how cache keys and deterministic results are currently formed.
- Produce a migration map before changing behavior.

### Phase 1: Introduce common contracts

Add technology-neutral contracts without changing existing behavior:

```text
technology/Technology.java
technology/Framework.java
technology/EvaluationMode.java
runner/ProjectDescriptor.java
runner/RunnerContext.java
runner/EvaluationRunner.java
runner/RunnerResult.java
runner/EvaluationRunnerRegistry.java
```

Use the actual project package conventions after inspection.

Suggested enums:

```java
public enum Technology {
    JAVA,
    PYTHON,
    JAVASCRIPT,
    TYPESCRIPT,
    C,
    CPP,
    GO,
    RUST,
    C_SHARP,
    RUBY,
    PHP,
    UNKNOWN
}
```

```java
public enum Framework {
    NONE,
    SPRING_BOOT,
    DJANGO,
    FAST_API,
    EXPRESS,
    REACT,
    ANGULAR,
    UNKNOWN
}
```

```java
public enum EvaluationMode {
    FUNCTION,
    CLI,
    HTTP_API,
    FRONTEND,
    STATIC_ANALYSIS,
    INTEGRATION,
    END_TO_END
}
```

Suggested runner contract:

```java
public interface EvaluationRunner {

    String id();

    boolean supports(
            ProjectDescriptor project,
            EvaluationRequest request
    );

    RunnerResult evaluate(
            ProjectDescriptor project,
            EvaluationRequest request,
            RunnerContext context
    );
}
```

Adapt the signatures to existing types instead of blindly copying them.

### Phase 2: Wrap current Java behavior

Create `JavaRunner` and delegate to the existing:

```text
ExecutionStrategyResolver
PlainJavaExecutionStrategy
SpringBootExecutionStrategy
```

The target flow is:

```text
RunTestService
    ↓
EvaluationRunnerRegistry
    ↓
JavaRunner
    ↓
ExecutionStrategyResolver
    ├── PlainJavaExecutionStrategy
    └── SpringBootExecutionStrategy
```

At the end of this phase:

- Existing Java assignments still work.
- Existing Spring Boot assignments still work.
- Existing endpoints remain compatible.
- Existing tests pass.
- Cache behavior remains correct.

### Phase 3: Move orchestration to the runner boundary

Modify `RunTestService` only after the Java runner adapter works.

The service should:

1. Validate the request.
2. Resolve assignment configuration.
3. Build a technology/framework/project descriptor.
4. Build a complete cache key.
5. Check the shared deterministic execution cache.
6. Run student-specific diff/static checks as required.
7. Resolve a runner.
8. Execute the runner on cache miss.
9. Store only reusable deterministic results.
10. Combine reused execution results with current student diagnostics.
11. Return the existing response shape where possible.

### Phase 4: Introduce sandbox abstraction

Add:

```text
sandbox/SandboxExecutor.java
sandbox/LocalSandboxExecutor.java
sandbox/DockerSandboxExecutor.java
sandbox/SandboxLimits.java
```

Suggested contract:

```java
public interface SandboxExecutor {

    SandboxResult execute(
            SandboxRequest request
    );
}
```

A production sandbox must support:

- Timeouts.
- CPU limits.
- Memory limits.
- Process limits.
- Output-size limits.
- Non-root execution.
- Restricted filesystem.
- Network disabled by default.
- Temporary workspace isolation.
- Cleanup after execution.
- No host secrets.
- No Docker socket exposure to student code.

Use `LocalSandboxExecutor` only for controlled development if needed. The production path should use a hardened container or worker environment.

### Phase 5: Add runner families

Implement in this order:

```text
JavaRunner
PythonRunner
NodeRunner
NativeRunner
```

Frameworks should be profiles, not duplicated evaluators:

```text
Spring Boot → JavaRunner
Django/FastAPI → PythonRunner
React/Angular/Express → NodeRunner
C/C++ → NativeRunner
```

Do not implement all frameworks in one change. Add one runner, tests, documentation, and a sample fixture at a time.

## Assignment Manifest

Assignments should eventually declare technology-neutral configuration such as:

```json
{
  "assignmentId": "todo-app-v1",
  "technology": "python",
  "framework": "fastapi",
  "evaluationMode": "http_api",
  "runtime": {
    "image": "python:3.13",
    "version": "3.13"
  },
  "build": {
    "command": ["python", "-m", "compileall", "."]
  },
  "test": {
    "command": ["pytest", "-q"]
  },
  "limits": {
    "timeoutSeconds": 60,
    "memoryMb": 1024,
    "cpu": 2,
    "maxOutputBytes": 1000000
  },
  "hiddenTests": {
    "version": "1"
  }
}
```

Commands must be assignment-authored and validated. Never allow a student request to provide arbitrary host commands.

Do not force this manifest into the database until the current schema and assignment model have been inspected. First identify the least disruptive migration.

## Technology Support Strategy

### Java and Spring Boot

Use the existing Java strategies inside `JavaRunner`.

Technology-specific responsibilities:

- Maven/Gradle execution.
- Java compilation.
- JUnit result parsing.
- JavaParser static analysis.
- Spring Boot startup and integration tests.
- Java diagnostics.

### Python

Use Python-specific execution and analysis.

- Build: compile/import validation.
- Tests: pytest or assignment-declared test command.
- Static analysis: Python `ast`, Ruff, or assignment-approved tools.
- Preserve indentation semantics.
- Do not remove whitespace indiscriminately.

### JavaScript and TypeScript

Use a Node runner.

- npm/pnpm/yarn must be assignment-configured.
- Include lockfile hashes.
- Support Jest, Vitest, Mocha, Playwright, or assignment-declared tests.
- Preserve template-literal and JSX text semantics.
- Exclude `node_modules`, build output, coverage, and caches from source discovery.

### React and Angular

Treat them as frontend profiles over `NodeRunner`.

- Build the application.
- Run component/unit tests.
- Run browser tests with Playwright when required.
- For Angular, support Angular CLI projects.
- For React, support JSX/TSX projects.
- Do not treat all HTML/JSX whitespace as ignorable because rendered whitespace can be visible.

### Express

Treat Express as a Node HTTP/API profile.

- Install from a lockfile.
- Start the server inside the sandbox.
- Wait for a health/readiness condition.
- Run HTTP tests.
- Kill the server and clean up.

### C and C++

Use native runners with GCC or Clang.

- Support Make/CMake where declared.
- Use compiler flags from trusted assignment configuration.
- Consider sanitizers.
- Include compiler version, flags, preprocessor definitions, and relevant include hashes in the cache identity.

### Other technologies

Add new runners through the same contract. Do not add technology-specific branches throughout `RunTestService`.

## Cache Requirements

The cache is for deterministic reusable computation, not for student identity.

The cache key should eventually include:

```text
assignmentId
assignmentVersion
technology
framework
evaluationMode
canonicalExecutionSourceHash
dependencyLockHash
buildConfigurationHash
testSuiteVersion
runnerId
runnerVersion
runtimeImageDigest
compiler/interpreter version
evaluatorVersion
```

Do not include:

```text
studentId
student workspace path
student submission ID
```

The execution hash must:

- Ignore formatting that does not affect execution.
- Preserve identifiers and literal values.
- Ignore comments only when safe for the execution identity.
- Preserve string, character, template-literal, JSX-text, and Python indentation semantics.
- Be language-specific.

For Java specifically, these should share an execution hash:

```java
if (movies.isEmpty()) System.out.println("Watchlist is empty");
else System.out.println("Number of movies in watchlist: " + movies.size());
```

```java
if (movies.isEmpty()) {
    System.out.println("Watchlist is empty");
} else {
    System.out.println(
            "Number of movies in watchlist: " + movies.size()
    );
}
```

Do not achieve this with `source.replaceAll("\\s+", "")`. Use Java-aware parsing or tokenization and explicitly handle optional control-flow blocks.

Keep separate fingerprints:

```text
executionHash
    Used for safe deterministic execution reuse.

sourceIdentityHash
    Used when exact/minimally normalized source identity matters.

similarityHash
    Optional structural similarity/plagiarism analysis.
    Must not be used as an execution-cache key.
```

## Student-Specific Result Rules

When a shared execution cache hit occurs:

- Reuse deterministic test/build results only if the full cache key matches.
- Recompute current student diff.
- Recompute current student static diagnostics where locations/evidence matter.
- Never return another student’s file path, line, column, or source snippet.
- Preserve the current student’s workspace and response identity.

## Security Requirements

Student code is untrusted.

Never:

- Execute student-provided shell commands directly on the host.
- Mount host root directories.
- Mount `/var/run/docker.sock` inside student containers.
- Pass backend secrets into runner environments.
- Permit unrestricted network by default.
- Trust student-provided image names.
- Trust student-provided resource limits.
- Use path strings without canonicalization and containment validation.
- Allow workspace escape through symlinks.

The assignment configuration must control:

- Runtime image.
- Commands.
- Environment variables.
- Test mode.
- Timeouts.
- Resource limits.
- Service dependencies.

## Testing Requirements

For every migration step, add or update tests.

Required regression tests include:

- Existing plain Java assignment still evaluates successfully.
- Existing Spring Boot assignment still evaluates successfully.
- Java formatting-only changes produce the same execution hash.
- Java optional control-flow braces produce the same execution hash.
- Meaningful Java changes produce different execution hashes.
- Changed literals produce different execution hashes.
- Changed identifiers remain distinct for execution caching.
- Student-specific diagnostics are not reused from cache.
- Different hidden-test versions invalidate the cache.
- Different runner versions invalidate the cache.
- Different dependency lockfiles invalidate the cache.
- Unsupported technologies fail with a clear error.
- Path traversal is rejected.
- Execution timeout is enforced.
- Output limits are enforced.
- Sandbox cleanup occurs after success and failure.

For future runners:

```text
Python AST normalization tests
Node/TypeScript/JSX normalization tests
C/C++ compiler configuration tests
React browser-evaluation fixture
Angular browser-evaluation fixture
Express HTTP-evaluation fixture
```

## Working Method

Before each implementation step:

1. Inspect the relevant files.
2. Explain the current behavior briefly.
3. Identify the smallest safe change.
4. Implement only that change.
5. Run the relevant tests/build.
6. Report changed files and verification results.
7. Do not continue to the next architectural phase until the current phase passes.

When code does not compile because a method signature differs from an example, inspect the real class and adapt to it. Do not invent overloads without checking existing callers.

When a requested implementation could break existing behavior, preserve backward compatibility and explain the migration path.

## First Task

Start by inspecting the actual repository, especially:

```text
backend/pom.xml
backend/src/main/java/com/apexeval/backend/execution/ExecutionStrategy.java
backend/src/main/java/com/apexeval/backend/execution/ExecutionStrategyResolver.java
backend/src/main/java/com/apexeval/backend/execution/PlainJavaExecutionStrategy.java
backend/src/main/java/com/apexeval/backend/execution/SpringBootExecutionStrategy.java
backend/src/main/java/com/apexeval/backend/orchestration/RunTestService.java
backend/src/main/java/com/apexeval/backend/orchestration/SourceContentHasher.java
backend/src/main/java/com/apexeval/backend/orchestration/CacheKey.java
backend/src/main/java/com/apexeval/backend/orchestration/SubmissionCache.java
backend/src/main/java/com/apexeval/backend/orchestration/InMemorySubmissionCache.java
docker-compose.yml
```

Then provide:

1. A concise current-architecture map.
2. A list of Java-specific assumptions.
3. A migration plan tied to exact files.
4. The smallest first implementation patch.
5. Tests to run before and after the patch.

Do not implement every runner immediately. The first implementation milestone is only:

```text
Introduce the runner abstraction and wrap the existing Java/Spring Boot strategies without changing externally visible behavior.
```
