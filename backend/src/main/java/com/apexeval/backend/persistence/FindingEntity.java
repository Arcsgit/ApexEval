package com.apexeval.backend.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One finding (assertion/test result) belonging to a submission.
 */
@Entity
@Table(name = "findings")
public class FindingEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "checksum", nullable = false)
    private String checksum;

    @Column(name = "passed", nullable = false)
    private boolean passed;

    @Column(name = "output_snippet")
    private String outputSnippet;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "executed_at", nullable = false)
    private OffsetDateTime executedAt;

    protected FindingEntity() { }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSubmissionId() { return submissionId; }
    public void setSubmissionId(UUID submissionId) { this.submissionId = submissionId; }
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    public boolean isPassed() { return passed; }
    public void setPassed(boolean passed) { this.passed = passed; }
    public String getOutputSnippet() { return outputSnippet; }
    public void setOutputSnippet(String outputSnippet) { this.outputSnippet = outputSnippet; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public OffsetDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(OffsetDateTime executedAt) { this.executedAt = executedAt; }
}