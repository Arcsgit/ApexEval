package com.apexeval.backend.persistence;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A user of the platform. The {@code role} column is the source of
 * truth for the Angular frontend's route guards. The frontend reads
 * this via {@code GET /api/auth/me} and the role-claim endpoint.
 *
 * <p>For STUDENT users, {@code workspacePath} is the absolute path
 * to the student's git workspace. The RunTestService rejects
 * requests whose request.workspacePath does not match the JWT's
 * workspacePath claim. See SCALING_PLAN.md §Auth.
 *
 * <p>The {@code passwordHash} column is bcrypt/argon2 - we don't
 * actually use it for the in-memory dev flow, but the column
 * exists so the auth story is complete when the Angular frontend
 * starts talking to the real backend.</p>
 */
@Entity
@Table(name = "users")
public class UserEntity {

    public enum Role {
        SUPERADMIN, ADMIN, STUDENT
    }

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Column(name = "workspace_path")
    private String workspacePath;

    @Column(name = "is_disabled", nullable = false)
    private boolean disabled;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    protected UserEntity() { }  // for JPA

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getWorkspacePath() { return workspacePath; }
    public void setWorkspacePath(String workspacePath) { this.workspacePath = workspacePath; }
    public boolean isDisabled() { return disabled; }
    public void setDisabled(boolean disabled) { this.disabled = disabled; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(OffsetDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
}
