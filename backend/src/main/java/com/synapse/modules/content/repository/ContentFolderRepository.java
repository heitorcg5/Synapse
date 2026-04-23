package com.synapse.modules.content.repository;

import com.synapse.modules.content.entity.ContentFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentFolderRepository extends JpaRepository<ContentFolder, UUID> {

    List<ContentFolder> findByUserIdOrderByNameAsc(UUID userId);

    Optional<ContentFolder> findByIdAndUserId(UUID id, UUID userId);
}
