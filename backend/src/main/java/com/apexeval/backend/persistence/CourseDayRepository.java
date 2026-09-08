package com.apexeval.backend.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseDayRepository extends JpaRepository<CourseDayEntity, CourseDayEntity.CourseDayId> {
}