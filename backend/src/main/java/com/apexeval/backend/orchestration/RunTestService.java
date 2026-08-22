package com.apexeval.backend.orchestration;

import com.apexeval.backend.dbverify.DbVerificationResult;
import com.apexeval.backend.dbverify.DbVerificationStrategy;
import com.apexeval.backend.diff.DiffResponse;
import com.apexeval.backend.diff.GitDiffService;
import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.execution.ExecutionStrategyResolver;
import com.apexeval.backend.staticcheck.StaticCheckResponse;
import com.apexeval.backend.staticcheck.StaticCheckService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RunTestService {

    private static final Logger log = LoggerFactory.getLogger(RunTestService.class);

    private final GitDiffService gitDiffService;
    private final ExecutionStrategyResolver executionResolver;
    private final DbVerificationStrategy dbVerificationStrategy;
    private final StaticCheckService staticCheckService;
    private final SubmissionCache submissionCache;
    private final SourceContentHasher sourceContentHasher;
    private final WebhookEmitter webhookEmitter;

    public RunTestService(
            GitDiffService gitDiffService,
            ExecutionStrategyResolver executionResolver,
            DbVerificationStrategy dbVerificationStrategy,
            StaticCheckService staticCheckService,
            SubmissionCache submissionCache,
            SourceContentHasher sourceContentHasher,
            WebhookEmitter webhookEmitter
    ) {
        this.gitDiffService = gitDiffService;
        this.executionResolver = executionResolver;
        this.dbVerificationStrategy = dbVerificationStrategy;
        this.staticCheckService = staticCheckService;
        this.submissionCache = submissionCache;
        this.sourceContentHasher = sourceContentHasher;
        this.webhookEmitter = webhookEmitter;
    }

    public RunTestResponse run(RunTestRequest request) {
        DiffResponse diff = gitDiffService.computeDiff(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getLastTestedCommit()
        );

        StaticCheckResponse staticCheck = staticCheckService.check(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getAssignmentId()
        );

        String sourceHash = sourceContentHasher.hashStudentSources(
                request.getWorkspacePath(),
                request.getAssignmentPath()
        );
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

            execution = executionResolver.executeFor(
                    request.getWorkspacePath(),
                    request.getAssignmentPath(),
                    request.getAssignmentId()
            );
            dbVerification = dbVerificationStrategy.verify(
                    request.getWorkspacePath(),
                    request.getAssignmentId()
            );
            submissionCache.put(cacheKey, new DeterministicResult(execution, dbVerification));
        }

        String status = determineStatus(execution, dbVerification, staticCheck);
        RunTestResponse response = new RunTestResponse(
                diff, execution, dbVerification, staticCheck, status
        );
        webhookEmitter.emit(new SubmissionEvent(
                request.getWorkspacePath(), request.getAssignmentId(), status
        ));
        return response;
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
