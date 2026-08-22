package com.apexeval.backend.staticcheck;

import jakarta.validation.constraints.NotBlank;

public class StaticCheckRequest {

    @NotBlank
    private String workspacePath;

    @NotBlank
    private String assignmentPath;

    @NotBlank
    private String assignmentId;

    public StaticCheckRequest() {
    }

    public String getWorkspacePath() {
        return workspacePath;
    }

    public void setWorkspacePath(String workspacePath) {
        this.workspacePath = workspacePath;
    }

    public String getAssignmentPath() {
        return assignmentPath;
    }

    public void setAssignmentPath(String assignmentPath) {
        this.assignmentPath = assignmentPath;
    }

    public String getAssignmentId() {
        return assignmentId;
    }

    public void setAssignmentId(String assignmentId) {
        this.assignmentId = assignmentId;
    }
}
