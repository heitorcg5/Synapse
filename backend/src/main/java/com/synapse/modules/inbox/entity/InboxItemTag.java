package com.synapse.modules.inbox.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "inbox_item_tags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(InboxItemTag.ContentTagId.class)
public class InboxItemTag {

    @Id
    @Column(name = "inbox_item_id")
    private UUID inboxItemId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentTagId implements Serializable {
        private UUID inboxItemId;
        private UUID tagId;
    }
}
