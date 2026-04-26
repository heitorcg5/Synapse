package com.synapse.modules.notification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class NotificationResponse {

    private UUID id;
    private String type;
    private UUID inboxItemId;
    private UUID relatedInboxItemId;
    private UUID knowledgeItemId;
    private Integer connectionCount;
    private boolean read;
    private Instant createdAt;
}
