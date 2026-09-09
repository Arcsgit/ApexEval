package com.apexeval.backend.assignment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final AssignmentManifestRepository manifestRepository;

    // In-memory storage for demo/testing - in production this would be a database
    private final Map<String, List<SubmissionResponse>> submissionsByStudent = new ConcurrentHashMap<>();
    private final Map<String, SubmissionResponse> submissionsById = new ConcurrentHashMap<>();
    
    // Atomic counter for submission IDs
    private final AtomicLong submissionCounter = new AtomicLong(0);

    @GetMapping
    public ResponseEntity<PaginatedResponse<SubmissionResponse>> listSubmissions(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String assignmentId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        
        List<SubmissionResponse> allSubmissions = new ArrayList<>(submissionsById.values());
        
        // Filter
        if (studentId != null) {
            allSubmissions = allSubmissions.stream()
                .filter(s -> studentId.equals(s.getStudentId()))
                .collect(Collectors.toList());
        }
        if (assignmentId != null) {
            allSubmissions = allSubmissions.stream()
                .filter(s -> assignmentId.equals(s.getAssignmentId()))
                .collect(Collectors.toList());
        }
        if (courseId != null) {
            allSubmissions = allSubmissions.stream()
                .filter(s -> courseId.equals(s.getCourseId()))
                .collect(Collectors.toList());
        }
        if (status != null) {
            allSubmissions = allSubmissions.stream()
                .filter(s -> status.equals(s.getResult()))
                .collect(Collectors.toList());
        }
        
        // Sort by submittedAt desc
        allSubmissions.sort((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt()));
        
        // Pagination
        int total = allSubmissions.size();
        int start = (page - 1) * pageSize;
        int end = Math.min(start + pageSize, total);
        List<SubmissionResponse> pageData = allSubmissions.subList(start, end);
        
        return ResponseEntity.ok(new PaginatedResponse<>(pageData, total, page, pageSize, (int) Math.ceil((double) total / pageSize)));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<SubmissionResponse> getSubmission(@PathVariable String submissionId) {
        SubmissionResponse submission = submissionsById.get(submissionId);
        if (submission == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/{submissionId}/test-results")
    public ResponseEntity<List<TestResultResponse>> getTestResults(@PathVariable String submissionId) {
        SubmissionResponse submission = submissionsById.get(submissionId);
        if (submission == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Generate mock test results based on submission data
        List<TestResultResponse> results = generateTestResults(submission);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{submissionId}/findings")
    public ResponseEntity<List<FindingResponse>> getFindings(@PathVariable String submissionId) {
        SubmissionResponse submission = submissionsById.get(submissionId);
        if (submission == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Generate mock findings based on submission data
        List<FindingResponse> findings = generateFindings(submission);
        return ResponseEntity.ok(findings);
    }

    @GetMapping("/{submissionId}/diff")
    public ResponseEntity<List<DiffFileResponse>> getDiff(@PathVariable String submissionId) {
        SubmissionResponse submission = submissionsById.get(submissionId);
        if (submission == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Generate mock diff
        List<DiffFileResponse> diffs = generateDiff(submission);
        return ResponseEntity.ok(diffs);
    }

    @PostMapping("/{submissionId}/rerun")
    public ResponseEntity<SubmissionResponse> rerunSubmission(@PathVariable String submissionId) {
        SubmissionResponse original = submissionsById.get(submissionId);
        if (original == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Create a new submission as a rerun
        ResponseEntity<SubmissionResponse> response = createSubmission(
            original.getStudentId(),
            original.getAssignmentId(),
            original.getCode(),
            original.getLanguage()
        );
        
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            SubmissionResponse rerun = response.getBody();
            rerun.setAttempt(original.getAttempt() + 1);
            return ResponseEntity.ok(rerun);
        }
        
        return response;
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmissionResponse> submitCode(@RequestBody SubmitCodeRequest request) {
        return createSubmission(
            request.getStudentId(),
            request.getAssignmentId(),
            request.getCode(),
            request.getLanguage()
        );
    }

    private ResponseEntity<SubmissionResponse> createSubmission(String studentId, String assignmentId, String code, String language) {
        try {
            AssignmentManifest manifest = manifestRepository.findById(assignmentId);
            
            // Use the actual RunTestService to evaluate
            // For now, create a mock response that simulates the result
            String submissionId = "sub-" + submissionCounter.incrementAndGet();
            String now = Instant.now().toString();
            
            // Determine result based on assignment
            String result = "pass";
            int testsPassed = 10;
            int testsTotal = 10;
            int staticPassed = 5;
            int staticTotal = 5;
            
            // Simulate different outcomes for different assignments
            if (assignmentId.contains("movie-watchlist")) {
                result = "flagged_for_review";
                testsPassed = 8;
            } else if (assignmentId.contains("generic-stack")) {
                result = "pass";
                testsPassed = 10;
            }
            
            int score = result.equals("pass") ? 100 : result.equals("flagged_for_review") ? 85 : 65;
            
            SubmissionResponse submission = new SubmissionResponse();
            submission.setId(submissionId);
            submission.setAssignmentId(assignmentId);
            submission.setAssignmentTitle(manifest.getMetadata() != null ? manifest.getMetadata().getOrDefault("title", assignmentId) : assignmentId);
            submission.setCourseId("cs101");
            submission.setCourseName("Data Structures");
            submission.setStudentId(studentId);
            submission.setStudentName(getStudentName(studentId));
            submission.setStudentEmail(studentId + "@university.edu");
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
            
            // Store
            submissionsById.put(submissionId, submission);
            submissionsByStudent.computeIfAbsent(studentId, k -> Collections.synchronizedList(new ArrayList<>())).add(submission);
            
            return ResponseEntity.ok(submission);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private String getStudentName(String studentId) {
        return switch (studentId) {
            case "student-1" -> "Alex Chen";
            case "student-2" -> "Priya Sharma";
            case "student-3" -> "Marcus Johnson";
            default -> "Student";
        };
    }

    private List<TestResultResponse> generateTestResults(SubmissionResponse submission) {
        List<TestResultResponse> results = new ArrayList<>();
        int testsTotal = submission.getTestsTotal();
        int testsPassed = submission.getTestsPassed();
        
        // Create test suites
        String[] suites = {"Core Functionality", "Edge Cases", "Performance"};
        for (int i = 0; i < suites.length; i++) {
            int suiteTests = testsTotal / 3 + (i == 0 ? 1 : 0);
            int suitePassed = Math.min(suiteTests, testsPassed - i * (testsTotal / 3));
            if (suitePassed < 0) suitePassed = 0;
            
            for (int j = 0; j < suiteTests; j++) {
                TestResultResponse test = new TestResultResponse();
                test.setId("test-" + submission.getId() + "-" + i + "-" + j);
                test.setSubmissionId(submission.getId());
                test.setTestName(suites[i] + " - Test " + (j + 1));
                test.setTestSuite(suites[i]);
                test.setStatus(j < suitePassed ? "pass" : "fail");
                test.setDurationMs(100 + new Random().nextInt(200));
                test.setIsHidden(j >= suiteTests / 2);
                if (test.getStatus().equals("fail")) {
                    test.setMessage("Assertion failed: expected " + (j + 1) + " but got " + j);
                    test.setExpected(String.valueOf(j + 1));
                    test.setActual(String.valueOf(j));
                }
                results.add(test);
            }
        }
        return results;
    }

    private List<FindingResponse> generateFindings(SubmissionResponse submission) {
        List<FindingResponse> findings = new ArrayList<>();
        
        if ("flagged_for_review".equals(submission.getResult())) {
            FindingResponse f = new FindingResponse();
            f.setId("finding-" + submission.getId() + "-1");
            f.setSubmissionId(submission.getId());
            f.setRuleId("HAS_FUNCTION");
            f.setRuleName("Required Function: list_print_reverse");
            f.setSeverity("medium");
            f.setCategory("required");
            f.setMessage("Function list_print_reverse is required but not found");
            f.setFile("linked_list.c");
            f.setLine(45);
            f.setColumn(10);
            f.setSymbol("list_print_reverse");
            f.setEvidence("void list_print_reverse(Node* head)");
            findings.add(f);
            
            f = new FindingResponse();
            f.setId("finding-" + submission.getId() + "-2");
            f.setSubmissionId(submission.getId());
            f.setRuleId("UNSAFE_STRCPY");
            f.setRuleName("Unsafe strcpy usage");
            f.setSeverity("high");
            f.setCategory("suspicious");
            f.setMessage("Avoid strcpy - use strncpy or strlcpy to prevent buffer overflow");
            f.setFile("linked_list.c");
            f.setLine(67);
            f.setColumn(5);
            f.setSymbol("strcpy");
            f.setEvidence("strcpy(dest, src)");
            findings.add(f);
        }
        
        return findings;
    }

    private List<DiffFileResponse> generateDiff(SubmissionResponse submission) {
        List<DiffFileResponse> diffs = new ArrayList<>();
        
        DiffFileResponse diff = new DiffFileResponse();
        diff.setFileName("linked_list.c");
        diff.setLanguage("c");
        diff.setAdditions(3);
        diff.setDeletions(2);
        
        List<DiffLineResponse> lines = new ArrayList<>();
        
        DiffLineResponse l1 = new DiffLineResponse();
        l1.setType("context");
        l1.setContent("#include <stdio.h>");
        l1.setOldLineNumber(1);
        l1.setNewLineNumber(1);
        lines.add(l1);
        
        DiffLineResponse l2 = new DiffLineResponse();
        l2.setType("removed");
        l2.setContent("int main() { printf(\"Hello\"); }");
        l2.setOldLineNumber(10);
        lines.add(l2);
        
        DiffLineResponse l3 = new DiffLineResponse();
        l3.setType("added");
        l3.setContent("int main() { list_test(); return 0; }");
        l3.setNewLineNumber(10);
        lines.add(l3);
        
        diff.setLines(lines);
        diffs.add(diff);
        
        return diffs;
    }

    // Inner classes for responses
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
        private String severity;
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
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
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

    public static class SubmitCodeRequest {
        private String studentId;
        private String assignmentId;
        private String code;
        private String language;
        public String getStudentId() { return studentId; }
        public void setStudentId(String studentId) { this.studentId = studentId; }
        public String getAssignmentId() { return assignmentId; }
        public void setAssignmentId(String assignmentId) { this.assignmentId = assignmentId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
    }

    public static class PaginatedResponse<T> {
        private List<T> data;
        private int total;
        private int page;
        private int pageSize;
        private int totalPages;
        
        public PaginatedResponse() {}
        public PaginatedResponse(List<T> data, int total, int page, int pageSize, int totalPages) {
            this.data = data;
            this.total = total;
            this.page = page;
            this.pageSize = pageSize;
            this.totalPages = totalPages;
        }
        public List<T> getData() { return data; }
        public void setData(List<T> data) { this.data = data; }
        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }
        public int getPage() { return page; }
        public void setPage(int page) { this.page = page; }
        public int getPageSize() { return pageSize; }
        public void setPageSize(int pageSize) { this.pageSize = pageSize; }
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    }
}