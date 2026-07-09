package com.synapse.modules.inbox.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.inbox.dto.InboxItemResponse;
import com.synapse.modules.inbox.dto.InboxFolderResponse;
import com.synapse.modules.inbox.dto.AssignInboxFolderRequest;
import com.synapse.modules.inbox.dto.CreateInboxItemRequest;
import com.synapse.modules.inbox.dto.CreateInboxFolderRequest;
import com.synapse.modules.inbox.dto.SummaryResponse;
import com.synapse.modules.inbox.dto.TagResponse;
import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.entity.InboxFolder;
import com.synapse.modules.inbox.entity.InboxItemTag;
import com.synapse.modules.inbox.entity.Tag;
import com.synapse.modules.inbox.repository.InboxFolderRepository;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.inbox.repository.InboxItemTagRepository;
import com.synapse.modules.inbox.repository.TagRepository;
import com.synapse.modules.summary.entity.Summary;
import com.synapse.modules.summary.repository.SummaryRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.util.UserAiPreferences;
import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.processing.ProcessingPipelineOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InboxService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_READY = "READY";
    private static final String STATUS_FAILED = "FAILED";
    private static final int LIST_PREVIEW_MAX_CHARS = 220;

    private final InboxItemRepository inboxItemRepository;
    private final InboxFolderRepository contentFolderRepository;
    private final InboxItemTagRepository contentTagRepository;
    private final TagRepository tagRepository;
    private final SummaryRepository summaryRepository;
    private final UserRepository userRepository;

    private final com.synapse.modules.processing.service.ProcessingService processingService;

    @Transactional
    public InboxItemResponse create(UUID userId, CreateInboxItemRequest request, String captureLanguage, String acceptLanguageHeader) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        UUID folderId = request.getFolderId();
        if (folderId != null) {
            contentFolderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        }
        String lang = captureLanguage != null && !captureLanguage.isBlank() ? captureLanguage : "en";
        InboxItem content = InboxItem.builder()
                .userId(userId)
                .type(request.getType())
                .sourceUrl(request.getSourceUrl())
                .rawContent(request.getRawContent())
                .language(lang)
                .folderId(folderId)
                .status(STATUS_PENDING)
                .build();
        content = inboxItemRepository.save(content);
        // Capture-first flow: always land in inbox; processing starts only when user triggers it.
        Map<UUID, String> folderNames = content.getFolderId() == null
                ? Map.of()
                : loadFolderNames(userId, Set.of(content.getFolderId()));
        return toResponse(content, folderNames);
    }

    /**
     * Run the full AI pipeline for a pending capture (e.g. manual mode or user-triggered).
     */
    public void runProcessingPipeline(UUID inboxItemId, UUID userId, String acceptLanguageHeader) {
        InboxItem content = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found");
        }
        if (STATUS_PROCESSING.equals(content.getStatus())) {
            throw new IllegalArgumentException("InboxItem is already processing");
        }
        if (!STATUS_PENDING.equals(content.getStatus()) && !STATUS_FAILED.equals(content.getStatus())) {
            throw new IllegalArgumentException("Only pending or failed captures can run the processing pipeline");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), acceptLanguageHeader);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        processingService.startManualPipelineAsync(inboxItemId, userId, opts, pipeline);
    }

    @Transactional(readOnly = true)
    public InboxItemResponse getById(UUID id, UUID userId) {
        InboxItem content = inboxItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found");
        }
        Set<UUID> folderIds = content.getFolderId() == null ? Set.of() : Set.of(content.getFolderId());
        return toResponse(content, loadFolderNames(userId, folderIds));
    }

    @Transactional(readOnly = true)
    public List<InboxItemResponse> listByUser(UUID userId) {
        List<InboxItem> rows = inboxItemRepository.findByUserIdOrderByCapturedAtDesc(userId);
        Map<UUID, String> folderNames = loadFolderNames(
                userId,
                rows.stream().map(InboxItem::getFolderId).collect(Collectors.toSet())
        );
        return rows.stream()
                .map(content -> toResponse(content, folderNames))
                .collect(Collectors.toList());
    }

    /** Digital Brain inbox: items awaiting user review / processing. */
    @Transactional(readOnly = true)
    public List<InboxItemResponse> listInboxPending(UUID userId) {
        List<InboxItem> rows = inboxItemRepository.findByUserIdAndStatusInOrderByCapturedAtDesc(
                userId,
                List.of(STATUS_PENDING, STATUS_PROCESSING, STATUS_READY, STATUS_FAILED)
        );
        Map<UUID, String> folderNames = loadFolderNames(
                userId,
                rows.stream().map(InboxItem::getFolderId).collect(Collectors.toSet())
        );
        Set<UUID> inboxIds = rows.stream().map(InboxItem::getId).collect(Collectors.toSet());
        Map<UUID, String> summaryPreviews = loadSummaryPreviews(inboxIds);
        Map<UUID, List<String>> tagsByInbox = loadTagsByInboxIds(inboxIds);
        return rows.stream()
                .map(content -> toListResponse(
                        content,
                        folderNames,
                        summaryPreviews.get(content.getId()),
                        tagsByInbox.getOrDefault(content.getId(), List.of())
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InboxFolderResponse> listFolders(UUID userId) {
        return contentFolderRepository.findByUserIdOrderByNameAsc(userId).stream()
                .map(folder -> InboxFolderResponse.builder()
                        .id(folder.getId())
                        .name(folder.getName())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public InboxFolderResponse createFolder(UUID userId, CreateInboxFolderRequest request) {
        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isBlank()) {
            throw new IllegalArgumentException("Folder name is required");
        }
        InboxFolder saved = contentFolderRepository.save(InboxFolder.builder()
                .userId(userId)
                .name(name)
                .build());
        return InboxFolderResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .build();
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        InboxItem content = inboxItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found");
        }
        inboxItemRepository.delete(content);
    }

    @Transactional
    public InboxItemResponse assignFolder(UUID inboxItemId, UUID userId, AssignInboxFolderRequest request) {
        InboxItem content = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "InboxItem not found");
        }

        UUID folderId = request.getFolderId();
        if (folderId != null) {
            contentFolderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
            content.setFolderId(folderId);
        } else {
            content.setFolderId(null);
        }

        InboxItem saved = inboxItemRepository.save(content);
        Map<UUID, String> folderNames = saved.getFolderId() == null
                ? Map.of()
                : loadFolderNames(userId, Set.of(saved.getFolderId()));
        return toResponse(saved, folderNames);
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary(UUID inboxItemId, UUID userId) {
        getById(inboxItemId, userId); // ensure access
        Summary summary = summaryRepository.findByInboxItemId(inboxItemId)
                .orElseThrow(() -> new ResourceNotFoundException("SUMMARY_NOT_FOUND", "Summary not found for this content"));
        return SummaryResponse.builder()
                .id(summary.getId())
                .inboxItemId(summary.getInboxItemId())
                .summaryText(summary.getSummaryText())
                .model(summary.getModel())
                .language(summary.getLanguage())
                .createdAt(summary.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTags(UUID inboxItemId, UUID userId) {
        getById(inboxItemId, userId); // ensure access
        List<InboxItemTag> contentTags = contentTagRepository.findByInboxItemId(inboxItemId);
        return contentTags.stream()
                .map(ct -> tagRepository.findById(ct.getTagId()).orElse(null))
                .filter(t -> t != null)
                .map(t -> TagResponse.builder().id(t.getId()).name(t.getName()).build())
                .collect(Collectors.toList());
    }

    private Map<UUID, String> loadFolderNames(UUID userId, Set<UUID> folderIds) {
        Set<UUID> filtered = folderIds.stream()
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        if (filtered.isEmpty()) {
            return Map.of();
        }
        try {
            return contentFolderRepository.findAllById(filtered).stream()
                    .filter(folder -> userId.equals(folder.getUserId()))
                    .collect(Collectors.toMap(InboxFolder::getId, InboxFolder::getName));
        } catch (RuntimeException ex) {
            // Keep inbox/content listing available even if folder storage is temporarily unavailable.
            log.warn("Could not resolve content folder names for user {}: {}", userId, ex.getMessage());
            return Map.of();
        }
    }

    private InboxItemResponse toResponse(InboxItem content, Map<UUID, String> folderNames) {
        return InboxItemResponse.builder()
                .id(content.getId())
                .userId(content.getUserId())
                .type(content.getType())
                .sourceUrl(content.getSourceUrl())
                .rawContent(content.getRawContent())
                .language(content.getLanguage())
                .title(content.getTitle())
                .notificationsEnabled(content.getNotificationsEnabled())
                .notificationReminderAt(content.getNotificationReminderAt())
                .folderId(content.getFolderId())
                .folderName(content.getFolderId() != null ? folderNames.get(content.getFolderId()) : null)
                .status(content.getStatus())
                .capturedAt(content.getCapturedAt())
                .build();
    }

    /** Inbox list: lightweight previews only — capture is not finalized as knowledge yet. */
    private InboxItemResponse toListResponse(
            InboxItem content,
            Map<UUID, String> folderNames,
            String summaryPreview,
            List<String> tags
    ) {
        return InboxItemResponse.builder()
                .id(content.getId())
                .userId(content.getUserId())
                .type(content.getType())
                .sourceUrl(content.getSourceUrl())
                .language(content.getLanguage())
                .title(content.getTitle())
                .notificationsEnabled(content.getNotificationsEnabled())
                .notificationReminderAt(content.getNotificationReminderAt())
                .folderId(content.getFolderId())
                .folderName(content.getFolderId() != null ? folderNames.get(content.getFolderId()) : null)
                .status(content.getStatus())
                .capturedAt(content.getCapturedAt())
                .contentPreview(truncatePreview(content.getRawContent()))
                .summaryPreview(summaryPreview)
                .tags(tags.isEmpty() ? null : tags)
                .build();
    }

    private Map<UUID, String> loadSummaryPreviews(Set<UUID> inboxIds) {
        if (inboxIds.isEmpty()) {
            return Map.of();
        }
        return summaryRepository.findByInboxItemIdIn(inboxIds).stream()
                .filter(s -> s.getSummaryText() != null && !s.getSummaryText().isBlank())
                .collect(Collectors.toMap(
                        Summary::getInboxItemId,
                        s -> truncatePreview(s.getSummaryText()),
                        (a, b) -> a
                ));
    }

    private Map<UUID, List<String>> loadTagsByInboxIds(Set<UUID> inboxIds) {
        if (inboxIds.isEmpty()) {
            return Map.of();
        }
        List<InboxItemTag> rows = contentTagRepository.findByInboxItemIdIn(inboxIds);
        if (rows.isEmpty()) {
            return Map.of();
        }
        Set<UUID> tagIds = rows.stream().map(InboxItemTag::getTagId).collect(Collectors.toSet());
        Map<UUID, String> tagNames = tagRepository.findAllById(tagIds).stream()
                .collect(Collectors.toMap(Tag::getId, Tag::getName));
        Map<UUID, List<String>> byInbox = new HashMap<>();
        for (InboxItemTag row : rows) {
            String name = tagNames.get(row.getTagId());
            if (name == null || name.isBlank()) {
                continue;
            }
            byInbox.computeIfAbsent(row.getInboxItemId(), ignored -> new ArrayList<>()).add(name);
        }
        return byInbox;
    }

    private static String truncatePreview(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= LIST_PREVIEW_MAX_CHARS) {
            return normalized;
        }
        return normalized.substring(0, LIST_PREVIEW_MAX_CHARS) + "…";
    }
}
