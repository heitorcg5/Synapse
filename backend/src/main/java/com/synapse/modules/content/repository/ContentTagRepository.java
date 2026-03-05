package com.synapse.modules.content.repository;

import com.synapse.modules.content.entity.ContentTag;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentTagRepository extends JpaRepository<ContentTag, ContentTag.ContentTagId> {

    List<ContentTag> findByContentId(UUID contentId);

    void deleteByContentId(UUID contentId);
}
