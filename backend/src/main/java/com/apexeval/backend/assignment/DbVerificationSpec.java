package com.apexeval.backend.assignment;

public class DbVerificationSpec {

    private boolean applicable;
    private String strategy;

    public DbVerificationSpec() {
    }

    public boolean isApplicable() {
        return applicable;
    }

    public void setApplicable(boolean applicable) {
        this.applicable = applicable;
    }

    public String getStrategy() {
        return strategy;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }
}