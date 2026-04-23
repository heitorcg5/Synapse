package com.synapse.modules.user.controller;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.knowledge.dto.KnowledgeExportFile;
import com.synapse.modules.knowledge.service.KnowledgeExportService;
import com.synapse.modules.user.dto.UpdateProfileRequest;
import com.synapse.modules.user.dto.UserResponse;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.service.UserService;
import com.synapse.modules.user.util.UserKnowledgeExportPreferences;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final KnowledgeExportService knowledgeExportService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@CurrentUser User currentUser) {
        return ResponseEntity.ok(userService.getById(currentUser.getId()));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @CurrentUser User currentUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(userService.updateProfile(currentUser.getId(), request));
    }

    /**
     * Download all knowledge items. Omit {@code format} to use the user's default (settings).
     */
    @GetMapping("/me/export")
    public ResponseEntity<byte[]> exportKnowledge(
            @CurrentUser User currentUser,
            @RequestParam(required = false) String format
    ) {
        String f = resolveExportFormat(currentUser, format);
        KnowledgeExportFile file = knowledgeExportService.exportAll(currentUser.getId(), f);
        return toFileResponse(file);
    }

    /**
     * Download one knowledge note. Omit {@code format} to use the user's default (settings).
     */
    @GetMapping("/me/export/knowledge/{knowledgeItemId}")
    public ResponseEntity<byte[]> exportKnowledgeItem(
            @CurrentUser User currentUser,
            @PathVariable UUID knowledgeItemId,
            @RequestParam(required = false) String format
    ) {
        String f = resolveExportFormat(currentUser, format);
        KnowledgeExportFile file = knowledgeExportService.exportOne(currentUser.getId(), knowledgeItemId, f);
        return toFileResponse(file);
    }

    @GetMapping("/me/avatar")
    public ResponseEntity<byte[]> getAvatar(@CurrentUser User currentUser) {
        return userService.getAvatarBytes(currentUser.getId())
                .map(avatar -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(avatar.contentType()))
                        .body(avatar.data()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            @CurrentUser User currentUser,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(userService.updateAvatar(currentUser.getId(), file));
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<UserResponse> deleteAvatar(@CurrentUser User currentUser) {
        return ResponseEntity.ok(userService.clearAvatar(currentUser.getId()));
    }

    private String resolveExportFormat(User currentUser, String formatParam) {
        if (formatParam != null && !formatParam.isBlank()) {
            String n = UserKnowledgeExportPreferences.normalizeFormat(formatParam);
            if (n == null) {
                throw new IllegalArgumentException("format must be markdown, json, or pdf");
            }
            return n;
        }
        if (currentUser == null) {
            throw new ResourceNotFoundException("USER_NOT_FOUND", "User not found");
        }
        return UserKnowledgeExportPreferences.effectiveExportFormat(currentUser);
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
