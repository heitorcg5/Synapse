package com.synapse.modules.knowledge.repository;

import com.synapse.modules.knowledge.entity.KnowledgeFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeFolderRepository extends JpaRepository<KnowledgeFolder, UUID> {

    List<KnowledgeFolder> findByUserIdOrderByNameAsc(UUID userId);

    Optional<KnowledgeFolder> findByIdAndUserId(UUID id, UUID userId);
}
