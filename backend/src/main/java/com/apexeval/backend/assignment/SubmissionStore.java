package com.apexeval.backend.assignment;

import com.apexeval.backend.diff.DiffResponse;
import com.apexeval.backend.execution.ExecuteResponse;
import com.apexeval.backend.execution.TestResult;
import com.apexeval.backend.orchestration.RunTestRequest;
import com.apexeval.backend.orchestration.RunTestResponse;
import com.apexeval.backend.staticcheck.StaticCheckResponse;
import com.apexeval.backend.staticcheck.StaticFinding;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * In-memory submission history shared by the real evaluation pipeline
 * (RunTestService, via /api/run-test) and the submissions REST API
 * (SubmissionController). Not durable across restarts - a straightforward
 * upgrade path to PostgreSQL is to swap the maps below for a JpaRepository
 * without touching callers, since they only see this store's methods.
 */
@Component
public class SubmissionStore {

    private final Map<String, SubmissionResponse> byId = new ConcurrentHashMap<>();
    private final Map<String, List<TestResultResponse>> testResultsById = new ConcurrentHashMap<>();
    private final Map<String, List<FindingResponse>> findingsById = new ConcurrentHashMap<>();
    private final Map<String, List<DiffFileResponse>> diffById = new ConcurrentHashMap<>();
    private final AtomicLong counter = new AtomicLong(0);

    /**
     * Records the real outcome of a /api/run-test evaluation. Returns null
     * (and records nothing) when the request carries no studentId, since a
     * submission history entry is meaningless without an owner.
     */
    public String recordFromRunTest(RunTestRequest request, RunTestResponse response, AssignmentManifest manifest) {
        String studentId = request.getStudentId();
        if (studentId == null || studentId.isBlank()) {
            return null;
        }

        String submissionId = "sub-" + counter.incrementAndGet();
        String now = Instant.now().toString();

        ExecuteResponse execution = response.getExecutionResults();
        List<TestResult> results = execution != null && execution.getResults() != null
                ? execution.getResults() : List.of();
        int testsTotal = results.size();
        int testsPassed = (int) results.stream().filter(TestResult::isPassed).count();

        StaticCheckResponse staticCheck = response.getStaticCheck();
        List<StaticFinding> required = staticCheck != null && staticCheck.getRequiredFindings() != null
                ? staticCheck.getRequiredFindings() : List.of();
        List<StaticFinding> suspicious = staticCheck != null && staticCheck.getSuspiciousFindings() != null
                ? staticCheck.getSuspiciousFindings() : List.of();
        int staticTotal = required.size();
        int staticPassed = (int) required.stream().filter(StaticFinding::isSatisfied).count();

        String result = switch (String.valueOf(response.getOverallStatus())) {
            case "PASS" -> "pass";
            case "FLAGGED_FOR_REVIEW" -> "flagged_for_review";
            default -> "fail";
        };

        Map<String, String> metadata = manifest.getMetadata() != null ? manifest.getMetadata() : Map.of();
        int attempt = (int) byId.values().stream()
                .filter(s -> request.getAssignmentId().equals(s.getAssignmentId()) && studentId.equals(s.getStudentId()))
                .count() + 1;

        int score = testsTotal > 0
                ? Math.round(100f * testsPassed / testsTotal)
                : ("pass".equals(result) ? 100 : 0);

        boolean dbCheckPassed = response.getDbVerification() == null
                || !response.getDbVerification().isApplicable()
                || Boolean.TRUE.equals(response.getDbVerification().getPassed());

        SubmissionResponse submission = new SubmissionResponse();
        submission.setId(submissionId);
        submission.setAssignmentId(request.getAssignmentId());
        submission.setAssignmentTitle(metadata.getOrDefault("title", request.getAssignmentId()));
        submission.setCourseId(metadata.getOrDefault("courseId", ""));
        submission.setCourseName(metadata.getOrDefault("courseName", ""));
        submission.setStudentId(studentId);
        submission.setStudentName(studentName(studentId));
        submission.setStudentEmail(studentId + "@apexeval.demo");
        submission.setAttempt(attempt);
        submission.setLanguage(manifest.getTechnology() != null ? manifest.getTechnology().getValue() : "java");
        submission.setCode("");
        submission.setStatus("complete");
        submission.setResult(result);
        submission.setSubmittedAt(now);
        submission.setCompletedAt(now);
        submission.setExecutionDurationMs(execution != null ? execution.getExecutionTimeMs() : 0);
        submission.setTestsPassed(testsPassed);
        submission.setTestsTotal(testsTotal);
        submission.setStaticChecksPassed(staticPassed);
        submission.setStaticChecksTotal(staticTotal);
        submission.setDbCheckPassed(dbCheckPassed);
        submission.setScore(score);
        submission.setOverridden(false);

        byId.put(submissionId, submission);
        testResultsById.put(submissionId, mapTestResults(submissionId, results));
        findingsById.put(submissionId, mapFindings(submissionId, required, suspicious));
        diffById.put(submissionId, mapDiff(response.getDiff()));

        return submissionId;
    }

    /** Simulated submission for the pasted-code /submit and /rerun endpoints (no real execution). */
    public SubmissionResponse recordSimulated(String studentId, String assignmentId, String code, String language) {
        String submissionId = "sub-" + counter.incrementAndGet();
        String now = Instant.now().toString();

        String result = "pass";
        int testsPassed = 10;
        int testsTotal = 10;
        int staticPassed = 5;
        int staticTotal = 5;
        if (assignmentId.contains("movie-watchlist")) {
            result = "flagged_for_review";
            testsPassed = 8;
        }
        int score = result.equals("pass") ? 100 : result.equals("flagged_for_review") ? 85 : 65;

        SubmissionResponse submission = new SubmissionResponse();
        submission.setId(submissionId);
        submission.setAssignmentId(assignmentId);
        submission.setAssignmentTitle(assignmentId);
        submission.setCourseId("crs-101");
        submission.setCourseName("Programming Fundamentals");
        submission.setStudentId(studentId);
        submission.setStudentName(studentName(studentId));
        submission.setStudentEmail(studentId + "@apexeval.demo");
        submission.setAttempt(1);
        submission.setLanguage(language != null ? language : "java");
        submission.setCode(code);
        submission.setStatus("complete");
        submission.setResult(result);
        submission.setSubmittedAt(now);
        submission.setCompletedAt(now);
        submission.setExecutionDurationMs(2000 + new Random().nextInt(3000));
        submission.setTestsPassed(testsPassed);
        submission.setTestsTotal(testsTotal);
        submission.setStaticChecksPassed(staticPassed);
        submission.setStaticChecksTotal(staticTotal);
        submission.setDbCheckPassed(true);
        submission.setScore(score);
        submission.setOverridden(false);

        byId.put(submissionId, submission);
        testResultsById.put(submissionId, List.of());
        findingsById.put(submissionId, List.of());
        diffById.put(submissionId, List.of());

        return submission;
    }

    public List<SubmissionResponse> list(String studentId, String assignmentId, String courseId, String status) {
        return byId.values().stream()
                .filter(s -> studentId == null || studentId.equals(s.getStudentId()))
                .filter(s -> assignmentId == null || assignmentId.equals(s.getAssignmentId()))
                .filter(s -> courseId == null || courseId.equals(s.getCourseId()))
                .filter(s -> status == null || status.equals(s.getResult()))
                .sorted(Comparator.comparing(SubmissionResponse::getSubmittedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<SubmissionResponse> getById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<TestResultResponse> getTestResults(String id) {
        return testResultsById.getOrDefault(id, List.of());
    }

    public List<FindingResponse> getFindings(String id) {
        return findingsById.getOrDefault(id, List.of());
    }

    public List<DiffFileResponse> getDiff(String id) {
        return diffById.getOrDefault(id, List.of());
    }

    private String studentName(String studentId) {
        return switch (studentId) {
            case "student-1" -> "Alex Chen";
            case "student-2" -> "Priya Sharma";
            case "student-3" -> "Marcus Johnson";
            default -> "Student";
        };
    }

    private List<TestResultResponse> mapTestResults(String submissionId, List<TestResult> results) {
        List<TestResultResponse> mapped = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            TestResult r = results.get(i);
            TestResultResponse t = new TestResultResponse();
            t.setId(submissionId + "-test-" + i);
            t.setSubmissionId(submissionId);
            t.setTestName(r.getTestName());
            t.setTestSuite("Tests");
            t.setStatus(r.isPassed() ? "pass" : "fail");
            t.setDurationMs(0);
            t.setIsHidden(false);
            if (!r.isPassed()) {
                t.setMessage(r.getFailureMessage());
            }
            mapped.add(t);
        }
        return mapped;
    }

    /** Every configured static check is surfaced, met or not, with a plain satisfied flag - no severity guessing. */
    private List<FindingResponse> mapFindings(String submissionId, List<StaticFinding> required, List<StaticFinding> suspicious) {
        List<FindingResponse> mapped = new ArrayList<>();
        int i = 0;
        for (StaticFinding f : required) {
            mapped.add(toFindingResponse(submissionId, "finding-" + submissionId + "-" + (i++), f, "required"));
        }
        for (StaticFinding f : suspicious) {
            mapped.add(toFindingResponse(submissionId, "finding-" + submissionId + "-" + (i++), f, "suspicious"));
        }
        return mapped;
    }

    private FindingResponse toFindingResponse(String submissionId, String id, StaticFinding f, String category) {
        FindingResponse resp = new FindingResponse();
        resp.setId(id);
        resp.setSubmissionId(submissionId);
        resp.setRuleId(f.getRule());
        resp.setRuleName(f.getMessage());
        resp.setSatisfied(f.isSatisfied());
        resp.setCategory(category);
        resp.setMessage(f.getMessage());
        resp.setFile(f.getFile());
        resp.setLine(f.getLine() != null ? f.getLine() : 0);
        resp.setColumn(f.getColumn() != null ? f.getColumn() : 0);
        resp.setSymbol(f.getSymbol());
        resp.setEvidence(f.getEvidence());
        return resp;
    }

    private static final Pattern DIFF_HEADER = Pattern.compile("diff --git a/(.*) b/(.*)");
    private static final Pattern HUNK_HEADER = Pattern.compile("@@ -(\\d+)(?:,\\d+)? \\+(\\d+)(?:,\\d+)? @@.*");

    /** Minimal unified-diff parser - handles the plain `git diff` output GitDiffService produces. */
    private List<DiffFileResponse> mapDiff(DiffResponse diff) {
        if (diff == null || diff.getDiffContent() == null || diff.getDiffContent().isBlank()) {
            return List.of();
        }

        List<DiffFileResponse> files = new ArrayList<>();
        DiffFileResponse current = null;
        List<DiffLineResponse> currentLines = null;
        int oldLine = 0;
        int newLine = 0;
        int additions = 0;
        int deletions = 0;

        for (String rawLine : diff.getDiffContent().split("\n", -1)) {
            Matcher header = DIFF_HEADER.matcher(rawLine);
            if (header.matches()) {
                if (current != null) {
                    current.setLines(currentLines);
                    current.setAdditions(additions);
                    current.setDeletions(deletions);
                    files.add(current);
                }
                current = new DiffFileResponse();
                currentLines = new ArrayList<>();
                additions = 0;
                deletions = 0;
                current.setFileName(header.group(2));
                current.setLanguage(guessLanguage(header.group(2)));
                continue;
            }
            if (current == null) {
                continue;
            }
            Matcher hunk = HUNK_HEADER.matcher(rawLine);
            if (hunk.matches()) {
                oldLine = Integer.parseInt(hunk.group(1));
                newLine = Integer.parseInt(hunk.group(2));
                continue;
            }
            if (rawLine.startsWith("+++") || rawLine.startsWith("---") || rawLine.startsWith("index ")
                    || rawLine.startsWith("new file") || rawLine.startsWith("deleted file")) {
                continue;
            }
            if (rawLine.startsWith("+")) {
                DiffLineResponse l = new DiffLineResponse();
                l.setType("added");
                l.setContent(rawLine.substring(1));
                l.setNewLineNumber(newLine++);
                currentLines.add(l);
                additions++;
            } else if (rawLine.startsWith("-")) {
                DiffLineResponse l = new DiffLineResponse();
                l.setType("removed");
                l.setContent(rawLine.substring(1));
                l.setOldLineNumber(oldLine++);
                currentLines.add(l);
                deletions++;
            } else if (!rawLine.isEmpty()) {
                DiffLineResponse l = new DiffLineResponse();
                l.setType("context");
                l.setContent(rawLine.startsWith(" ") ? rawLine.substring(1) : rawLine);
                l.setOldLineNumber(oldLine++);
                l.setNewLineNumber(newLine++);
                currentLines.add(l);
            }
        }
        if (current != null) {
            current.setLines(currentLines);
            current.setAdditions(additions);
            current.setDeletions(deletions);
            files.add(current);
        }
        return files;
    }

    private String guessLanguage(String fileName) {
        if (fileName.endsWith(".java")) return "java";
        if (fileName.endsWith(".py")) return "python";
        if (fileName.endsWith(".c") || fileName.endsWith(".h")) return "c";
        if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) return "javascript";
        if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) return "typescript";
        return "text";
    }

    // ── Response DTOs (kept alongside the store; SubmissionController is a thin REST layer over it) ──

    public static class TestResultResponse {
        private String id;
        private String submissionId;
        private String testName;
        private String testSuite;
        private String status;
        private long durationMs;
        private String message;
        private String expected;
        private String actual;
        private String output;
        private boolean isHidden;
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getSubmissionId() { return submissionId; }
        public void setSubmissionId(String submissionId) { this.submissionId = submissionId; }
        public String getTestName() { return testName; }
        public void setTestName(String testName) { this.testName = testName; }
        public String getTestSuite() { return testSuite; }
        public void setTestSuite(String testSuite) { this.testSuite = testSuite; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public long getDurationMs() { return durationMs; }
        public void setDurationMs(long durationMs) { this.durationMs = durationMs; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getExpected() { return expected; }
        public void setExpected(String expected) { this.expected = expected; }
        public String getActual() { return actual; }
        public void setActual(String actual) { this.actual = actual; }
        public String getOutput() { return output; }
        public void setOutput(String output) { this.output = output; }
        public boolean isHidden() { return isHidden; }
        public void setIsHidden(boolean isHidden) { this.isHidden = isHidden; }
    }

    public static class FindingResponse {
        private String id;
        private String submissionId;
        private String ruleId;
        private String ruleName;
        private boolean satisfied;
        private String category;
        private String message;
        private String file;
        private int line;
        private int column;
        private String symbol;
        private String evidence;
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getSubmissionId() { return submissionId; }
        public void setSubmissionId(String submissionId) { this.submissionId = submissionId; }
        public String getRuleId() { return ruleId; }
        public void setRuleId(String ruleId) { this.ruleId = ruleId; }
        public String getRuleName() { return ruleName; }
        public void setRuleName(String ruleName) { this.ruleName = ruleName; }
        public boolean isSatisfied() { return satisfied; }
        public void setSatisfied(boolean satisfied) { this.satisfied = satisfied; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getFile() { return file; }
        public void setFile(String file) { this.file = file; }
        public int getLine() { return line; }
        public void setLine(int line) { this.line = line; }
        public int getColumn() { return column; }
        public void setColumn(int column) { this.column = column; }
        public String getSymbol() { return symbol; }
        public void setSymbol(String symbol) { this.symbol = symbol; }
        public String getEvidence() { return evidence; }
        public void setEvidence(String evidence) { this.evidence = evidence; }
    }

    public static class DiffFileResponse {
        private String fileName;
        private String language;
        private int additions;
        private int deletions;
        private List<DiffLineResponse> lines;
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
        public int getAdditions() { return additions; }
        public void setAdditions(int additions) { this.additions = additions; }
        public int getDeletions() { return deletions; }
        public void setDeletions(int deletions) { this.deletions = deletions; }
        public List<DiffLineResponse> getLines() { return lines; }
        public void setLines(List<DiffLineResponse> lines) { this.lines = lines; }
    }

    public static class DiffLineResponse {
        private String type;
        private String content;
        private Integer oldLineNumber;
        private Integer newLineNumber;
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Integer getOldLineNumber() { return oldLineNumber; }
        public void setOldLineNumber(Integer oldLineNumber) { this.oldLineNumber = oldLineNumber; }
        public Integer getNewLineNumber() { return newLineNumber; }
        public void setNewLineNumber(Integer newLineNumber) { this.newLineNumber = newLineNumber; }
    }
}
