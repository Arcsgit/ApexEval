package com.apexeval.backend.diff;

import jakarta.validation.constraints.NotBlank;

public class DiffRequest {

    @NotBlank(message = "workspacePath must not be blank")
    private String workspacePath;

    @NotBlank(message = "assignmentPath must not be blank")
    private String assignmentPath;

    private String lastTestedCommit;

    public DiffRequest() {
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

    public String getLastTestedCommit() {
        return lastTestedCommit;
    }

    public void setLastTestedCommit(String lastTestedCommit) {
        this.lastTestedCommit = lastTestedCommit;
    }
}
