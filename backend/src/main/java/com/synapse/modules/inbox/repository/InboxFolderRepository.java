package com.synapse.modules.inbox.repository;

import com.synapse.modules.inbox.entity.InboxFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InboxFolderRepository extends JpaRepository<InboxFolder, UUID> {

    List<InboxFolder> findByUserIdOrderByNameAsc(UUID userId);

    Optional<InboxFolder> findByIdAndUserId(UUID id, UUID userId);
}
