package com.apexeval.backend.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A submission record. One submission per student per assignment.
 * The source hash is stored so the cache can determine a miss
 * and re-trigger the sandbox if source code changes.
 */
@Entity
@Table(name = "submissions")
public class SubmissionEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "assignment_id", nullable = false)
    private String assignmentId;

    @Column(name = "source_hash", nullable = false)
    private String sourceHash;

    @Column(name = "source_path", nullable = false)
    private String sourcePath;

    @Column(name = "status", nullable = false)
    private String status; // PENDING, RUNNING, COMPLETED, FAILED

    @Column(name = "output_json")
    private String outputJson; // persisted as JSON string

    @Column(name = "executed_at")
    private OffsetDateTime executedAt;

    @Column(name = "error_message")
    private String errorMessage;

    protected SubmissionEntity() { }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getAssignmentId() { return assignmentId; }
    public void setAssignmentId(String assignmentId) { this.assignmentId = assignmentId; }
    public String getSourceHash() { return sourceHash; }
    public void setSourceHash(String sourceHash) { this.sourceHash = sourceHash; }
    public String getSourcePath() { return sourcePath; }
    public void setSourcePath(String sourcePath) { this.sourcePath = sourcePath; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getOutputJson() { return outputJson; }
    public void setOutputJson(String outputJson) { this.outputJson = outputJson; }
    public OffsetDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(OffsetDateTime executedAt) { this.executedAt = executedAt; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}