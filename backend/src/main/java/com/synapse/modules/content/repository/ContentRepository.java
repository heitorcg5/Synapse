package com.synapse.modules.content.repository;

import com.synapse.modules.content.entity.Content;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentRepository extends JpaRepository<Content, UUID> {

    List<Content> findByUserIdOrderByUploadedAtDesc(UUID userId);
}
