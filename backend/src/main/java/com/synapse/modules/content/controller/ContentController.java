package com.synapse.modules.content.controller;

import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.dto.SummaryResponse;
import com.synapse.modules.content.dto.TagResponse;
import com.synapse.modules.content.service.ContentService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/content")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ContentResponse> create(
            @Valid @RequestBody CreateContentRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED).body(contentService.create(userId, request));
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
