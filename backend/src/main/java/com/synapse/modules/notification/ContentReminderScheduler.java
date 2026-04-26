package com.synapse.modules.notification;

import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContentReminderScheduler {

    private final InboxItemRepository inboxItemRepository;
    private final NotificationService notificationService;

    @Scheduled(fixedDelay = 60_000, initialDelay = 45_000)
    @Transactional
    public void dispatchDueReminders() {
        Instant now = Instant.now();
        List<InboxItem> due = inboxItemRepository
                .findTop200ByNotificationsEnabledTrueAndNotificationReminderAtLessThanEqualAndReminderNotifiedAtIsNullOrderByNotificationReminderAtAsc(now);
        if (due.isEmpty()) {
            return;
        }

        for (InboxItem content : due) {
            notificationService.notifyScheduledContentReminder(content.getUserId(), content.getId());
            content.setReminderNotifiedAt(now);
        }
        inboxItemRepository.saveAll(due);
        log.debug("Dispatched {} scheduled content reminders", due.size());
    }
}
