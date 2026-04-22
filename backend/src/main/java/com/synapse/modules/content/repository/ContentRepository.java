package com.synapse.modules.content.repository;

import com.synapse.modules.content.entity.Content;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentRepository extends JpaRepository<Content, UUID> {

    List<Content> findByUserIdOrderByUploadedAtDesc(UUID userId);

    List<Content> findByUserIdAndStatusOrderByUploadedAtDesc(UUID userId, String status);

    boolean existsByUserIdAndSourceUrlAndIdNot(UUID userId, String sourceUrl, UUID excludeId);

    /** Older duplicate of the same URL for this user (excluding current row). */
    List<Content> findByUserIdAndSourceUrlAndIdNotOrderByUploadedAtAsc(UUID userId, String sourceUrl, UUID id);

    List<Content> findByUserIdAndUploadedAtBefore(UUID userId, Instant before);
}
