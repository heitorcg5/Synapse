package com.synapse.modules.user.service;

import com.synapse.modules.user.dto.RegisterRequest;
import com.synapse.modules.user.dto.UpdateProfileRequest;
import com.synapse.modules.user.dto.UserResponse;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.util.UserKnowledgeExportPreferences;
import com.synapse.modules.user.util.UserKnowledgePreferences;
import com.synapse.modules.user.util.UserNotificationPreferences;
import com.synapse.modules.user.util.UserPrivacyPreferences;
import com.synapse.modules.user.util.UserProcessingPreferences;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_THEMES = Set.of("dark", "light", "system");
    private static final Set<String> ALLOWED_DATE_FORMATS = Set.of("iso", "dmy", "mdy");
    private static final Set<String> ALLOWED_TIME_FORMATS = Set.of("h24", "h12");
    private static final Set<String> ALLOWED_AI_SUMMARY = Set.of("short", "medium", "detailed");
    private static final Set<String> ALLOWED_AI_LANG_MODE = Set.of("input", "ui", "custom");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DataRetentionService dataRetentionService;

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        return toResponse(user);
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        user = userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        boolean touchRetentionPolicy = request.getDataRetentionPolicy() != null;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName().isBlank() ? null : request.getDisplayName().trim());
        }
        if (request.getPreferredLanguage() != null && !request.getPreferredLanguage().isBlank()) {
            String lang = request.getPreferredLanguage().trim().toLowerCase();
            if (!"en".equals(lang) && !"es".equals(lang)) {
                throw new IllegalArgumentException("preferredLanguage must be en or es");
            }
            user.setPreferredLanguage(lang);
        }
        if (request.getPreferredTheme() != null) {
            if (request.getPreferredTheme().isBlank()) {
                user.setPreferredTheme(null);
            } else {
                String th = request.getPreferredTheme().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_THEMES.contains(th)) {
                    throw new IllegalArgumentException("preferredTheme must be dark, light, or system");
                }
                user.setPreferredTheme(th);
            }
        }
        if (request.getPreferredTimezone() != null) {
            if (request.getPreferredTimezone().isBlank()) {
                user.setPreferredTimezone(null);
            } else {
                String tz = request.getPreferredTimezone().trim();
                try {
                    ZoneId.of(tz);
                    user.setPreferredTimezone(tz);
                } catch (DateTimeException e) {
                    throw new IllegalArgumentException("Invalid timezone: " + tz);
                }
            }
        }
        if (request.getDateFormat() != null) {
            if (request.getDateFormat().isBlank()) {
                user.setDateFormat(null);
            } else {
                String df = request.getDateFormat().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_DATE_FORMATS.contains(df)) {
                    throw new IllegalArgumentException("dateFormat must be iso, dmy, or mdy");
                }
                user.setDateFormat(df);
            }
        }
        if (request.getTimeFormat() != null) {
            if (request.getTimeFormat().isBlank()) {
                user.setTimeFormat(null);
            } else {
                String tf = request.getTimeFormat().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_TIME_FORMATS.contains(tf)) {
                    throw new IllegalArgumentException("timeFormat must be h24 or h12");
                }
                user.setTimeFormat(tf);
            }
        }
        if (request.getAiSummaryDetail() != null) {
            if (request.getAiSummaryDetail().isBlank()) {
                user.setAiSummaryDetail(null);
            } else {
                String s = request.getAiSummaryDetail().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_AI_SUMMARY.contains(s)) {
                    throw new IllegalArgumentException("aiSummaryDetail must be short, medium, or detailed");
                }
                user.setAiSummaryDetail(s);
            }
        }
        if (request.getAiResponseLanguageMode() != null) {
            if (request.getAiResponseLanguageMode().isBlank()) {
                user.setAiResponseLanguageMode(null);
            } else {
                String m = request.getAiResponseLanguageMode().trim().toLowerCase(Locale.ROOT);
                if (!ALLOWED_AI_LANG_MODE.contains(m)) {
                    throw new IllegalArgumentException("aiResponseLanguageMode must be input, ui, or custom");
                }
                user.setAiResponseLanguageMode(m);
            }
        }
        if (request.getAiCustomResponseLanguage() != null) {
            if (request.getAiCustomResponseLanguage().isBlank()) {
                user.setAiCustomResponseLanguage(null);
            } else {
                String c = request.getAiCustomResponseLanguage().trim().toLowerCase(Locale.ROOT);
                if (!"en".equals(c) && !"es".equals(c)) {
                    throw new IllegalArgumentException("aiCustomResponseLanguage must be en or es");
                }
                user.setAiCustomResponseLanguage(c);
            }
        }
        if (request.getProcessingMode() != null) {
            if (request.getProcessingMode().isBlank()) {
                user.setProcessingMode(null);
            } else {
                String m = request.getProcessingMode().trim().toLowerCase(Locale.ROOT);
                if (!UserProcessingPreferences.isValidProcessingMode(m)) {
                    throw new IllegalArgumentException("processingMode must be immediate, background, or manual");
                }
                user.setProcessingMode(m);
                UserProcessingPreferences.syncAutoProcessFlagFromMode(user, m);
            }
        } else if (request.getAiAutoProcessCapture() != null) {
            user.setAiAutoProcessCapture(request.getAiAutoProcessCapture());
            user.setProcessingMode(Boolean.TRUE.equals(request.getAiAutoProcessCapture()) ? "immediate" : "manual");
            UserProcessingPreferences.syncAutoProcessFlagFromMode(user, user.getProcessingMode());
        }

        if (request.getPipelineSummarize() != null) {
            user.setPipelineSummarize(request.getPipelineSummarize());
        }
        if (request.getPipelineClassify() != null) {
            user.setPipelineClassify(request.getPipelineClassify());
        }
        if (request.getPipelineGenerateTags() != null) {
            user.setPipelineGenerateTags(request.getPipelineGenerateTags());
        }
        if (request.getPipelineDetectDuplicates() != null) {
            user.setPipelineDetectDuplicates(request.getPipelineDetectDuplicates());
        }
        if (request.getPipelineSuggestConnections() != null) {
            user.setPipelineSuggestConnections(request.getPipelineSuggestConnections());
        }
        if (request.getAiChunkSizeTokens() != null) {
            if (request.getAiChunkSizeTokens().isBlank()) {
                user.setAiChunkSizeTokens(null);
            } else {
                String t = request.getAiChunkSizeTokens().trim();
                if (!UserProcessingPreferences.isValidChunkTokenTier(t)) {
                    throw new IllegalArgumentException("aiChunkSizeTokens must be 500, 1000, or 2000");
                }
                user.setAiChunkSizeTokens(t);
            }
        }
        if (request.getKnowledgeStyle() != null) {
            if (request.getKnowledgeStyle().isBlank()) {
                user.setKnowledgeStyle(null);
            } else {
                String ks = request.getKnowledgeStyle().trim().toLowerCase(Locale.ROOT);
                if (!UserKnowledgePreferences.isValidKnowledgeStyle(ks)) {
                    throw new IllegalArgumentException("knowledgeStyle must be tags, folders, or graph");
                }
                user.setKnowledgeStyle(ks);
            }
        }
        if (request.getAutoTaggingEnabled() != null) {
            user.setAutoTaggingEnabled(request.getAutoTaggingEnabled());
        }
        if (request.getAutoLinkEnabled() != null) {
            user.setAutoLinkEnabled(request.getAutoLinkEnabled());
        }
        if (request.getDataRetentionPolicy() != null) {
            if (request.getDataRetentionPolicy().isBlank()) {
                user.setDataRetentionPolicy(null);
            } else {
                String dr = request.getDataRetentionPolicy().trim().toLowerCase(Locale.ROOT);
                if (!UserPrivacyPreferences.isValidDataRetentionPolicy(dr)) {
                    throw new IllegalArgumentException("dataRetentionPolicy must be forever, 30d, or 90d");
                }
                user.setDataRetentionPolicy(dr);
            }
        }
        if (request.getKnowledgeExportFormat() != null) {
            if (request.getKnowledgeExportFormat().isBlank()) {
                user.setKnowledgeExportFormat(null);
            } else {
                String ef = UserKnowledgeExportPreferences.normalizeFormat(request.getKnowledgeExportFormat());
                if (ef == null) {
                    throw new IllegalArgumentException("knowledgeExportFormat must be markdown, json, or pdf");
                }
                user.setKnowledgeExportFormat(ef);
            }
        }
        if (request.getNotifyProcessingFinished() != null) {
            user.setNotifyProcessingFinished(request.getNotifyProcessingFinished());
        }
        if (request.getNotifyNewConnection() != null) {
            user.setNotifyNewConnection(request.getNotifyNewConnection());
        }
        if (request.getNotifyDuplicateDetected() != null) {
            user.setNotifyDuplicateDetected(request.getNotifyDuplicateDetected());
        }

        userRepository.save(user);
        if (touchRetentionPolicy && !"forever".equals(UserPrivacyPreferences.effectiveDataRetentionPolicy(user))) {
            dataRetentionService.purgeExpiredForUser(user);
        }
        return toResponse(user);
    }

    public record AvatarBytes(byte[] data, String contentType) {}

    /**
     * Loads avatar bytes inside a transaction (required for lazy profile_image).
     */
    @Transactional(readOnly = true)
    public Optional<AvatarBytes> getAvatarBytes(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        if (!Boolean.TRUE.equals(user.getHasProfileImage())) {
            return Optional.empty();
        }
        byte[] image = user.getProfileImage();
        if (image == null || image.length == 0) {
            return Optional.empty();
        }
        String ct = user.getProfileImageContentType() != null ? user.getProfileImageContentType() : "image/jpeg";
        return Optional.of(new AvatarBytes(image, ct));
    }

    @Transactional
    public UserResponse updateAvatar(UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("Could not determine file type");
        }
        String normalized = contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
        if (!ALLOWED_AVATAR_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Only JPEG, PNG, WebP or GIF images are allowed");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new IllegalArgumentException("Image must be at most 2 MB");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        try {
            user.setProfileImage(file.getBytes());
            user.setProfileImageContentType(normalized);
            user.setHasProfileImage(true);
            userRepository.save(user);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read image: " + e.getMessage());
        }
        return toResponse(user);
    }

    @Transactional
    public UserResponse clearAvatar(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.synapse.exceptions.ResourceNotFoundException("USER_NOT_FOUND", "User not found"));
        user.setProfileImage(null);
        user.setProfileImageContentType(null);
        user.setHasProfileImage(false);
        userRepository.save(user);
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        boolean hasAvatar = Boolean.TRUE.equals(user.getHasProfileImage());
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .preferredLanguage(user.getPreferredLanguage())
                .preferredTheme(user.getPreferredTheme())
                .preferredTimezone(user.getPreferredTimezone())
                .dateFormat(user.getDateFormat())
                .timeFormat(user.getTimeFormat())
                .aiSummaryDetail(user.getAiSummaryDetail())
                .aiResponseLanguageMode(user.getAiResponseLanguageMode())
                .aiCustomResponseLanguage(user.getAiCustomResponseLanguage())
                .aiAutoProcessCapture(user.getAiAutoProcessCapture())
                .processingMode(UserProcessingPreferences.effectiveProcessingMode(user))
                .pipelineSummarize(UserProcessingPreferences.isPipelineSummarizeOn(user))
                .pipelineClassify(UserProcessingPreferences.isPipelineClassifyOn(user))
                .pipelineGenerateTags(UserProcessingPreferences.isPipelineGenerateTagsOn(user))
                .pipelineDetectDuplicates(UserProcessingPreferences.isPipelineDetectDuplicatesOn(user))
                .pipelineSuggestConnections(UserProcessingPreferences.isPipelineSuggestConnectionsOn(user))
                .aiChunkSizeTokens(
                        user.getAiChunkSizeTokens() != null && !user.getAiChunkSizeTokens().isBlank()
                                ? user.getAiChunkSizeTokens()
                                : "1000")
                .knowledgeStyle(UserKnowledgePreferences.effectiveKnowledgeStyle(user))
                .autoTaggingEnabled(UserKnowledgePreferences.isAutoTaggingEnabled(user))
                .autoLinkEnabled(Boolean.TRUE.equals(user.getAutoLinkEnabled()))
                .dataRetentionPolicy(UserPrivacyPreferences.effectiveDataRetentionPolicy(user))
                .knowledgeExportFormat(UserKnowledgeExportPreferences.effectiveExportFormat(user))
                .notifyProcessingFinished(UserNotificationPreferences.effectiveNotifyProcessingFinished(user))
                .notifyNewConnection(UserNotificationPreferences.effectiveNotifyNewConnection(user))
                .notifyDuplicateDetected(UserNotificationPreferences.effectiveNotifyDuplicateDetected(user))
                .hasAvatar(hasAvatar)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
