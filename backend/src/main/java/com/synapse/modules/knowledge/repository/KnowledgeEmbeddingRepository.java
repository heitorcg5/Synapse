package com.synapse.modules.knowledge.repository;

import com.synapse.modules.knowledge.entity.KnowledgeEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeEmbeddingRepository extends JpaRepository<KnowledgeEmbedding, UUID> {

    @Query(value = """
            SELECT * FROM knowledge_embeddings
            WHERE user_id = :userId
            ORDER BY embedding <-> CAST(:vector AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeEmbedding> findNearestNeighbors(
            @Param("userId") UUID userId,
            @Param("vector") String vectorString,
            @Param("limit") int limit
    );
    
    void deleteByInboxItemId(UUID inboxItemId);
}
