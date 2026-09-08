package com.apexeval.backend.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One day in a course's schedule. The student app groups days by
 * week (computed at the application layer, not stored). The
 * {@code dayIndex} is 0-based within the course.
 */
@Entity
@Table(name = "course_days")
public class CourseDayEntity {

    @EmbeddedId
    private CourseDayId id;

    @Column(name = "scheduled_for", nullable = false)
    private LocalDate scheduledFor;

    protected CourseDayEntity() { }

    public CourseDayId getId() { return id; }
    public void setId(CourseDayId id) { this.id = id; }
    public LocalDate getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(LocalDate scheduledFor) { this.scheduledFor = scheduledFor; }

    @Embeddable
    public static class CourseDayId implements java.io.Serializable {
        @Column(name = "course_id", nullable = false)
        private UUID courseId;

        @Column(name = "day_index", nullable = false)
        private int dayIndex;

        public CourseDayId() { }
        public CourseDayId(UUID courseId, int dayIndex) {
            this.courseId = courseId;
            this.dayIndex = dayIndex;
        }
        public UUID getCourseId() { return courseId; }
        public int getDayIndex() { return dayIndex; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof CourseDayId other)) return false;
            return dayIndex == other.dayIndex && courseId.equals(other.courseId);
        }
        @Override public int hashCode() { return courseId.hashCode() * 31 + dayIndex; }
    }
}
