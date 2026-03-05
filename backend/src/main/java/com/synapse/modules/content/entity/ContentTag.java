package com.synapse.modules.content.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "content_tags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ContentTag.ContentTagId.class)
public class ContentTag {

    @Id
    @Column(name = "content_id")
    private UUID contentId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentTagId implements Serializable {
        private UUID contentId;
        private UUID tagId;
    }
}
