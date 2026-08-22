package com.apexeval.backend.assignment;

import java.util.List;

public class AssignmentSpec {

    private String schemaVersion;
    private String assignmentId;
    private int version;
    private String status;
    private String assignmentType;
    private String language;
    private int javaVersion;
    private String buildTool;
    private String hiddenTestClass;
    private String hiddenTestPath;
    private List<StaticRuleSpec> requiredRules;
    private List<StaticRuleSpec> suspiciousRules;
    private ExecutionSpec execution;
    private DbVerificationSpec dbVerification;

    public AssignmentSpec() {
    }

    public String getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(String schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignmentType() {
        return assignmentType;
    }

    public void setAssignmentType(String assignmentType) {
        this.assignmentType = assignmentType;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public int getJavaVersion() {
        return javaVersion;
    }

    public void setJavaVersion(int javaVersion) {
        this.javaVersion = javaVersion;
    }

    public String getBuildTool() {
        return buildTool;
    }

    public void setBuildTool(String buildTool) {
        this.buildTool = buildTool;
    }

    public String getHiddenTestClass() {
        return hiddenTestClass;
    }

    public void setHiddenTestClass(String hiddenTestClass) {
        this.hiddenTestClass = hiddenTestClass;
    }

    public String getHiddenTestPath() {
        return hiddenTestPath;
    }

    public void setHiddenTestPath(String hiddenTestPath) {
        this.hiddenTestPath = hiddenTestPath;
    }

    public List<StaticRuleSpec> getRequiredRules() {
        return requiredRules;
    }

    public void setRequiredRules(List<StaticRuleSpec> requiredRules) {
        this.requiredRules = requiredRules;
    }

    public List<StaticRuleSpec> getSuspiciousRules() {
        return suspiciousRules;
    }

    public void setSuspiciousRules(List<StaticRuleSpec> suspiciousRules) {
        this.suspiciousRules = suspiciousRules;
    }

    public ExecutionSpec getExecution() {
        return execution;
    }

    public void setExecution(ExecutionSpec execution) {
        this.execution = execution;
    }

    public DbVerificationSpec getDbVerification() {
        return dbVerification;
    }

    public void setDbVerification(DbVerificationSpec dbVerification) {
        this.dbVerification = dbVerification;
    }

    public List<StaticRuleSpec> getSafeRequiredRules() {
        return requiredRules == null ? List.of() : requiredRules;
    }

    public List<StaticRuleSpec> getSafeSuspiciousRules() {
        return suspiciousRules == null ? List.of() : suspiciousRules;
    }
}