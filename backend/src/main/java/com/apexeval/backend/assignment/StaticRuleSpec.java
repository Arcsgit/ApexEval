package com.apexeval.backend.assignment;

import java.util.List;

/**
 * Phase 0-style rule definition. Contains ONLY what must be true about the
 * student's code (rule type + target + expected value) - never file/line/
 * column, since those are discovered dynamically per student at check time.
 */
public class StaticRuleSpec {

    private String rule;

    /** Optional: e.g. class/method this rule applies to (used by EXTENDS_TYPE, METHOD_FORBIDDEN). */
    private String target;

    /** Single expected value, e.g. "ArrayList". Null if valueList is used instead. */
    private String value;

    /** List-valued form, e.g. forbidden method names. Null if value is used instead. */
    private List<String> valueList;

    private String severity;
    private String message;

    public StaticRuleSpec() {
    }

    public String getRule() {
        return rule;
    }

    public void setRule(String rule) {
        this.rule = rule;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public List<String> getValueList() {
        if (valueList != null) {
            return valueList;
        }
        return value != null ? List.of(value) : List.of();
    }

    public void setValueList(List<String> valueList) {
        this.valueList = valueList;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
