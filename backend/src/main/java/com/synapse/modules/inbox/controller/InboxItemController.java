package com.synapse.modules.inbox.controller;

import com.synapse.modules.inbox.dto.InboxItemResponse;
import com.synapse.modules.inbox.dto.InboxFolderResponse;
import com.synapse.modules.inbox.dto.AiPreviewResponse;
import com.synapse.modules.inbox.dto.AssignInboxFolderRequest;
import com.synapse.modules.inbox.dto.CreateInboxItemRequest;
import com.synapse.modules.inbox.dto.CreateInboxFolderRequest;
import com.synapse.modules.inbox.dto.ConfirmInboxItemRequest;
import com.synapse.modules.inbox.dto.SummaryResponse;
import com.synapse.modules.inbox.dto.TagResponse;
import com.synapse.modules.inbox.service.InboxService;
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
public class InboxItemController {

    private final InboxService inboxService;
    private final ProcessingService processingService;

    @PostMapping
    public ResponseEntity<InboxItemResponse> create(
            @Valid @RequestBody CreateInboxItemRequest request,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        String language = parseLanguage(acceptLanguage);
        log.warn("LANG_DEBUG POST /content Accept-Language='{}' -> language='{}'", acceptLanguage, language);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inboxService.create(currentUser.getId(), request, language, acceptLanguage));
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
        inboxService.getById(id, currentUser.getId());
        return ResponseEntity.ok(processingService.generateAiPreview(id, currentUser.getId(), acceptLanguage));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<InboxItemResponse> confirm(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage,
            @Valid @RequestBody ConfirmInboxItemRequest request
    ) {
        // access check
        inboxService.getById(id, currentUser.getId());
        processingService.confirmContent(
                id,
                currentUser.getId(),
                acceptLanguage,
                request.getTitle(),
                request.getSummaryText(),
                request.getNotificationsEnabled() != null && request.getNotificationsEnabled(),
                request.getReminderAt()
        );

        return ResponseEntity.ok(inboxService.getById(id, currentUser.getId()));
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
        inboxService.getById(id, currentUser.getId());
        inboxService.runProcessingPipeline(id, currentUser.getId(), acceptLanguage);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InboxItemResponse> getById(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(inboxService.getById(id, currentUser.getId()));
    }

    @GetMapping("/user")
    public ResponseEntity<List<InboxItemResponse>> listByUser(@CurrentUser User currentUser) {
        return ResponseEntity.ok(inboxService.listByUser(currentUser.getId()));
    }

    @GetMapping("/folders")
    public ResponseEntity<List<InboxFolderResponse>> listFolders(@CurrentUser User currentUser) {
        return ResponseEntity.ok(inboxService.listFolders(currentUser.getId()));
    }

    @PostMapping("/folders")
    public ResponseEntity<InboxFolderResponse> createFolder(
            @CurrentUser User currentUser,
            @Valid @RequestBody CreateInboxFolderRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inboxService.createFolder(currentUser.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        inboxService.delete(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/folder")
    public ResponseEntity<InboxItemResponse> assignFolder(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @Valid @RequestBody AssignInboxFolderRequest request
    ) {
        return ResponseEntity.ok(inboxService.assignFolder(id, currentUser.getId(), request));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(inboxService.getSummary(id, currentUser.getId()));
    }

    @GetMapping("/{id}/tags")
    public ResponseEntity<List<TagResponse>> getTags(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(inboxService.getTags(id, currentUser.getId()));
    }
}
