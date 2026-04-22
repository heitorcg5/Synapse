package com.synapse.modules.processing.repository;

import com.synapse.modules.processing.entity.ProcessingJob;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessingJobRepository extends JpaRepository<ProcessingJob, UUID> {

    List<ProcessingJob> findByContentIdOrderByCreatedAtDesc(UUID contentId);

    Optional<ProcessingJob> findFirstByContentIdOrderByCreatedAtDesc(UUID contentId);

    @Query("SELECT j FROM ProcessingJob j, Content c "
            + "WHERE j.contentId = c.id AND c.userId = :userId ORDER BY j.createdAt DESC")
    List<ProcessingJob> findForUserOrderByCreatedAtDesc(@Param("userId") UUID userId);

    List<ProcessingJob> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);

    void deleteByContentId(UUID contentId);
}
