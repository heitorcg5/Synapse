package com.synapse.modules.inbox.repository;

import com.synapse.modules.inbox.entity.InboxItemTag;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InboxItemTagRepository extends JpaRepository<InboxItemTag, InboxItemTag.ContentTagId> {

    List<InboxItemTag> findByInboxItemId(UUID inboxItemId);

    void deleteByInboxItemId(UUID inboxItemId);
}
