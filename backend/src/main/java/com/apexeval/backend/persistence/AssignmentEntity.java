package com.apexeval.backend.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * An assignment. The {@code manifest} column stores the full
 * {@code AssignmentManifest} (Java record) as JSONB. The frontend
 * reads this when displaying the assignment detail page or
 * populating the edit-assignment form.
 *
 * <p>The {@code hiddenTestsPath} column points to where the hidden
 * test bundle lives - on disk for now, an S3 URL in a follow-up.
 * It's nullable because an assignment in draft might not have its
 * hidden tests uploaded yet.</p>
 */
@Entity
@Table(name = "assignments")
public class AssignmentEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description_md")
    private String descriptionMd;

    @Column(name = "language", nullable = false)
    private String language;

    @Column(name = "manifest", nullable = false, columnDefinition = "jsonb")
    private String manifest;

    @Column(name = "hidden_tests_path")
    private String hiddenTestsPath;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "due_at")
    private OffsetDateTime dueAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected AssignmentEntity() { }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescriptionMd() { return descriptionMd; }
    public void setDescriptionMd(String descriptionMd) { this.descriptionMd = descriptionMd; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getManifest() { return manifest; }
    public void setManifest(String manifest) { this.manifest = manifest; }
    public String getHiddenTestsPath() { return hiddenTestsPath; }
    public void setHiddenTestsPath(String hiddenTestsPath) { this.hiddenTestsPath = hiddenTestsPath; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime publishedAt) { this.publishedAt = publishedAt; }
    public OffsetDateTime getDueAt() { return dueAt; }
    public void setDueAt(OffsetDateTime dueAt) { this.dueAt = dueAt; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}