package com.apexeval.backend.assignment;

import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.EvaluationMode;

import java.util.List;
import java.util.Map;

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

    // New format fields (from AssignmentManifest)
    private Technology technology;
    private Framework framework;
    private EvaluationMode evaluationMode;
    private RuntimeConfig runtime;
    private BuildConfig build;
    private TestConfig test;
    private LimitsConfig limits;
    private HiddenTestsConfig hiddenTests;
    private DbVerificationConfig dbVerificationConfig;
    private Map<String, String> metadata;

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

    // New format getters/setters (from AssignmentManifest)
    public Technology getTechnology() {
        return technology;
    }

    public void setTechnology(Technology technology) {
        this.technology = technology;
    }

    public Framework getFramework() {
        return framework;
    }

    public void setFramework(Framework framework) {
        this.framework = framework;
    }

    public EvaluationMode getEvaluationMode() {
        return evaluationMode;
    }

    public void setEvaluationMode(EvaluationMode evaluationMode) {
        this.evaluationMode = evaluationMode;
    }

    public RuntimeConfig getRuntime() {
        return runtime;
    }

    public void setRuntime(RuntimeConfig runtime) {
        this.runtime = runtime;
    }

    public BuildConfig getBuild() {
        return build;
    }

    public void setBuild(BuildConfig build) {
        this.build = build;
    }

    public TestConfig getTest() {
        return test;
    }

    public void setTest(TestConfig test) {
        this.test = test;
    }

    public LimitsConfig getLimits() {
        return limits;
    }

    public void setLimits(LimitsConfig limits) {
        this.limits = limits;
    }

    public HiddenTestsConfig getHiddenTests() {
        return hiddenTests;
    }

    public void setHiddenTests(HiddenTestsConfig hiddenTests) {
        this.hiddenTests = hiddenTests;
    }

    public DbVerificationConfig getDbVerificationConfig() {
        return dbVerificationConfig;
    }

    public void setDbVerificationConfig(DbVerificationConfig dbVerificationConfig) {
        this.dbVerificationConfig = dbVerificationConfig;
    }

    public Map<String, String> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    // Inner config classes (copied from AssignmentManifest for compatibility)
    public static class RuntimeConfig {
        private String image;
        private String version;
        private Map<String, String> env;

        public RuntimeConfig() {}
        public String getImage() { return image; }
        public void setImage(String image) { this.image = image; }
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
        public Map<String, String> getEnv() { return env; }
        public void setEnv(Map<String, String> env) { this.env = env; }
    }

    public static class BuildConfig {
        private List<String> commands;
        private String workingDirectory;
        private Map<String, String> env;

        public BuildConfig() {}
        public List<String> getCommands() { return commands; }
        public void setCommands(List<String> commands) { this.commands = commands; }
        public String getWorkingDirectory() { return workingDirectory; }
        public void setWorkingDirectory(String workingDirectory) { this.workingDirectory = workingDirectory; }
        public Map<String, String> getEnv() { return env; }
        public void setEnv(Map<String, String> env) { this.env = env; }
    }

    public static class TestConfig {
        private List<String> commands;
        private String workingDirectory;
        private Map<String, String> env;
        private String reportFormat;
        private String reportPath;

        public TestConfig() {}
        public List<String> getCommands() { return commands; }
        public void setCommands(List<String> commands) { this.commands = commands; }
        public String getWorkingDirectory() { return workingDirectory; }
        public void setWorkingDirectory(String workingDirectory) { this.workingDirectory = workingDirectory; }
        public Map<String, String> getEnv() { return env; }
        public void setEnv(Map<String, String> env) { this.env = env; }
        public String getReportFormat() { return reportFormat; }
        public void setReportFormat(String reportFormat) { this.reportFormat = reportFormat; }
        public String getReportPath() { return reportPath; }
        public void setReportPath(String reportPath) { this.reportPath = reportPath; }
    }

    public static class LimitsConfig {
        private long timeoutSeconds;
        private long memoryMb;
        private double cpuCores;
        private long maxOutputBytes;
        private int maxProcesses;
        private boolean networkEnabled;
        private boolean privileged;

        public LimitsConfig() {}
        public long getTimeoutSeconds() { return timeoutSeconds; }
        public void setTimeoutSeconds(long timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }
        public long getMemoryMb() { return memoryMb; }
        public void setMemoryMb(long memoryMb) { this.memoryMb = memoryMb; }
        public double getCpuCores() { return cpuCores; }
        public void setCpuCores(double cpuCores) { this.cpuCores = cpuCores; }
        public long getMaxOutputBytes() { return maxOutputBytes; }
        public void setMaxOutputBytes(long maxOutputBytes) { this.maxOutputBytes = maxOutputBytes; }
        public int getMaxProcesses() { return maxProcesses; }
        public void setMaxProcesses(int maxProcesses) { this.maxProcesses = maxProcesses; }
        public boolean isNetworkEnabled() { return networkEnabled; }
        public void setNetworkEnabled(boolean networkEnabled) { this.networkEnabled = networkEnabled; }
        public boolean isPrivileged() { return privileged; }
        public void setPrivileged(boolean privileged) { this.privileged = privileged; }
    }

    public static class HiddenTestsConfig {
        private String version;
        private String path;
        private String testClass;

        public HiddenTestsConfig() {}
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getTestClass() { return testClass; }
        public void setTestClass(String testClass) { this.testClass = testClass; }
    }

    public static class DbVerificationConfig {
        private boolean applicable;
        private String strategy;
        private Map<String, String> config;

        public DbVerificationConfig() {}
        public boolean isApplicable() { return applicable; }
        public void setApplicable(boolean applicable) { this.applicable = applicable; }
        public String getStrategy() { return strategy; }
        public void setStrategy(String strategy) { this.strategy = strategy; }
        public Map<String, String> getConfig() { return config; }
        public void setConfig(Map<String, String> config) { this.config = config; }
    }
}