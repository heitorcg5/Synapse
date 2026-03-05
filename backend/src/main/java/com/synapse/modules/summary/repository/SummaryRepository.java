package com.synapse.modules.summary.repository;

import com.synapse.modules.summary.entity.Summary;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SummaryRepository extends JpaRepository<Summary, UUID> {

    Optional<Summary> findByContentId(UUID contentId);
}
