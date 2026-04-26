package com.synapse.modules.knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "knowledge_embeddings", indexes = {
        @Index(name = "idx_knowledge_embeddings_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "inbox_item_id", nullable = false)
    private UUID inboxItemId;

    @Column(name = "summary_id")
    private UUID summaryId;

    @Column(name = "knowledge_item_id")
    private UUID knowledgeItemId;

    @Convert(converter = VectorConverter.class)
    @Column(columnDefinition = "vector(768)", nullable = false)
    private List<Float> embedding;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
