package com.apexeval.backend.orchestration;

import jakarta.validation.constraints.NotBlank;

public class RunTestRequest {

    @NotBlank
    private String workspacePath;

    @NotBlank
    private String assignmentPath;

    @NotBlank
    private String assignmentId;

    private String lastTestedCommit;

    public RunTestRequest() {
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

    public String getLastTestedCommit() {
        return lastTestedCommit;
    }

    public void setLastTestedCommit(String lastTestedCommit) {
        this.lastTestedCommit = lastTestedCommit;
    }
}
