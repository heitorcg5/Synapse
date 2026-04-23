package com.synapse.modules.content.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.ContentFolderResponse;
import com.synapse.modules.content.dto.AssignContentFolderRequest;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.dto.CreateContentFolderRequest;
import com.synapse.modules.content.dto.SummaryResponse;
import com.synapse.modules.content.dto.TagResponse;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.entity.ContentFolder;
import com.synapse.modules.content.entity.ContentTag;
import com.synapse.modules.content.repository.ContentFolderRepository;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.content.repository.TagRepository;
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

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_READY = "READY";
    private static final String STATUS_FAILED = "FAILED";

    private final ContentRepository contentRepository;
    private final ContentFolderRepository contentFolderRepository;
    private final ContentTagRepository contentTagRepository;
    private final TagRepository tagRepository;
    private final SummaryRepository summaryRepository;
    private final UserRepository userRepository;

    private final com.synapse.modules.processing.service.ProcessingService processingService;

    @Transactional
    public ContentResponse create(UUID userId, CreateContentRequest request, String captureLanguage, String acceptLanguageHeader) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        UUID folderId = request.getFolderId();
        if (folderId != null) {
            contentFolderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        }
        String lang = captureLanguage != null && !captureLanguage.isBlank() ? captureLanguage : "en";
        Content content = Content.builder()
                .userId(userId)
                .type(request.getType())
                .sourceUrl(request.getSourceUrl())
                .rawContent(request.getRawContent())
                .language(lang)
                .folderId(folderId)
                .status(STATUS_PENDING)
                .build();
        content = contentRepository.save(content);
        // Capture-first flow: always land in inbox; processing starts only when user triggers it.
        Map<UUID, String> folderNames = content.getFolderId() == null
                ? Map.of()
                : loadFolderNames(userId, Set.of(content.getFolderId()));
        return toResponse(content, folderNames);
    }

    /**
     * Run the full AI pipeline for a pending capture (e.g. manual mode or user-triggered).
     */
    public void runProcessingPipeline(UUID contentId, UUID userId, String acceptLanguageHeader) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found");
        }
        if (STATUS_PROCESSING.equals(content.getStatus())) {
            throw new IllegalArgumentException("Content is already processing");
        }
        if (!STATUS_PENDING.equals(content.getStatus()) && !STATUS_FAILED.equals(content.getStatus())) {
            throw new IllegalArgumentException("Only pending or failed captures can run the processing pipeline");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), acceptLanguageHeader);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        processingService.startManualPipelineAsync(contentId, userId, opts, pipeline);
    }

    @Transactional(readOnly = true)
    public ContentResponse getById(UUID id, UUID userId) {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found");
        }
        Set<UUID> folderIds = content.getFolderId() == null ? Set.of() : Set.of(content.getFolderId());
        return toResponse(content, loadFolderNames(userId, folderIds));
    }

    @Transactional(readOnly = true)
    public List<ContentResponse> listByUser(UUID userId) {
        List<Content> rows = contentRepository.findByUserIdOrderByUploadedAtDesc(userId);
        Map<UUID, String> folderNames = loadFolderNames(
                userId,
                rows.stream().map(Content::getFolderId).collect(Collectors.toSet())
        );
        return rows.stream()
                .map(content -> toResponse(content, folderNames))
                .collect(Collectors.toList());
    }

    /** Digital Brain inbox: items awaiting user review / processing. */
    @Transactional(readOnly = true)
    public List<ContentResponse> listInboxPending(UUID userId) {
        List<Content> rows = contentRepository.findByUserIdAndStatusInOrderByUploadedAtDesc(
                userId,
                List.of(STATUS_PENDING, STATUS_PROCESSING, STATUS_READY, STATUS_FAILED)
        );
        Map<UUID, String> folderNames = loadFolderNames(
                userId,
                rows.stream().map(Content::getFolderId).collect(Collectors.toSet())
        );
        return rows.stream()
                .map(content -> toResponse(content, folderNames))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContentFolderResponse> listFolders(UUID userId) {
        return contentFolderRepository.findByUserIdOrderByNameAsc(userId).stream()
                .map(folder -> ContentFolderResponse.builder()
                        .id(folder.getId())
                        .name(folder.getName())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public ContentFolderResponse createFolder(UUID userId, CreateContentFolderRequest request) {
        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isBlank()) {
            throw new IllegalArgumentException("Folder name is required");
        }
        ContentFolder saved = contentFolderRepository.save(ContentFolder.builder()
                .userId(userId)
                .name(name)
                .build());
        return ContentFolderResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .build();
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found");
        }
        contentRepository.delete(content);
    }

    @Transactional
    public ContentResponse assignFolder(UUID contentId, UUID userId, AssignContentFolderRequest request) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CONTENT_NOT_FOUND", "Content not found");
        }

        UUID folderId = request.getFolderId();
        if (folderId != null) {
            contentFolderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
            content.setFolderId(folderId);
        } else {
            content.setFolderId(null);
        }

        Content saved = contentRepository.save(content);
        Map<UUID, String> folderNames = saved.getFolderId() == null
                ? Map.of()
                : loadFolderNames(userId, Set.of(saved.getFolderId()));
        return toResponse(saved, folderNames);
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary(UUID contentId, UUID userId) {
        getById(contentId, userId); // ensure access
        Summary summary = summaryRepository.findByContentId(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("SUMMARY_NOT_FOUND", "Summary not found for this content"));
        return SummaryResponse.builder()
                .id(summary.getId())
                .contentId(summary.getContentId())
                .summaryText(summary.getSummaryText())
                .model(summary.getModel())
                .language(summary.getLanguage())
                .createdAt(summary.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTags(UUID contentId, UUID userId) {
        getById(contentId, userId); // ensure access
        List<ContentTag> contentTags = contentTagRepository.findByContentId(contentId);
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
                    .collect(Collectors.toMap(ContentFolder::getId, ContentFolder::getName));
        } catch (RuntimeException ex) {
            // Keep inbox/content listing available even if folder storage is temporarily unavailable.
            log.warn("Could not resolve content folder names for user {}: {}", userId, ex.getMessage());
            return Map.of();
        }
    }

    private ContentResponse toResponse(Content content, Map<UUID, String> folderNames) {
        return ContentResponse.builder()
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
                .folderName(folderNames.get(content.getFolderId()))
                .status(content.getStatus())
                .uploadedAt(content.getUploadedAt())
                .build();
    }
}
