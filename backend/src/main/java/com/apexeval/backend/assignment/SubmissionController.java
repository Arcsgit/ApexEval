package com.apexeval.backend.assignment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionStore store;

    @GetMapping
    public ResponseEntity<PaginatedResponse<SubmissionResponse>> listSubmissions(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String assignmentId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {

        List<SubmissionResponse> allSubmissions = store.list(studentId, assignmentId, courseId, status);

        int total = allSubmissions.size();
        int start = Math.min((page - 1) * pageSize, total);
        int end = Math.min(start + pageSize, total);
        List<SubmissionResponse> pageData = allSubmissions.subList(start, end);

        return ResponseEntity.ok(new PaginatedResponse<>(pageData, total, page, pageSize, (int) Math.ceil((double) total / pageSize)));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<SubmissionResponse> getSubmission(@PathVariable String submissionId) {
        return store.getById(submissionId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{submissionId}/test-results")
    public ResponseEntity<List<SubmissionStore.TestResultResponse>> getTestResults(@PathVariable String submissionId) {
        if (store.getById(submissionId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(store.getTestResults(submissionId));
    }

    @GetMapping("/{submissionId}/findings")
    public ResponseEntity<List<SubmissionStore.FindingResponse>> getFindings(@PathVariable String submissionId) {
        if (store.getById(submissionId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(store.getFindings(submissionId));
    }

    @GetMapping("/{submissionId}/diff")
    public ResponseEntity<List<SubmissionStore.DiffFileResponse>> getDiff(@PathVariable String submissionId) {
        if (store.getById(submissionId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(store.getDiff(submissionId));
    }

    @PostMapping("/{submissionId}/rerun")
    public ResponseEntity<SubmissionResponse> rerunSubmission(@PathVariable String submissionId) {
        return store.getById(submissionId)
                .map(original -> {
                    SubmissionResponse rerun = store.recordSimulated(
                            original.getStudentId(), original.getAssignmentId(), original.getCode(), original.getLanguage()
                    );
                    rerun.setAttempt(original.getAttempt() + 1);
                    return ResponseEntity.ok(rerun);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmissionResponse> submitCode(@RequestBody SubmitCodeRequest request) {
        return ResponseEntity.ok(store.recordSimulated(
                request.getStudentId(), request.getAssignmentId(), request.getCode(), request.getLanguage()
        ));
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
