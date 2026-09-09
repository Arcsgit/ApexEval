package com.apexeval.backend.assignment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SubmissionResponse {

    private String id;
    private String assignmentId;
    private String assignmentTitle;
    private String courseId;
    private String courseName;
    private String studentId;
    private String studentName;
    private String studentEmail;
    private int attempt;
    private String language;
    private String code;
    private String status;
    private String result;
    private String submittedAt;
    private String completedAt;
    private long executionDurationMs;
    private int testsPassed;
    private int testsTotal;
    private int staticChecksPassed;
    private int staticChecksTotal;
    private boolean dbCheckPassed;
    private int score;
    private boolean overridden;
    private String overriddenBy;
    private String overrideReason;
    private String overriddenAt;

    public SubmissionResponse() {}

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAssignmentId() { return assignmentId; }
    public void setAssignmentId(String assignmentId) { this.assignmentId = assignmentId; }
    public String getAssignmentTitle() { return assignmentTitle; }
    public void setAssignmentTitle(String assignmentTitle) { this.assignmentTitle = assignmentTitle; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String courseId) { this.courseId = courseId; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }
    public int getAttempt() { return attempt; }
    public void setAttempt(int attempt) { this.attempt = attempt; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }
    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }
    public long getExecutionDurationMs() { return executionDurationMs; }
    public void setExecutionDurationMs(long executionDurationMs) { this.executionDurationMs = executionDurationMs; }
    public int getTestsPassed() { return testsPassed; }
    public void setTestsPassed(int testsPassed) { this.testsPassed = testsPassed; }
    public int getTestsTotal() { return testsTotal; }
    public void setTestsTotal(int testsTotal) { this.testsTotal = testsTotal; }
    public int getStaticChecksPassed() { return staticChecksPassed; }
    public void setStaticChecksPassed(int staticChecksPassed) { this.staticChecksPassed = staticChecksPassed; }
    public int getStaticChecksTotal() { return staticChecksTotal; }
    public void setStaticChecksTotal(int staticChecksTotal) { this.staticChecksTotal = staticChecksTotal; }
    public boolean isDbCheckPassed() { return dbCheckPassed; }
    public void setDbCheckPassed(boolean dbCheckPassed) { this.dbCheckPassed = dbCheckPassed; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public boolean isOverridden() { return overridden; }
    public void setOverridden(boolean overridden) { this.overridden = overridden; }
    public String getOverriddenBy() { return overriddenBy; }
    public void setOverriddenBy(String overriddenBy) { this.overriddenBy = overriddenBy; }
    public String getOverrideReason() { return overrideReason; }
    public void setOverrideReason(String overrideReason) { this.overrideReason = overrideReason; }
    public String getOverriddenAt() { return overriddenAt; }
    public void setOverriddenAt(String overriddenAt) { this.overriddenAt = overriddenAt; }
}