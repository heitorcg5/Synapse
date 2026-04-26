package com.synapse.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class KnowledgeItemResponse {

    private UUID id;
    private UUID inboxItemId;
    private String title;
    private String body;
    private String summary;
    private String language;
    private String sourceContentType;
    private List<String> tags;

    private UUID folderId;
    private String folderName;
    private List<KnowledgeLinkedNoteResponse> relatedNotes;
    private List<KnowledgeLinkedNoteResponse> backlinks;
    /**
     * When the knowledge row was created (e.g. after confirming AI suggestions).
     */
    private Instant createdAt;
    /**
     * When the linked inbox capture ({@code contents.captured_at}) was stored — usually what users mean by “the date”.
     */
    private Instant inboxCapturedAt;
}
