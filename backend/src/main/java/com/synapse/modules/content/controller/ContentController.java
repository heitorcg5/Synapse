package com.synapse.modules.content.controller;

import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.AiPreviewResponse;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.dto.ConfirmContentRequest;
import com.synapse.modules.content.dto.SummaryResponse;
import com.synapse.modules.content.dto.TagResponse;
import com.synapse.modules.content.service.ContentService;
import com.synapse.modules.processing.service.ProcessingService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    private final UserRepository userRepository;
    private final ProcessingService processingService;

    @PostMapping
    public ResponseEntity<ContentResponse> create(
            @Valid @RequestBody CreateContentRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        String language = parseLanguage(acceptLanguage);
        log.warn("LANG_DEBUG POST /content Accept-Language='{}' -> language='{}'", acceptLanguage, language);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contentService.create(userId, request, language, acceptLanguage));
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
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        // access check
        contentService.getById(id, userId);
        return ResponseEntity.ok(processingService.generateAiPreview(id, userId, acceptLanguage));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ContentResponse> confirm(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage,
            @Valid @RequestBody ConfirmContentRequest request
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        // access check
        contentService.getById(id, userId);
        processingService.confirmContent(
                id,
                userId,
                acceptLanguage,
                request.getTitle(),
                request.getSummaryText(),
                request.getNotificationsEnabled() != null && request.getNotificationsEnabled()
        );

        return ResponseEntity.ok(contentService.getById(id, userId));
    }

    /**
     * Run the full processing pipeline on a pending capture (manual / user-triggered).
     */
    @PostMapping("/{id}/process")
    public ResponseEntity<Void> runProcessing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        contentService.getById(id, userId);
        contentService.runProcessingPipeline(id, userId, acceptLanguage);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContentResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(contentService.getById(id, userId));
    }

    @GetMapping("/user")
    public ResponseEntity<List<ContentResponse>> listByUser(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(contentService.listByUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        contentService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(contentService.getSummary(id, userId));
    }

    @GetMapping("/{id}/tags")
    public ResponseEntity<List<TagResponse>> getTags(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(contentService.getTags(id, userId));
    }
}
