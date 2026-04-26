package com.synapse.modules.notification.controller;

import com.synapse.modules.notification.dto.NotificationResponse;
import com.synapse.modules.notification.dto.UnreadCountResponse;
import com.synapse.modules.notification.service.NotificationService;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final com.synapse.modules.notification.service.SseService sseService;

    @GetMapping(path = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter stream(@CurrentUser User currentUser) {
        return sseService.subscribe(currentUser.getId());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> unreadCount(@CurrentUser User currentUser) {
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.countUnread(currentUser.getId())));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(@CurrentUser User currentUser) {
        return ResponseEntity.ok(notificationService.listRecent(currentUser.getId()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @CurrentUser User currentUser,
            @PathVariable UUID id
    ) {
        notificationService.markRead(currentUser.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@CurrentUser User currentUser) {
        notificationService.markAllRead(currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearAll(@CurrentUser User currentUser) {
        notificationService.clearAll(currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/clear")
    public ResponseEntity<Void> clearAllPost(@CurrentUser User currentUser) {
        notificationService.clearAll(currentUser.getId());
        return ResponseEntity.noContent().build();
    }
}
