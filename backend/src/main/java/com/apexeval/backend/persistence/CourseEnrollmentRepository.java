package com.apexeval.backend.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollmentEntity, CourseEnrollmentEntity.EnrollmentId> {

    @Query("select e from CourseEnrollmentEntity e where e.courseId = :courseId and e.courseRole = :role")
    Optional<CourseEnrollmentEntity> findEnrollmentByRole(@Param("courseId") UUID courseId, @Param("role") String role);
}