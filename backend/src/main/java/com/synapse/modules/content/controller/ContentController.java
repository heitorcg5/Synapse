package com.synapse.modules.content.controller;

import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.ContentFolderResponse;
import com.synapse.modules.content.dto.AiPreviewResponse;
import com.synapse.modules.content.dto.AssignContentFolderRequest;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.dto.CreateContentFolderRequest;
import com.synapse.modules.content.dto.ConfirmContentRequest;
import com.synapse.modules.content.dto.SummaryResponse;
import com.synapse.modules.content.dto.TagResponse;
import com.synapse.modules.content.service.ContentService;
import com.synapse.modules.processing.service.ProcessingService;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/content")
@RequiredArgsConstructor
@Slf4j
public class ContentController {

    private final ContentService contentService;
    private final ProcessingService processingService;

    @PostMapping
    public ResponseEntity<ContentResponse> create(
            @Valid @RequestBody CreateContentRequest request,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        String language = parseLanguage(acceptLanguage);
        log.warn("LANG_DEBUG POST /content Accept-Language='{}' -> language='{}'", acceptLanguage, language);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contentService.create(currentUser.getId(), request, language, acceptLanguage));
    }

    private static String parseLanguage(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return "en";
        }
        String first = acceptLanguage.split(",")[0].trim().toLowerCase(Locale.ROOT);
        if (first.startsWith("es")) return "es";
        return "en";
    }

    @PostMapping("/{id}/ai-preview")
    public ResponseEntity<AiPreviewResponse> aiPreview(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        // access check
        contentService.getById(id, currentUser.getId());
        return ResponseEntity.ok(processingService.generateAiPreview(id, currentUser.getId(), acceptLanguage));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ContentResponse> confirm(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage,
            @Valid @RequestBody ConfirmContentRequest request
    ) {
        // access check
        contentService.getById(id, currentUser.getId());
        processingService.confirmContent(
                id,
                currentUser.getId(),
                acceptLanguage,
                request.getTitle(),
                request.getSummaryText(),
                request.getNotificationsEnabled() != null && request.getNotificationsEnabled(),
                request.getReminderAt()
        );

        return ResponseEntity.ok(contentService.getById(id, currentUser.getId()));
    }

    /**
     * Run the full processing pipeline on a pending capture (manual / user-triggered).
     */
    @PostMapping("/{id}/process")
    public ResponseEntity<Void> runProcessing(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        contentService.getById(id, currentUser.getId());
        contentService.runProcessingPipeline(id, currentUser.getId(), acceptLanguage);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContentResponse> getById(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(contentService.getById(id, currentUser.getId()));
    }

    @GetMapping("/user")
    public ResponseEntity<List<ContentResponse>> listByUser(@CurrentUser User currentUser) {
        return ResponseEntity.ok(contentService.listByUser(currentUser.getId()));
    }

    @GetMapping("/folders")
    public ResponseEntity<List<ContentFolderResponse>> listFolders(@CurrentUser User currentUser) {
        return ResponseEntity.ok(contentService.listFolders(currentUser.getId()));
    }

    @PostMapping("/folders")
    public ResponseEntity<ContentFolderResponse> createFolder(
            @CurrentUser User currentUser,
            @Valid @RequestBody CreateContentFolderRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contentService.createFolder(currentUser.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        contentService.delete(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/folder")
    public ResponseEntity<ContentResponse> assignFolder(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @Valid @RequestBody AssignContentFolderRequest request
    ) {
        return ResponseEntity.ok(contentService.assignFolder(id, currentUser.getId(), request));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(contentService.getSummary(id, currentUser.getId()));
    }

    @GetMapping("/{id}/tags")
    public ResponseEntity<List<TagResponse>> getTags(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(contentService.getTags(id, currentUser.getId()));
    }
}
