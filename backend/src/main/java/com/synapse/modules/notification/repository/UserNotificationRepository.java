package com.synapse.modules.notification.repository;

import com.synapse.modules.notification.entity.UserNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotification, UUID> {

    long countByUserIdAndReadAtIsNull(UUID userId);

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<UserNotification> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE UserNotification n SET n.readAt = :readAt WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllReadForUser(@Param("userId") UUID userId, @Param("readAt") Instant readAt);

    @Modifying
    @Query("DELETE FROM UserNotification n WHERE n.userId = :userId")
    int deleteAllForUser(@Param("userId") UUID userId);
}
