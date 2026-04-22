package com.synapse.modules.user.controller;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.knowledge.dto.KnowledgeExportFile;
import com.synapse.modules.knowledge.service.KnowledgeExportService;
import com.synapse.modules.user.dto.UpdateProfileRequest;
import com.synapse.modules.user.dto.UserResponse;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.service.UserService;
import com.synapse.modules.user.util.UserKnowledgeExportPreferences;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final KnowledgeExportService knowledgeExportService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(userService.getById(userId));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /**
     * Download all knowledge items. Omit {@code format} to use the user's default (settings).
     */
    @GetMapping("/me/export")
    public ResponseEntity<byte[]> exportKnowledge(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String format
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        String f = resolveExportFormat(userId, format);
        KnowledgeExportFile file = knowledgeExportService.exportAll(userId, f);
        return toFileResponse(file);
    }

    /**
     * Download one knowledge note. Omit {@code format} to use the user's default (settings).
     */
    @GetMapping("/me/export/knowledge/{knowledgeItemId}")
    public ResponseEntity<byte[]> exportKnowledgeItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID knowledgeItemId,
            @RequestParam(required = false) String format
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        String f = resolveExportFormat(userId, format);
        KnowledgeExportFile file = knowledgeExportService.exportOne(userId, knowledgeItemId, f);
        return toFileResponse(file);
    }

    @GetMapping("/me/avatar")
    public ResponseEntity<byte[]> getAvatar(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return userService.getAvatarBytes(userId)
                .map(avatar -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(avatar.contentType()))
                        .body(avatar.data()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(userService.updateAvatar(userId, file));
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<UserResponse> deleteAvatar(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(userService.clearAvatar(userId));
    }

    private String resolveExportFormat(UUID userId, String formatParam) {
        if (formatParam != null && !formatParam.isBlank()) {
            String n = UserKnowledgeExportPreferences.normalizeFormat(formatParam);
            if (n == null) {
                throw new IllegalArgumentException("format must be markdown, json, or pdf");
            }
            return n;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        return UserKnowledgeExportPreferences.effectiveExportFormat(user);
    }

    private static ResponseEntity<byte[]> toFileResponse(KnowledgeExportFile file) {
        ContentDisposition cd = ContentDisposition.attachment()
                .filename(file.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .contentType(file.mediaType())
                .body(file.body());
    }
}
