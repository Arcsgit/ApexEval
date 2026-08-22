package com.apexeval.backend.execution;

import jakarta.validation.constraints.NotBlank;

public class ExecuteRequest {

    @NotBlank(message = "workspacePath must not be blank")
    private String workspacePath;

    @NotBlank(message = "assignmentPath must not be blank")
    private String assignmentPath;

    @NotBlank(message = "assignmentId must not be blank")
    private String assignmentId;

    public ExecuteRequest() {
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
