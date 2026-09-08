package com.apexeval.backend.persistence;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * A student's enrollment in a course. The composite primary key
 * makes the insert idempotent. The {@code courseRole} column lets
 * the same user be a STUDENT in one course and an ASSISTANT in
 * another.
 */
@Entity
@Table(name = "course_enrollments")
@IdClass(CourseEnrollmentEntity.EnrollmentId.class)
public class CourseEnrollmentEntity {

    @Id
    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private OffsetDateTime enrolledAt;

    @Column(name = "course_role", nullable = false)
    private String courseRole;

    protected CourseEnrollmentEntity() { }

    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public OffsetDateTime getEnrolledAt() { return enrolledAt; }
    public void setEnrolledAt(OffsetDateTime enrolledAt) { this.enrolledAt = enrolledAt; }
    public String getCourseRole() { return courseRole; }
    public void setCourseRole(String courseRole) { this.courseRole = courseRole; }

    public static class EnrollmentId implements Serializable {
        private UUID courseId;
        private UUID userId;

        public EnrollmentId() { }
        public EnrollmentId(UUID courseId, UUID userId) {
            this.courseId = courseId;
            this.userId = userId;
        }
        @Override public boolean equals(Object o) {
            if (!(o instanceof EnrollmentId other)) return false;
            return courseId.equals(other.courseId) && userId.equals(other.userId);
        }
        @Override public int hashCode() { return Objects.hash(courseId, userId); }
    }
}
