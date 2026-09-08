package com.apexeval.backend.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    @Query("select u from UserEntity u where u.email = :email")
    Optional<UserEntity> findByEmail(@Param("email") String email);

    @Query("select u from UserEntity u where u.displayName = :displayName")
    Optional<UserEntity> findByDisplayName(@Param("displayName") String displayName);

    @Query("select count(u) from UserEntity u where u.role = :role")
    long countByRole(String role);
}