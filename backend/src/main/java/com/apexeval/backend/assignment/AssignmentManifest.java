package com.apexeval.backend.assignment;

import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.EvaluationMode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AssignmentManifest {

    private String schemaVersion;
    private String assignmentId;
    private int version;
    private String status;
    
    // Technology identification
    private Technology technology;
    private Framework framework;
    private EvaluationMode evaluationMode;

    // Legacy fields (pre-manifest format). Read only — migrated to `technology`
    // and `framework` during repository loading.
    private String language;
    private String assignmentType;
    
    // Runtime configuration
    private RuntimeConfig runtime;
    
    // Build configuration
    private BuildConfig build;
    
    // Test configuration
    private TestConfig test;
    
    // Resource limits
    private LimitsConfig limits;
    
    // Hidden tests
    private HiddenTestsConfig hiddenTests;
    
    // Static analysis rules
    private List<StaticRuleConfig> requiredRules;
    private List<StaticRuleConfig> suspiciousRules;
    
    // Database verification
    private DbVerificationConfig dbVerification;
    
    // Metadata
    private Map<String, String> metadata;

    public AssignmentManifest() {
    }

    // Getters and setters
    public String getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(String schemaVersion) { this.schemaVersion = schemaVersion; }
    
    public String getAssignmentId() { return assignmentId; }
    public void setAssignmentId(String assignmentId) { this.assignmentId = assignmentId; }
    
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public Technology getTechnology() { return technology; }
    public void setTechnology(Technology technology) { this.technology = technology; }
    
    public Framework getFramework() { return framework; }
    public void setFramework(Framework framework) { this.framework = framework; }
    
    public EvaluationMode getEvaluationMode() { return evaluationMode; }
    public void setEvaluationMode(EvaluationMode evaluationMode) { this.evaluationMode = evaluationMode; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getAssignmentType() { return assignmentType; }
    public void setAssignmentType(String assignmentType) { this.assignmentType = assignmentType; }
    
    public RuntimeConfig getRuntime() { return runtime; }
    public void setRuntime(RuntimeConfig runtime) { this.runtime = runtime; }
    
    public BuildConfig getBuild() { return build; }
    public void setBuild(BuildConfig build) { this.build = build; }
    
    public TestConfig getTest() { return test; }
    public void setTest(TestConfig test) { this.test = test; }
    
    public LimitsConfig getLimits() { return limits; }
    public void setLimits(LimitsConfig limits) { this.limits = limits; }
    
    public HiddenTestsConfig getHiddenTests() { return hiddenTests; }
    public void setHiddenTests(HiddenTestsConfig hiddenTests) { this.hiddenTests = hiddenTests; }
    
    public List<StaticRuleConfig> getRequiredRules() { return requiredRules; }
    public void setRequiredRules(List<StaticRuleConfig> requiredRules) { this.requiredRules = requiredRules; }
    
    public List<StaticRuleConfig> getSuspiciousRules() { return suspiciousRules; }
    public void setSuspiciousRules(List<StaticRuleConfig> suspiciousRules) { this.suspiciousRules = suspiciousRules; }
    
    public DbVerificationConfig getDbVerification() { return dbVerification; }
    public void setDbVerification(DbVerificationConfig dbVerification) { this.dbVerification = dbVerification; }
    
    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }

    // Nested config classes
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
    
    public static class StaticRuleConfig {
        private String rule;
        private String value;
        private List<String> valueList;
        private String target;
        private String severity;
        private String message;
        
        public StaticRuleConfig() {}
        
        public String getRule() { return rule; }
        public void setRule(String rule) { this.rule = rule; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
        public List<String> getValueList() { return valueList; }
        public void setValueList(List<String> valueList) { this.valueList = valueList; }
        public String getTarget() { return target; }
        public void setTarget(String target) { this.target = target; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
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