package com.synapse.modules.user;

import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.service.DataRetentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Deletes old inbox captures per user's {@code dataRetentionPolicy} (30d / 90d).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataRetentionScheduler {

    private final UserRepository userRepository;
    private final DataRetentionService dataRetentionService;

    @Scheduled(cron = "0 15 3 * * *")
    public void runDailyRetention() {
        List<User> users = userRepository.findByDataRetentionPolicyIn(List.of("30d", "90d"));
        for (User user : users) {
            try {
                dataRetentionService.purgeExpiredForUser(user);
            } catch (Exception e) {
                log.warn("Retention failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
    }
}
