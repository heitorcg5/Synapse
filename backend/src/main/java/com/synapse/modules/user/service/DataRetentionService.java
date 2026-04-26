package com.synapse.modules.user.service;

import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.util.UserPrivacyPreferences;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataRetentionService {

    private final InboxItemRepository inboxItemRepository;
    private final UserDataDeletionService userDataDeletionService;

    @Transactional
    public int purgeExpiredForUser(User user) {
        String policy = UserPrivacyPreferences.effectiveDataRetentionPolicy(user);
        if ("forever".equals(policy)) {
            return 0;
        }
        int days = "30d".equals(policy) ? 30 : 90;
        Instant cutoff = Instant.now().minus(Duration.ofDays(days));
        List<UUID> staleIds = inboxItemRepository.findByUserIdAndCapturedAtBefore(user.getId(), cutoff).stream()
                .map(InboxItem::getId)
                .toList();
        for (UUID inboxItemId : staleIds) {
            userDataDeletionService.deleteCaptureAndDependents(inboxItemId, user.getId());
        }
        if (!staleIds.isEmpty()) {
            log.info("Data retention ({}): removed {} capture(s) for user {}", policy, staleIds.size(), user.getId());
        }
        return staleIds.size();
    }
}
