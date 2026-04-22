package com.synapse.modules.notification.controller;

import com.synapse.modules.notification.dto.NotificationResponse;
import com.synapse.modules.notification.dto.UnreadCountResponse;
import com.synapse.modules.notification.service.NotificationService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> unreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.countUnread(userId)));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(notificationService.listRecent(userId));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        notificationService.markRead(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        notificationService.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }
}
