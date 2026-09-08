package com.apexeval.backend.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Audit log entry for compliance / change tracking. Every
 * INSERT/UPDATE on submissions, users, enrollments and
 * course assignments is written here.
 */
@Entity
@Table(name = "audit_events")
public class AuditEventEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "entity_type", nullable = false)
    private String entityType; // e.g. "SubmissionEntity"

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "action", nullable = false)
    private String action; // e.g. "INSERT", "UPDATE", "DELETE"

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;

    @Column(name = "old_json")
    private String oldJson;

    @Column(name = "new_json")
    private String newJson;

    protected AuditEventEntity() { }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public UUID getChangedBy() { return changedBy; }
    public void setChangedBy(UUID changedBy) { this.changedBy = changedBy; }
    public OffsetDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(OffsetDateTime changedAt) { this.changedAt = changedAt; }
    public String getOldJson() { return oldJson; }
    public void setOldJson(String oldJson) { this.oldJson = oldJson; }
    public String getNewJson() { return newJson; }
    public void setNewJson(String newJson) { this.newJson = newJson; }
}