package com.synapse.modules.processing.repository;

import com.synapse.modules.processing.entity.AnalysisResult;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, UUID> {

    Optional<AnalysisResult> findByInboxItemId(UUID inboxItemId);

    void deleteByInboxItemId(UUID inboxItemId);
}
