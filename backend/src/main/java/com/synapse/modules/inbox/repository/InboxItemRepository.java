package com.synapse.modules.inbox.repository;

import com.synapse.modules.inbox.entity.InboxItem;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InboxItemRepository extends JpaRepository<InboxItem, UUID> {

    List<InboxItem> findByUserIdOrderByCapturedAtDesc(UUID userId);

    List<InboxItem> findByUserIdAndStatusOrderByCapturedAtDesc(UUID userId, String status);

    List<InboxItem> findByUserIdAndStatusInOrderByCapturedAtDesc(UUID userId, List<String> statuses);

    boolean existsByUserIdAndSourceUrlAndIdNot(UUID userId, String sourceUrl, UUID excludeId);

    /** Older duplicate of the same URL for this user (excluding current row). */
    List<InboxItem> findByUserIdAndSourceUrlAndIdNotOrderByCapturedAtAsc(UUID userId, String sourceUrl, UUID id);

    List<InboxItem> findByUserIdAndCapturedAtBefore(UUID userId, Instant before);

    List<InboxItem> findTop200ByNotificationsEnabledTrueAndNotificationReminderAtLessThanEqualAndReminderNotifiedAtIsNullOrderByNotificationReminderAtAsc(
            Instant now
    );
}
