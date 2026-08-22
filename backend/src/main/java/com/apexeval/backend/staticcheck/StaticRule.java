package com.apexeval.backend.staticcheck;

public class StaticRule {

    private String rule;
    private String value;
    private String message;

    public StaticRule() {
    }

    public StaticRule(String rule, String value, String message) {
        this.rule = rule;
        this.value = value;
        this.message = message;
    }

    public String getRule() {
        return rule;
    }

    public void setRule(String rule) {
        this.rule = rule;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}