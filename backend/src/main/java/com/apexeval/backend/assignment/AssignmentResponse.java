package com.apexeval.backend.assignment;

import com.apexeval.backend.technology.Technology;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AssignmentResponse {

    private String id;
    private String courseId;
    private String courseName;
    private String title;
    private String description;
    private List<String> requirements;
    private List<String> constraints;
    private List<String> allowedLanguages;
    private String defaultLanguage;
    private String difficulty;
    private int week;
    private int day;
    private String dueDate;
    private int maxAttempts;
    private long runtimeLimitMs;
    private int memoryLimitMb;
    private String status;
    private int totalTests;
    private int totalHiddenTests;
    private int totalStaticChecks;
    private Map<String, String> starterCode;
    private String createdAt;
    private String publishedAt;
    private String assignmentPath;

    public AssignmentResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String courseId) { this.courseId = courseId; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<String> getRequirements() { return requirements; }
    public void setRequirements(List<String> requirements) { this.requirements = requirements; }
    public List<String> getConstraints() { return constraints; }
    public void setConstraints(List<String> constraints) { this.constraints = constraints; }
    public List<String> getAllowedLanguages() { return allowedLanguages; }
    public void setAllowedLanguages(List<String> allowedLanguages) { this.allowedLanguages = allowedLanguages; }
    public String getDefaultLanguage() { return defaultLanguage; }
    public void setDefaultLanguage(String defaultLanguage) { this.defaultLanguage = defaultLanguage; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public int getWeek() { return week; }
    public void setWeek(int week) { this.week = week; }
    public int getDay() { return day; }
    public void setDay(int day) { this.day = day; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public long getRuntimeLimitMs() { return runtimeLimitMs; }
    public void setRuntimeLimitMs(long runtimeLimitMs) { this.runtimeLimitMs = runtimeLimitMs; }
    public int getMemoryLimitMb() { return memoryLimitMb; }
    public void setMemoryLimitMb(int memoryLimitMb) { this.memoryLimitMb = memoryLimitMb; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getTotalTests() { return totalTests; }
    public void setTotalTests(int totalTests) { this.totalTests = totalTests; }
    public int getTotalHiddenTests() { return totalHiddenTests; }
    public void setTotalHiddenTests(int totalHiddenTests) { this.totalHiddenTests = totalHiddenTests; }
    public int getTotalStaticChecks() { return totalStaticChecks; }
    public void setTotalStaticChecks(int totalStaticChecks) { this.totalStaticChecks = totalStaticChecks; }
    public Map<String, String> getStarterCode() { return starterCode; }
    public void setStarterCode(Map<String, String> starterCode) { this.starterCode = starterCode; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getPublishedAt() { return publishedAt; }
    public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
    public String getAssignmentPath() { return assignmentPath; }
    public void setAssignmentPath(String assignmentPath) { this.assignmentPath = assignmentPath; }
}