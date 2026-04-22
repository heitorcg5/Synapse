package com.synapse.modules.knowledge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "knowledge_relations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_knowledge_relation_endpoints_type",
                columnNames = {"source_item_id", "target_item_id", "relation_type"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "source_item_id", nullable = false)
    private UUID sourceItemId;

    @Column(name = "target_item_id", nullable = false)
    private UUID targetItemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 32)
    private KnowledgeRelationType relationType;

    @Column(name = "confidence_score", nullable = false)
    private double confidenceScore;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
