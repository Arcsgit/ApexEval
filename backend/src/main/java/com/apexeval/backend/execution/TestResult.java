package com.apexeval.backend.execution;

public class TestResult {

    private String testName;
    private boolean passed;
    private String failureMessage;

    public TestResult() {
    }

    public TestResult(String testName, boolean passed, String failureMessage) {
        this.testName = testName;
        this.passed = passed;
        this.failureMessage = failureMessage;
    }

    public String getTestName() {
        return testName;
    }

    public void setTestName(String testName) {
        this.testName = testName;
    }

    public boolean isPassed() {
        return passed;
    }

    public void setPassed(boolean passed) {
        this.passed = passed;
    }

    public String getFailureMessage() {
        return failureMessage;
    }

    public void setFailureMessage(String failureMessage) {
        this.failureMessage = failureMessage;
    }
}
