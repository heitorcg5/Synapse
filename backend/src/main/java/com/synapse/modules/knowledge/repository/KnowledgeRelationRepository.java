package com.synapse.modules.knowledge.repository;

import com.synapse.modules.knowledge.entity.KnowledgeRelation;
import com.synapse.modules.knowledge.entity.KnowledgeRelationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeRelationRepository extends JpaRepository<KnowledgeRelation, UUID> {

    List<KnowledgeRelation> findByUserIdAndSourceItemIdOrderByConfidenceScoreDesc(UUID userId, UUID sourceItemId);

    List<KnowledgeRelation> findByUserIdAndTargetItemIdOrderByConfidenceScoreDesc(UUID userId, UUID targetItemId);

    Optional<KnowledgeRelation> findBySourceItemIdAndTargetItemIdAndRelationType(
            UUID sourceItemId,
            UUID targetItemId,
            KnowledgeRelationType relationType
    );

    List<KnowledgeRelation> findByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM KnowledgeRelation r WHERE r.sourceItemId = :itemId OR r.targetItemId = :itemId")
    void deleteAllTouchingKnowledgeItem(@Param("itemId") UUID itemId);
}
