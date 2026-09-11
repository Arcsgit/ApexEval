package com.apexeval.backend.orchestration;

import com.apexeval.backend.assignment.AssignmentManifest;
import com.apexeval.backend.assignment.AssignmentManifestRepository;
import com.apexeval.backend.assignment.SubmissionStore;
import com.apexeval.backend.dbverify.DbVerificationResult;
import com.apexeval.backend.dbverify.DbVerificationStrategy;
import com.apexeval.backend.diff.DiffResponse;
import com.apexeval.backend.diff.GitDiffService;
import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.execution.ExecutionException;
import com.apexeval.backend.execution.ExecutionStrategyResolver;
import com.apexeval.backend.execution.TestResult;
import com.apexeval.backend.runner.EvaluationRunner;
import com.apexeval.backend.runner.EvaluationRunnerRegistry;
import com.apexeval.backend.runner.ProjectDescriptor;
import com.apexeval.backend.runner.RunnerContext;
import com.apexeval.backend.runner.RunnerResult;
import com.apexeval.backend.staticcheck.StaticAnalyzer;
import com.apexeval.backend.staticcheck.StaticAnalyzerRegistry;
import com.apexeval.backend.staticcheck.StaticCheckResponse;
import com.apexeval.backend.staticcheck.StaticCheckService;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.EvaluationMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RunTestService {

    private static final Logger log = LoggerFactory.getLogger(RunTestService.class);

    private final GitDiffService gitDiffService;
    private final ExecutionStrategyResolver executionResolver;
    private final DbVerificationStrategy dbVerificationStrategy;
    private final StaticCheckService staticCheckService;
    private final StaticAnalyzerRegistry staticAnalyzerRegistry;
    private final SubmissionCache submissionCache;
    private final SourceContentHasher sourceContentHasher;
    private final GenericSourceContentHasher genericSourceContentHasher;
    private final WebhookEmitter webhookEmitter;
    private final AssignmentManifestRepository manifestRepository;
    private final EvaluationRunnerRegistry runnerRegistry;
    private final SubmissionStore submissionStore;
    private final String fixturesBasePath;

    public RunTestService(
            GitDiffService gitDiffService,
            ExecutionStrategyResolver executionResolver,
            DbVerificationStrategy dbVerificationStrategy,
            StaticCheckService staticCheckService,
            StaticAnalyzerRegistry staticAnalyzerRegistry,
            SubmissionCache submissionCache,
            SourceContentHasher sourceContentHasher,
            GenericSourceContentHasher genericSourceContentHasher,
            WebhookEmitter webhookEmitter,
            AssignmentManifestRepository manifestRepository,
            EvaluationRunnerRegistry runnerRegistry,
            SubmissionStore submissionStore,
            @org.springframework.beans.factory.annotation.Value("${apexeval.fixtures.base-path}") String fixturesBasePath
    ) {
        this.gitDiffService = gitDiffService;
        this.executionResolver = executionResolver;
        this.dbVerificationStrategy = dbVerificationStrategy;
        this.staticCheckService = staticCheckService;
        this.staticAnalyzerRegistry = staticAnalyzerRegistry;
        this.submissionCache = submissionCache;
        this.sourceContentHasher = sourceContentHasher;
        this.genericSourceContentHasher = genericSourceContentHasher;
        this.webhookEmitter = webhookEmitter;
        this.manifestRepository = manifestRepository;
        this.runnerRegistry = runnerRegistry;
        this.submissionStore = submissionStore;
        this.fixturesBasePath = fixturesBasePath;
    }

    public RunTestResponse run(RunTestRequest request) {
        AssignmentManifest manifest = manifestRepository.findById(request.getAssignmentId());
        Technology technology = manifest.getTechnology();
        Framework framework = manifest.getFramework() != null ? manifest.getFramework() : Framework.NONE;

        DiffResponse diff = gitDiffService.computeDiff(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getLastTestedCommit()
        );

        StaticCheckResponse staticCheck = runStaticCheck(
                manifest, request.getWorkspacePath(), request.getAssignmentPath()
        );
        
        String sourceHash;
        if (technology == Technology.JAVA) {
            sourceHash = sourceContentHasher.hashStudentSources(
                    request.getWorkspacePath(),
                    request.getAssignmentPath()
            );
        } else {
            sourceHash = genericSourceContentHasher.hashStudentSources(
                    request.getWorkspacePath(),
                    request.getAssignmentPath(),
                    technology
            );
        }
        CacheKey cacheKey = new CacheKey(request.getAssignmentId(), sourceHash);

        Optional<DeterministicResult> cached = submissionCache.get(cacheKey);
        ExecuteResponse execution;
        DbVerificationResult dbVerification;

        if (cached.isPresent()) {
            log.info("Execution cache hit: assignmentId={}, assignmentPath={}, sourceHash={}",
                    request.getAssignmentId(), request.getAssignmentPath(), sourceHash);
            execution = cached.get().executionResults();
            dbVerification = cached.get().dbVerification();
        } else {
            log.info("Execution cache miss: assignmentId={}, assignmentPath={}, sourceHash={}",
                    request.getAssignmentId(), request.getAssignmentPath(), sourceHash);

            try {
                if (technology == Technology.JAVA) {
                    execution = executionResolver.executeFor(
                            request.getWorkspacePath(),
                            request.getAssignmentPath(),
                            request.getAssignmentId()
                    );
                } else {
                    ProjectDescriptor project = buildProjectDescriptor(manifest);
                    RunnerContext context = new RunnerContext(
                            request.getWorkspacePath(),
                            request.getAssignmentPath(),
                            fixturesBasePath,
                            manifest.getLimits() != null ? Map.of(
                                    "timeoutSeconds", manifest.getLimits().getTimeoutSeconds(),
                                    "memoryMb", manifest.getLimits().getMemoryMb(),
                                    "cpuCores", manifest.getLimits().getCpuCores()
                            ) : Map.of()
                    );

                    Optional<EvaluationRunner> runnerOpt = runnerRegistry.resolve(project);
                    if (runnerOpt.isEmpty()) {
                        throw new IllegalStateException("No runner found for technology: " + technology);
                    }
                    EvaluationRunner runner = runnerOpt.get();
                    RunnerResult runnerResult = runner.evaluate(project, context);

                    execution = convertRunnerResultToExecuteResponse(runnerResult);
                }
            } catch (ExecutionException e) {
                // A compile/build/runtime failure is a legitimate graded outcome
                // (FAIL), not a server error - record it as such rather than
                // surfacing a bare 400 that never makes it into submission history.
                log.info("Execution failed for assignmentId={}: {}", request.getAssignmentId(), e.getMessage());
                execution = new ExecuteResponse(
                        List.of(new TestResult("Compilation failure", false, e.getMessage())), 0
                );
            }

            dbVerification = dbVerificationStrategy.verify(
                    request.getWorkspacePath(),
                    request.getAssignmentId()
            );
            submissionCache.put(cacheKey, new DeterministicResult(execution, dbVerification));
        }

        String status = determineStatus(execution, dbVerification, staticCheck);
        System.out.println("DEBUG executionResults=" + execution.getResults());
        System.out.println("DEBUG dbVerificationApplicable=" + dbVerification.isApplicable());
        System.out.println("DEBUG dbVerificationPassed=" + dbVerification.getPassed());
        System.out.println("DEBUG staticCheckMissing=" + staticCheck.hasMissingRequirements());
        System.out.println("DEBUG staticCheckSuspicious=" + staticCheck.hasSuspiciousPatterns());
        RunTestResponse response = new RunTestResponse(
                diff, execution, dbVerification, staticCheck, status
        );
        response.setSubmissionId(submissionStore.recordFromRunTest(request, response, manifest));
        webhookEmitter.emit(new SubmissionEvent(
                request.getWorkspacePath(), request.getAssignmentId(), status
        ));
        return response;
    }

    private StaticCheckResponse runStaticCheck(
            AssignmentManifest manifest,
            String workspacePath,
            String assignmentPath
    ) {
        Technology technology = manifest.getTechnology();
        Framework framework = manifest.getFramework() != null ? manifest.getFramework() : Framework.NONE;

        Optional<StaticAnalyzer> analyzer = staticAnalyzerRegistry.resolve(technology, framework);
        if (analyzer.isPresent()) {
            ProjectDescriptor project = buildProjectDescriptor(manifest);
            RunnerContext context = new RunnerContext(
                    workspacePath,
                    assignmentPath,
                    fixturesBasePath,
                    manifest.getLimits() != null ? Map.of(
                            "timeoutSeconds", manifest.getLimits().getTimeoutSeconds(),
                            "memoryMb", manifest.getLimits().getMemoryMb(),
                            "cpuCores", manifest.getLimits().getCpuCores()
                    ) : Map.of()
            );
            return analyzer.get().analyze(project, context);
        }

        // Fallback for any technology that has no registered analyzer: the
        // legacy Java-only StaticCheckService. This preserves existing
        // behavior for Java (whose JavaStaticAnalyzer is the registered
        // analyzer anyway) and gives non-tech-covered assignments a sane
        // default instead of throwing.
        log.debug("No static analyzer registered for {}/{} - falling back to Java StaticCheckService",
                technology, framework);
        return staticCheckService.check(workspacePath, assignmentPath, manifest.getAssignmentId());
    }

    private ProjectDescriptor buildProjectDescriptor(AssignmentManifest manifest) {
        String assignmentId = manifest.getAssignmentId();
        Technology technology = manifest.getTechnology();
        Framework framework = manifest.getFramework();
        EvaluationMode evaluationMode = manifest.getEvaluationMode();

        String dockerImage = manifest.getRuntime() != null ? manifest.getRuntime().getImage() : "apexeval/student-workspace:latest";
        String buildCommand = (manifest.getBuild() != null && manifest.getBuild().getCommands() != null && !manifest.getBuild().getCommands().isEmpty())
                ? manifest.getBuild().getCommands().get(0) : "";
        String testCommand = (manifest.getTest() != null && manifest.getTest().getCommands() != null && !manifest.getTest().getCommands().isEmpty())
                ? manifest.getTest().getCommands().get(0) : "";

        // envVars are consumed by runners / static analyzers. The hidden-test
        // path is the most important one - every runner needs it to copy the
        // fixture-side hidden test into the sandbox at execution time.
        java.util.HashMap<String, String> envVars = new java.util.HashMap<>();
        if (manifest.getHiddenTests() != null && manifest.getHiddenTests().getPath() != null) {
            envVars.put("hiddenTestPath", manifest.getHiddenTests().getPath());
        }
        if (manifest.getHiddenTests() != null && manifest.getHiddenTests().getTestClass() != null) {
            envVars.put("hiddenTestClass", manifest.getHiddenTests().getTestClass());
        }
        // Per-language convention for where hidden tests should land inside
        // the sandbox. Each runner passes an absolute path (including the
        // assignment dir) to HiddenTestInstaller at execution time. The
        // values here are the *base* directories relative to the
        // assignment; runners that need an absolute path compute it from
        // context.assignmentPath().
        String hiddenTestBase = switch (technology) {
            case PYTHON -> "src/main/python";
            case JAVASCRIPT, TYPESCRIPT -> "src";
            // C/C++ projects use a Makefile that references
            // "hidden-tests/<file>.c" so we drop the test under
            // /workspace/<assignment>/hidden-tests/.
            case C, CPP -> "hidden-tests";
            default -> "src";
        };
        envVars.put("hiddenTestBase", hiddenTestBase);

        return new ProjectDescriptor(
                assignmentId,
                technology,
                framework,
                evaluationMode,
                dockerImage,
                buildCommand,
                testCommand,
                envVars
        );
    }

    private ExecuteResponse convertRunnerResultToExecuteResponse(RunnerResult runnerResult) {
        return new ExecuteResponse(runnerResult.testResults(), runnerResult.durationMs());
    }

    private String determineStatus(
            ExecuteResponse execution,
            DbVerificationResult dbVerification,
            StaticCheckResponse staticCheck
    ) {
        if (execution.getResults().stream().anyMatch(result -> !result.isPassed())) {
            return "FAIL";
        }
        if (dbVerification.isApplicable()
                && Boolean.FALSE.equals(dbVerification.getPassed())) {
            return "FAIL";
        }
        if (staticCheck.hasMissingRequirements() || staticCheck.hasSuspiciousPatterns()) {
            return "FLAGGED_FOR_REVIEW";
        }
        return "PASS";
    }
}
