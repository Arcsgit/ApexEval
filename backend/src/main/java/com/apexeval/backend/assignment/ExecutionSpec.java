package com.apexeval.backend.assignment;

public class ExecutionSpec {

    private String strategy;
    private String testCommand;
    private int timeoutSeconds;

    public ExecutionSpec() {
    }

    public String getStrategy() {
        return strategy;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }

    public String getTestCommand() {
        return testCommand;
    }

    public void setTestCommand(String testCommand) {
        this.testCommand = testCommand;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }
}