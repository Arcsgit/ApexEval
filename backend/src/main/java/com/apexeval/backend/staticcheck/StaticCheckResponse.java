package com.apexeval.backend.staticcheck;

import java.util.List;

/**
 * Structured static-check response. Replaces the earlier plain
 * found/missing/suspiciousPatterns string-list design with full
 * StaticFinding objects carrying dynamic file/line/column/evidence,
 * discovered fresh per request via JavaParser.
 */
public class StaticCheckResponse {

    private List<StaticFinding> requiredFindings;
    private List<StaticFinding> suspiciousFindings;

    public StaticCheckResponse() {
    }

    public StaticCheckResponse(List<StaticFinding> requiredFindings, List<StaticFinding> suspiciousFindings) {
        this.requiredFindings = requiredFindings;
        this.suspiciousFindings = suspiciousFindings;
    }

    public List<StaticFinding> getRequiredFindings() {
        return requiredFindings;
    }

    public void setRequiredFindings(List<StaticFinding> requiredFindings) {
        this.requiredFindings = requiredFindings;
    }

    public List<StaticFinding> getSuspiciousFindings() {
        return suspiciousFindings;
    }

    public void setSuspiciousFindings(List<StaticFinding> suspiciousFindings) {
        this.suspiciousFindings = suspiciousFindings;
    }

    /** Convenience: any required rule NOT satisfied. */
    public boolean hasMissingRequirements() {
        return requiredFindings != null && requiredFindings.stream().anyMatch(f -> !f.isSatisfied());
    }

    /** Convenience: any suspicious rule that WAS triggered (satisfied = pattern found). */
    public boolean hasSuspiciousPatterns() {
        return suspiciousFindings != null && suspiciousFindings.stream().anyMatch(StaticFinding::isSatisfied);
    }
}
