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

    List<ProcessingJob> findByInboxItemIdOrderByCreatedAtDesc(UUID inboxItemId);

    Optional<ProcessingJob> findFirstByInboxItemIdOrderByCreatedAtDesc(UUID inboxItemId);

    @Query("SELECT j FROM ProcessingJob j, InboxItem c "
            + "WHERE j.inboxItemId = c.id AND c.userId = :userId ORDER BY j.createdAt DESC")
    List<ProcessingJob> findForUserOrderByCreatedAtDesc(@Param("userId") UUID userId);

    List<ProcessingJob> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.QueryHints({@jakarta.persistence.QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")}) // Postgres SKIP LOCKED
    @Query("SELECT j FROM ProcessingJob j WHERE j.status = :status ORDER BY j.createdAt ASC")
    List<ProcessingJob> findNextJobs(@Param("status") String status, Pageable pageable);

    void deleteByInboxItemId(UUID inboxItemId);
}
