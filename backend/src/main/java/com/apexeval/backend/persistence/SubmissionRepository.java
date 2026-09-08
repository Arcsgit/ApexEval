package com.apexeval.backend.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<SubmissionEntity, UUID> {

    @Query("select s from SubmissionEntity s where s.userId = :userId and s.assignmentId = :assignmentId")
    Optional<SubmissionEntity> findByUserAndAssignment(@Param("userId") UUID userId, @Param("assignmentId") String assignmentId);

    @Query("select s from SubmissionEntity s where s.assignmentId = :assignmentId")
    java.util.List<SubmissionEntity> findByAssignmentId(@Param("assignmentId") String assignmentId);
}