package com.synapse.modules.notification.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.notification.dto.NotificationResponse;
import com.synapse.modules.notification.entity.NotificationType;
import com.synapse.modules.notification.entity.UserNotification;
import com.synapse.modules.notification.repository.UserNotificationRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.util.UserNotificationPreferences;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int LIST_PAGE_SIZE = 50;

    private final UserNotificationRepository userNotificationRepository;

    @Transactional
    public void notifyProcessingFinishedIfEnabled(User user, UUID contentId) {
        if (user == null || contentId == null) {
            return;
        }
        if (!UserNotificationPreferences.isNotifyProcessingFinished(user)) {
            return;
        }
        userNotificationRepository.save(UserNotification.builder()
                .userId(user.getId())
                .type(NotificationType.PROCESSING_FINISHED)
                .contentId(contentId)
                .build());
    }

    @Transactional
    public void notifyDuplicateIfEnabled(User user, UUID contentId, UUID relatedContentId) {
        if (user == null || contentId == null || relatedContentId == null) {
            return;
        }
        if (!UserNotificationPreferences.isNotifyDuplicateDetected(user)) {
            return;
        }
        userNotificationRepository.save(UserNotification.builder()
                .userId(user.getId())
                .type(NotificationType.DUPLICATE_DETECTED)
                .contentId(contentId)
                .relatedContentId(relatedContentId)
                .build());
    }

    @Transactional
    public void notifyNewConnectionsIfEnabled(User user, UUID knowledgeItemId, int connectionCount) {
        if (user == null || knowledgeItemId == null || connectionCount <= 0) {
            return;
        }
        if (!UserNotificationPreferences.isNotifyNewConnection(user)) {
            return;
        }
        userNotificationRepository.save(UserNotification.builder()
                .userId(user.getId())
                .type(NotificationType.NEW_CONNECTION)
                .knowledgeItemId(knowledgeItemId)
                .connectionCount(connectionCount)
                .build());
    }

    @Transactional
    public void notifyScheduledContentReminder(UUID userId, UUID contentId) {
        if (userId == null || contentId == null) {
            return;
        }
        userNotificationRepository.save(UserNotification.builder()
                .userId(userId)
                .type(NotificationType.CONTENT_REMINDER)
                .contentId(contentId)
                .build());
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return userNotificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listRecent(UUID userId) {
        return userNotificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, LIST_PAGE_SIZE))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        UserNotification n = userNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("NOTIFICATION_NOT_FOUND", "Notification not found"));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            userNotificationRepository.save(n);
        }
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return userNotificationRepository.markAllReadForUser(userId, Instant.now());
    }

    private NotificationResponse toResponse(UserNotification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .contentId(n.getContentId())
                .relatedContentId(n.getRelatedContentId())
                .knowledgeItemId(n.getKnowledgeItemId())
                .connectionCount(n.getConnectionCount())
                .read(n.getReadAt() != null)
                .createdAt(n.getCreatedAt())
                .build();
    }
}
