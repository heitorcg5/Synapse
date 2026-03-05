package com.synapse.modules.processing.repository;

import com.synapse.modules.processing.entity.ProcessingJob;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessingJobRepository extends JpaRepository<ProcessingJob, UUID> {

    List<ProcessingJob> findByContentIdOrderByCreatedAtDesc(UUID contentId);

    Optional<ProcessingJob> findFirstByContentIdOrderByCreatedAtDesc(UUID contentId);
}
