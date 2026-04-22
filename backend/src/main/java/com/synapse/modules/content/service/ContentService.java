package com.synapse.modules.content.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.dto.SummaryResponse;
import com.synapse.modules.content.dto.TagResponse;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.entity.ContentTag;
import com.synapse.modules.content.entity.Tag;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.content.repository.TagRepository;
import com.synapse.modules.summary.entity.Summary;
import com.synapse.modules.summary.repository.SummaryRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.util.UserAiPreferences;
import com.synapse.modules.user.util.UserProcessingPreferences;
import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.processing.ProcessingPipelineOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContentService {

    private static final String STATUS_PENDING = "PENDING";

    private final ContentRepository contentRepository;
    private final ContentTagRepository contentTagRepository;
    private final TagRepository tagRepository;
    private final SummaryRepository summaryRepository;
    private final UserRepository userRepository;

    private final com.synapse.modules.processing.service.ProcessingService processingService;

    @Transactional
    public ContentResponse create(UUID userId, CreateContentRequest request, String captureLanguage, String acceptLanguageHeader) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        String lang = captureLanguage != null && !captureLanguage.isBlank() ? captureLanguage : "en";
        Content content = Content.builder()
                .userId(userId)
                .type(request.getType())
                .sourceUrl(request.getSourceUrl())
                .rawContent(request.getRawContent())
                .language(lang)
                .status(STATUS_PENDING)
                .build();
        content = contentRepository.save(content);
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, lang, acceptLanguageHeader);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        String mode = UserProcessingPreferences.effectiveProcessingMode(user);
        if ("immediate".equals(mode)) {
            processingService.processContentAsync(content.getId(), opts, pipeline);
        } else if ("background".equals(mode)) {
            processingService.enqueueInboxCapture(content.getId());
        }
        return toResponse(content);
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
        if (!STATUS_PENDING.equals(content.getStatus())) {
            throw new IllegalArgumentException("Only pending captures can run the processing pipeline");
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
        return toResponse(content);
    }

    @Transactional(readOnly = true)
    public List<ContentResponse> listByUser(UUID userId) {
        return contentRepository.findByUserIdOrderByUploadedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Digital Brain inbox: items awaiting user review / processing. */
    @Transactional(readOnly = true)
    public List<ContentResponse> listInboxPending(UUID userId) {
        return contentRepository.findByUserIdAndStatusOrderByUploadedAtDesc(userId, STATUS_PENDING).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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

    private ContentResponse toResponse(Content content) {
        return ContentResponse.builder()
                .id(content.getId())
                .userId(content.getUserId())
                .type(content.getType())
                .sourceUrl(content.getSourceUrl())
                .rawContent(content.getRawContent())
                .language(content.getLanguage())
                .title(content.getTitle())
                .notificationsEnabled(content.getNotificationsEnabled())
                .status(content.getStatus())
                .uploadedAt(content.getUploadedAt())
                .build();
    }
}
