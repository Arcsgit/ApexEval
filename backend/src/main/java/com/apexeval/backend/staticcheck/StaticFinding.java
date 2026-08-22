package com.apexeval.backend.staticcheck;

/**
 * A single dynamically-discovered static-check outcome for ONE student's
 * current source tree. Never cached/shared across students as-is - always
 * regenerated per request, since file/line/column/evidence are inherently
 * student-specific (students can place code at any line/column).
 */
public class StaticFinding {

    private String rule;
    private String value;
    private String severity;
    private String message;

    /** Whether this rule's condition was satisfied. */
    private boolean satisfied;

    /** Nullable - only populated when JavaParser can pinpoint a location. */
    private String file;
    private Integer line;
    private Integer column;
    private String symbol;
    private String evidence;

    public StaticFinding() {
    }

    public StaticFinding(String rule, String value, String severity, String message, boolean satisfied) {
        this.rule = rule;
        this.value = value;
        this.severity = severity;
        this.message = message;
        this.satisfied = satisfied;
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

    public boolean isSatisfied() {
        return satisfied;
    }

    public void setSatisfied(boolean satisfied) {
        this.satisfied = satisfied;
    }

    public String getFile() {
        return file;
    }

    public void setFile(String file) {
        this.file = file;
    }

    public Integer getLine() {
        return line;
    }

    public void setLine(Integer line) {
        this.line = line;
    }

    public Integer getColumn() {
        return column;
    }

    public void setColumn(Integer column) {
        this.column = column;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getEvidence() {
        return evidence;
    }

    public void setEvidence(String evidence) {
        this.evidence = evidence;
    }

    public StaticFinding withLocation(String file, Integer line, Integer column, String symbol, String evidence) {
        this.file = file;
        this.line = line;
        this.column = column;
        this.symbol = symbol;
        this.evidence = evidence;
        return this;
    }
}
