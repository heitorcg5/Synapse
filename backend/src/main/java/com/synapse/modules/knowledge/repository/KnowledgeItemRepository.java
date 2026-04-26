package com.synapse.modules.knowledge.repository;

import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.knowledge.entity.KnowledgeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeItemRepository extends JpaRepository<KnowledgeItem, UUID> {

    /** Newest capture first (matches UI, which shows {@link InboxItem#getCapturedAt()}). */
    @Query("SELECT k FROM KnowledgeItem k JOIN InboxItem c ON k.inboxItemId = c.id "
            + "WHERE k.userId = :userId AND c.userId = k.userId ORDER BY c.capturedAt DESC")
    List<KnowledgeItem> findByUserIdOrderByInboxCapturedAtDesc(@Param("userId") UUID userId);

    @Query("SELECT k FROM KnowledgeItem k JOIN InboxItem c ON k.inboxItemId = c.id "
            + "WHERE k.userId = :userId AND c.userId = k.userId ORDER BY c.capturedAt ASC")
    List<KnowledgeItem> findByUserIdOrderByInboxCapturedAtAsc(@Param("userId") UUID userId);

    Optional<KnowledgeItem> findByIdAndUserId(UUID id, UUID userId);

    Optional<KnowledgeItem> findByInboxItemId(UUID inboxItemId);

    List<KnowledgeItem> findByInboxItemIdIn(List<UUID> inboxItemIds);

    /**
     * PostgreSQL-native filter: avoids JPQL/HQL quirks (reserved words, DISTINCT+ORDER BY, EXISTS subquery mapping).
     */
    @Query(value = """
            SELECT
                k.id,
                k.user_id,
                k.inbox_item_id,
                k.title,
                k.body,
                k.summary,
                k.language,
                k.source_content_type,
                k.created_at,
                k.folder_id
            FROM knowledge_items k
            INNER JOIN inbox_items c ON c.id = k.inbox_item_id AND c.user_id = k.user_id
            WHERE k.user_id = :userId
              AND (
                CAST(:fromInstant AS timestamptz) IS NULL
                OR c.captured_at >= CAST(:fromInstant AS timestamptz)
              )
              AND (
                CAST(:toExclusive AS timestamptz) IS NULL
                OR c.captured_at < CAST(:toExclusive AS timestamptz)
              )
              AND (
                COALESCE(CAST(:sourceType AS text), '') = ''
                OR upper(coalesce(nullif(btrim(k.source_content_type), ''), c.type, ''))
                  = upper(CAST(:sourceType AS text))
              )
              AND (
                COALESCE(CAST(:tagName AS text), '') = ''
                OR EXISTS (
                  SELECT 1
                  FROM inbox_item_tags ct
                  INNER JOIN tags t ON t.id = ct.tag_id
                  WHERE ct.inbox_item_id = k.inbox_item_id
                    AND lower(t.name) = lower(CAST(:tagName AS text))
                )
              )
            ORDER BY c.captured_at DESC
            """, nativeQuery = true)
    List<KnowledgeItem> search(
            @Param("userId") UUID userId,
            @Param("fromInstant") Instant fromInstant,
            @Param("toExclusive") Instant toExclusive,
            @Param("sourceType") String sourceType,
            @Param("tagName") String tagName
    );

    /**
     * Native SQL: Hibernate/JPQL with DISTINCT + ORDER BY LOWER(...) failed at runtime on some setups.
     */
    /**
     * PostgreSQL: {@code SELECT DISTINCT col ORDER BY lower(col)} is invalid (ORDER BY must appear in select list).
     * {@code GROUP BY} yields distinct names and allows case-insensitive ordering.
     */
    @Query(value = """
            SELECT t.name
            FROM knowledge_items k
            INNER JOIN inbox_item_tags ct ON ct.inbox_item_id = k.inbox_item_id
            INNER JOIN tags t ON t.id = ct.tag_id
            WHERE k.user_id = :userId
            GROUP BY t.name
            ORDER BY lower(t.name)
            """, nativeQuery = true)
    List<String> findDistinctTagNamesByUserId(@Param("userId") UUID userId);

    @Query(value = """
            SELECT DISTINCT coalesce(nullif(btrim(k.source_content_type), ''), c.type)
            FROM knowledge_items k
            INNER JOIN inbox_items c ON c.id = k.inbox_item_id AND c.user_id = k.user_id
            WHERE k.user_id = :userId
              AND coalesce(nullif(btrim(k.source_content_type), ''), c.type) IS NOT NULL
              AND btrim(coalesce(nullif(btrim(k.source_content_type), ''), c.type)) <> ''
            ORDER BY 1
            """, nativeQuery = true)
    List<String> findDistinctSourceTypesByUserId(@Param("userId") UUID userId);
}
