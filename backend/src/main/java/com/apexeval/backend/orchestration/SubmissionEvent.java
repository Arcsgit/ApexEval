package com.apexeval.backend.orchestration;

import java.time.Instant;

/**
 * Event payload emitted after every /api/run-test call.
 * Track B's agent service and Track C's dashboard will listen to this.
 */
public class SubmissionEvent {

    private String workspacePath;
    private String assignmentId;
    private String overallStatus;
    private String timestamp;

    public SubmissionEvent() {
    }

    public SubmissionEvent(String workspacePath, String assignmentId, String overallStatus) {
        this.workspacePath = workspacePath;
        this.assignmentId = assignmentId;
        this.overallStatus = overallStatus;
        this.timestamp = Instant.now().toString();
    }

    public String getWorkspacePath() {
        return workspacePath;
    }

    public void setWorkspacePath(String workspacePath) {
        this.workspacePath = workspacePath;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }

    public String getOverallStatus() {
        return overallStatus;
    }

    public void setOverallStatus(String overallStatus) {
        this.overallStatus = overallStatus;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
