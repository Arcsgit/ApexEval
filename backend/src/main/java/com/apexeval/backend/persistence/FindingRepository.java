package com.apexeval.backend.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FindingRepository extends JpaRepository<FindingEntity, UUID> {

    @Query("select f from FindingEntity f where f.submissionId = :submissionId")
    java.util.List<FindingEntity> findBySubmissionId(@Param("submissionId") UUID submissionId);
}