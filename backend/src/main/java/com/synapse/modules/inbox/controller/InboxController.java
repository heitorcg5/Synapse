package com.synapse.modules.inbox.controller;

import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.service.ContentService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Digital Brain capture layer: unified inbox (pending items only).
 */
@RestController
@RequestMapping("/inbox")
@RequiredArgsConstructor
public class InboxController {

    private final ContentService contentService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ContentResponse>> listPending(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(contentService.listInboxPending(userId));
    }
}
