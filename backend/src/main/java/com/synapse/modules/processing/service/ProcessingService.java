package com.synapse.modules.processing.service;

import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.ai.SummaryDetailLevel;
import com.synapse.modules.ai.service.AiService;
import com.synapse.modules.inbox.dto.AiPreviewResponse;
import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.entity.Tag;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.inbox.repository.InboxItemTagRepository;
import com.synapse.modules.inbox.repository.TagRepository;
import com.synapse.modules.inbox.service.WebContentExtractionService;
import com.synapse.modules.inbox.service.YouTubeTranscriptService;
import com.synapse.modules.processing.entity.AnalysisResult;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.AnalysisResultRepository;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.knowledge.repository.KnowledgeEmbeddingRepository;
import com.synapse.modules.knowledge.entity.KnowledgeEmbedding;
import com.synapse.modules.knowledge.service.KnowledgeService;
import com.synapse.modules.notification.service.NotificationService;
import com.synapse.modules.summary.entity.Summary;
import com.synapse.modules.summary.repository.SummaryRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import com.synapse.modules.user.util.UserKnowledgePreferences;
import com.synapse.modules.user.util.UserProcessingPreferences;
import com.synapse.modules.processing.ProcessingPipelineOptions;
import com.synapse.modules.user.util.UserAiPreferences;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessingService {

    @Autowired
    @Lazy
    private ProcessingService self;

    private final InboxItemRepository inboxItemRepository;
    private final ProcessingJobRepository processingJobRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final SummaryRepository summaryRepository;
    private final TagRepository tagRepository;
    private final InboxItemTagRepository contentTagRepository;
    private final KnowledgeEmbeddingRepository knowledgeEmbeddingRepository;
    private final AiService aiService;
    private final KnowledgeService knowledgeService;
    private final UserRepository userRepository;
    private final WebContentExtractionService webContentExtractionService;
    private final YouTubeTranscriptService youTubeTranscriptService;
    private final com.synapse.modules.notification.service.SseService sseService;
    private final NotificationService notificationService;

    public static final String STATUS_RUNNING = "RUNNING";
    public static final String STATUS_QUEUED = "QUEUED";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_PENDING = "PENDING";
    public static final String CONTENT_STATUS_CONFIRMED = "CONFIRMED";
    public static final String CONTENT_STATUS_PROCESSING = "PROCESSING";
    public static final String CONTENT_STATUS_READY = "READY";
    public static final String CONTENT_STATUS_FAILED = "FAILED";
    private static final int PREVIEW_MAX_CHARS = 2200;
    private static final long PREVIEW_CACHE_TTL_SECONDS = 300;

    /**
     * Small in-memory cache to avoid regenerating the same preview repeatedly.
     * Key format: inboxItemId:previewCacheKey (language + summary detail).
     */
    private final Map<String, CachedPreview> previewCache = new ConcurrentHashMap<>();

    /**
     * Full pipeline after capture (immediate mode). Creates a new RUNNING job.
     */
    public void processContentAsync(UUID inboxItemId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
        inboxItemRepository.findById(inboxItemId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_PROCESSING);
            inboxItemRepository.save(c);
        });
        createPipelineJob(inboxItemId);
    }

    /**
     * User-triggered processing (e.g. manual mode) for a pending capture.
     */
    public void startManualPipelineAsync(UUID inboxItemId, UUID userId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
        InboxItem content = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new IllegalArgumentException("InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("InboxItem not found");
        }
        if (!STATUS_PENDING.equals(content.getStatus()) && !CONTENT_STATUS_FAILED.equals(content.getStatus())) {
            log.debug("start manual pipeline skipped inboxItemId={} status={}", inboxItemId, content.getStatus());
            return;
        }
        content.setStatus(CONTENT_STATUS_PROCESSING);
        inboxItemRepository.save(content);
        createPipelineJob(inboxItemId);
    }

    /**
     * Background queue: transition QUEUED job to pipeline (must match user {@code background} mode).
     */
    @org.springframework.scheduling.annotation.Async("processingExecutor")
    public void processQueuedJobSafe(UUID jobId) {
        ProcessingJob job = processingJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }
        InboxItem content = inboxItemRepository.findById(job.getInboxItemId()).orElse(null);
        if (content == null) {
            return;
        }
        User user = userRepository.findById(content.getUserId()).orElse(null);
        if (user == null) {
            return;
        }
        
        job.setStatus(STATUS_RUNNING);
        job.setStep("INIT");
        processingJobRepository.save(job);
        notifyUser(job.getInboxItemId(), "JOB_STARTED", job);
        
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), null);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        
        try {
            runPipelineSteps(content.getId(), job.getId(), opts, pipeline);
        } catch (Exception e) {
            log.error("Queued processing failed for job {}", job.getId(), e);
            failJobWithRetry(job.getId(), e.getMessage());
        }
    }

    private void runPipelineSteps(UUID inboxItemId, UUID jobId, AiCallOptions opts, ProcessingPipelineOptions pipeline) {
        InboxItem contentRow = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new IllegalStateException("InboxItem vanished during processing"));
        User user = userRepository.findById(contentRow.getUserId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        String lang = opts.responseLanguage();
        updateJobStep(jobId, "EXTRACTION");
        String rawText = extractText(inboxItemId, lang);
        updateJobStep(jobId, "CLEANING");
        String cleanedText = cleanText(rawText);
        updateJobStep(jobId, "ANALYSIS");
        saveAnalysis(inboxItemId, cleanedText, lang);

        updateJobStep(jobId, "CLASSIFICATION");
        List<String> tagNames = new ArrayList<>();
        if (pipeline.classify()) {
            tagNames.addAll(aiService.classify(cleanedText, opts));
        }
        if (pipeline.generateTags()) {
            if (UserKnowledgePreferences.isAutoTaggingEnabled(user)) {
                List<String> aiTags = aiService.generateTags(cleanedText, opts);
                tagNames = mergeDistinctTagLabels(tagNames, aiTags);
                assignTags(inboxItemId, tagNames);
            } else {
                assignTags(inboxItemId, List.of());
            }
        } else {
            assignTags(inboxItemId, List.of());
        }

        updateJobStep(jobId, "SUMMARY");
        if (pipeline.summarize()) {
            var titleAndSummary = aiService.summarizeWithTitle(cleanedText, opts);
            saveSummary(inboxItemId, titleAndSummary.summary(), lang);
            saveGeneratedTitle(inboxItemId, titleAndSummary.title(), lang);
            generateAndSaveEmbedding(inboxItemId, user.getId(), titleAndSummary.summary());
        } else {
            summaryRepository.deleteByInboxItemId(inboxItemId);
            String generatedTitle = aiService.generateTitle(cleanedText, opts);
            saveGeneratedTitle(inboxItemId, generatedTitle, lang);
            generateAndSaveEmbedding(inboxItemId, user.getId(), cleanedText);
        }

        if (pipeline.detectDuplicates()) {
            detectDuplicateCaptures(contentRow, user);
        }
        if (pipeline.suggestConnections()) {
            log.debug("Suggest connections for inboxItemId={} (not implemented — enable reserved for future graph links)", inboxItemId);
        }

        completeJob(jobId);
        markContentReady(inboxItemId);
        notificationService.notifyProcessingFinishedIfEnabled(user, inboxItemId);
    }

    private void detectDuplicateCaptures(InboxItem current, User user) {
        String url = current.getSourceUrl();
        if (url == null || url.isBlank()) {
            return;
        }
        List<InboxItem> others = inboxItemRepository.findByUserIdAndSourceUrlAndIdNotOrderByCapturedAtAsc(
                current.getUserId(), url.trim(), current.getId());
        if (!others.isEmpty()) {
            InboxItem first = others.get(0);
            log.info("Duplicate capture: same source URL already exists for user {} (content {} vs {})",
                    current.getUserId(), current.getId(), first.getId());
            notificationService.notifyDuplicateIfEnabled(user, current.getId(), first.getId());
        }
    }

    /**
     * Generates AI suggestions for the "pending confirmation" modal.
     * This does not persist anything yet.
     */
    public AiPreviewResponse generateAiPreview(UUID inboxItemId, UUID userId, String acceptLanguageHeader) {
        InboxItem content = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new IllegalArgumentException("InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("InboxItem not found");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), acceptLanguageHeader);

        // For already processed items, reuse persisted AI output instead of generating again.
        if (CONTENT_STATUS_READY.equals(content.getStatus()) || CONTENT_STATUS_CONFIRMED.equals(content.getStatus())) {
            Summary existing = summaryRepository.findByInboxItemId(inboxItemId).orElse(null);
            if (existing != null && existing.getSummaryText() != null && !existing.getSummaryText().isBlank()) {
                String lang = existing.getLanguage() != null && !existing.getLanguage().isBlank()
                        ? existing.getLanguage()
                        : opts.responseLanguage();
                String title = content.getTitle() != null && !content.getTitle().isBlank()
                        ? content.getTitle()
                        : (lang.startsWith("es") ? "Captura" : "Capture");
                return AiPreviewResponse.builder()
                        .title(title)
                        .summaryText(existing.getSummaryText())
                        .language(lang)
                        .build();
            }
        }

        String cacheKey = inboxItemId + ":" + opts.previewCacheKey();
        CachedPreview cached = previewCache.get(cacheKey);
        if (cached != null && !isExpired(cached.createdAt())) {
            return cached.preview();
        }

        String rawText = extractText(inboxItemId, opts.responseLanguage());
        String cleanedText = cleanText(rawText);
        if (cleanedText.length() > PREVIEW_MAX_CHARS) {
            cleanedText = cleanedText.substring(0, PREVIEW_MAX_CHARS) + "...";
        }

        ProcessingPipelineOptions pipe = ProcessingPipelineOptions.fromUser(user);
        String lang = opts.responseLanguage();
        AiPreviewResponse preview;
        if (!pipe.summarize()) {
            String title = aiService.generateTitle(cleanedText, opts);
            if (title == null || title.isBlank()) {
                title = content.getTitle() != null && !content.getTitle().isBlank()
                        ? content.getTitle()
                        : (lang.startsWith("es") ? "Captura" : "Capture");
            }
            String hint = lang.startsWith("es")
                    ? "El resumen automático está desactivado en ajustes. Puedes escribir el resumen a mano al confirmar."
                    : "Summarization is turned off in settings. You can write the summary manually when you confirm.";
            preview = AiPreviewResponse.builder()
                    .title(title)
                    .summaryText(hint)
                    .language(lang)
                    .build();
        } else {
            var titleAndSummary = aiService.summarizeWithTitle(cleanedText, opts);
            preview = AiPreviewResponse.builder()
                    .title(titleAndSummary.title())
                    .summaryText(titleAndSummary.summary())
                    .language(lang)
                    .build();
        }
        previewCache.put(cacheKey, new CachedPreview(preview, Instant.now()));
        return preview;
    }

    /**
     * Persists user-edited AI suggestions and marks the content as READY.
     * It also runs classification/tag assignment.
     */
    @Transactional
    public void confirmContent(
            UUID inboxItemId,
            UUID userId,
            String acceptLanguageHeader,
            String title,
            String summaryText,
            boolean notificationsEnabled,
            Instant reminderAt
    ) {
        InboxItem content = inboxItemRepository.findById(inboxItemId)
                .orElseThrow(() -> new IllegalArgumentException("InboxItem not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("InboxItem not found");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String resolvedLang = UserAiPreferences.resolveResponseLanguage(user, content.getLanguage(), acceptLanguageHeader);

        content.setTitle(title);
        content.setLanguage(resolvedLang);
        content.setNotificationsEnabled(notificationsEnabled);
        if (notificationsEnabled) {
            if (reminderAt == null) {
                throw new IllegalArgumentException("Reminder date-time is required when notifications are enabled");
            }
            if (reminderAt.isBefore(Instant.now())) {
                throw new IllegalArgumentException("Reminder date-time must be in the future");
            }
            content.setNotificationReminderAt(reminderAt);
            content.setReminderNotifiedAt(null);
        } else {
            content.setNotificationReminderAt(null);
            content.setReminderNotifiedAt(null);
        }
        content.setStatus(CONTENT_STATUS_CONFIRMED);
        inboxItemRepository.save(content);

        saveSummary(inboxItemId, summaryText, resolvedLang);
        previewCache.keySet().removeIf(k -> k.startsWith(inboxItemId + ":"));

        String body = content.getRawContent() != null && !content.getRawContent().isBlank()
                ? content.getRawContent()
                : analysisResultRepository.findByInboxItemId(inboxItemId)
                        .map(AnalysisResult::getRawText)
                        .filter(text -> text != null && !text.isBlank())
                        .orElse(summaryText);
        knowledgeService.upsertFromInboxConfirmation(
                userId,
                inboxItemId,
                title,
                summaryText,
                body,
                resolvedLang,
                content.getType()
        );

        processingJobRepository.findFirstByInboxItemIdOrderByCreatedAtDesc(inboxItemId)
                .ifPresent(job -> {
                    job.setStatus(STATUS_COMPLETED);
                    job.setStep("DONE");
                    processingJobRepository.save(job);
                });

        AiCallOptions enrichOpts = UserAiPreferences.aiCallOptions(user, resolvedLang, acceptLanguageHeader);
        self.runBackgroundEnrichment(inboxItemId, enrichOpts);
    }

    /**
     * Digital Brain: after frictionless capture, register a queued processing job (pipeline entry).
     */
    @Transactional
    public void enqueueInboxCapture(UUID inboxItemId) {
        ProcessingJob job = ProcessingJob.builder()
                .inboxItemId(inboxItemId)
                .inboxItemId(inboxItemId)
                .status(STATUS_QUEUED)
                .step("INBOX")
                .build();
        processingJobRepository.save(job);
    }

    private boolean isExpired(Instant createdAt) {
        return createdAt == null || createdAt.plusSeconds(PREVIEW_CACHE_TTL_SECONDS).isBefore(Instant.now());
    }

    private record CachedPreview(AiPreviewResponse preview, Instant createdAt) {}

    @Async("processingExecutor")
    public void runBackgroundEnrichment(UUID inboxItemId, AiCallOptions options) {
        InboxItem content = inboxItemRepository.findById(inboxItemId).orElse(null);
        if (content == null) {
            return;
        }
        User user = userRepository.findById(content.getUserId()).orElse(null);
        ProcessingPipelineOptions pipe = ProcessingPipelineOptions.fromUser(user);
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String lang = opts.responseLanguage();
        try {
            String rawText = extractText(inboxItemId, lang);
            String cleanedText = cleanText(rawText);
            saveAnalysis(inboxItemId, cleanedText, lang);
            updateJobStepCreateIfNeeded(inboxItemId, "CONFIRMATION");
            List<String> tagNames = new ArrayList<>();
            if (pipe.classify()) {
                tagNames.addAll(aiService.classify(cleanedText, opts));
            }
            if (pipe.generateTags()) {
                if (user != null && UserKnowledgePreferences.isAutoTaggingEnabled(user)) {
                    tagNames = mergeDistinctTagLabels(tagNames, aiService.generateTags(cleanedText, opts));
                    assignTags(inboxItemId, tagNames);
                } else {
                    assignTags(inboxItemId, List.of());
                }
            } else {
                assignTags(inboxItemId, List.of());
            }

            // Generate Embedding
            Summary summary = summaryRepository.findByInboxItemId(inboxItemId).orElse(null);
            String textToEmbed = (summary != null && summary.getSummaryText() != null && !summary.getSummaryText().isBlank())
                    ? summary.getSummaryText()
                    : cleanedText;
            generateAndSaveEmbedding(inboxItemId, user.getId(), textToEmbed);

        } catch (Exception e) {
            log.error("Background enrichment failed for content {}", inboxItemId, e);
        }
    }

    private ProcessingJob createPipelineJob(UUID inboxItemId) {
        ProcessingJob job = ProcessingJob.builder()
                .inboxItemId(inboxItemId)
                .status(STATUS_QUEUED)
                .step("INIT")
                .retryCount(0)
                .build();
        return processingJobRepository.save(job);
    }

    private void updateJobStep(UUID jobId, String step) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStep(step);
            processingJobRepository.save(job);
            notifyUser(job.getInboxItemId(), "JOB_UPDATE", job);
        });
    }

    private void completeJob(UUID jobId) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(STATUS_COMPLETED);
            job.setStep("DONE");
            processingJobRepository.save(job);
            notifyUser(job.getInboxItemId(), "JOB_COMPLETED", job);
        });
    }

    private void notifyUser(UUID inboxItemId, String eventName, Object data) {
        inboxItemRepository.findById(inboxItemId).ifPresent(item -> {
            sseService.sendEventToUser(item.getUserId(), eventName, data);
        });
    }

    private void generateAndSaveEmbedding(UUID inboxItemId, UUID userId, String textToEmbed) {
        if (textToEmbed == null || textToEmbed.isBlank()) return;
        try {
            List<Float> vector = aiService.generateEmbedding(textToEmbed);
            if (vector != null && !vector.isEmpty()) {
                KnowledgeEmbedding emb = KnowledgeEmbedding.builder()
                        .userId(userId)
                        .inboxItemId(inboxItemId)
                        .embedding(vector)
                        .build();
                // Optionally delete old embedding first to keep 1-to-1 mapping
                knowledgeEmbeddingRepository.deleteByInboxItemId(inboxItemId);
                knowledgeEmbeddingRepository.save(emb);
            }
        } catch (Exception e) {
            log.warn("Failed to generate embedding for {}: {}", inboxItemId, e.getMessage());
        }
    }

    private void failJobWithRetry(UUID jobId, String errorMessage) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setLastError(errorMessage);
            if (job.getRetryCount() < 3) {
                job.setRetryCount(job.getRetryCount() + 1);
                job.setStatus(STATUS_QUEUED);
                log.warn("Job {} failed but will be retried. Attempt {}", jobId, job.getRetryCount());
            } else {
                job.setStatus(STATUS_FAILED);
                markContentFailed(job.getInboxItemId());
                log.error("Job {} failed permanently after {} attempts", jobId, job.getRetryCount());
                notifyUser(job.getInboxItemId(), "JOB_FAILED", job);
            }
            processingJobRepository.save(job);
        });
    }

    private void failJob(UUID jobId) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(STATUS_FAILED);
            processingJobRepository.save(job);
            markContentFailed(job.getInboxItemId());
            notifyUser(job.getInboxItemId(), "JOB_FAILED", job);
        });
    }


    private String extractText(UUID inboxItemId, String preferredLanguage) {
        return inboxItemRepository.findById(inboxItemId)
                .map(c -> extractTextFromContent(c, preferredLanguage))
                .orElse("");
    }

    /**
     * Extracts best-available capture text:
     * raw content > YouTube transcript+metadata > readable web article extraction.
     */
    private String extractTextFromContent(InboxItem c, String preferredLanguage) {
        String url = c.getSourceUrl() != null ? c.getSourceUrl().trim() : "";
        String raw = c.getRawContent() != null ? c.getRawContent().trim() : "";

        if (url.isEmpty() && raw.isEmpty()) {
            return "";
        }

        if (!url.isEmpty() && isYouTubeWatchUrl(url)) {
            String yt = youTubeTranscriptService.buildCaptureText(url, preferredLanguage);
            if (!yt.isEmpty()) {
                return raw.isEmpty() ? yt : raw + "\n\n---\n" + yt;
            }
            log.debug("YouTube transcript/metadata empty for {}, falling back to web extraction", url);
        }

        if (!raw.isEmpty()) {
            return raw;
        }
        if (!url.isEmpty()) {
            return webContentExtractionService.fetchReadableText(url);
        }
        return "";
    }

    private static boolean isYouTubeWatchUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String u = url.toLowerCase(Locale.ROOT);
        return u.contains("youtube.com/") || u.contains("youtu.be/");
    }

    private String cleanText(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ");
    }

    private AnalysisResult saveAnalysis(UUID inboxItemId, String cleanedText, String language) {
        analysisResultRepository.deleteByInboxItemId(inboxItemId);
        String lang = language != null && !language.isBlank() ? language : "en";
        AnalysisResult ar = AnalysisResult.builder()
                .inboxItemId(inboxItemId)
                .rawText(cleanedText)
                .language(lang)
                .build();
        return analysisResultRepository.save(ar);
    }

    private static List<String> mergeDistinctTagLabels(List<String> a, List<String> b) {
        Map<String, String> canon = new LinkedHashMap<>();
        for (String s : a) {
            if (s == null || s.isBlank()) {
                continue;
            }
            String t = s.trim();
            canon.putIfAbsent(t.toLowerCase(Locale.ROOT), t);
        }
        for (String s : b) {
            if (s == null || s.isBlank()) {
                continue;
            }
            String t = s.trim();
            canon.putIfAbsent(t.toLowerCase(Locale.ROOT), t);
        }
        return new ArrayList<>(canon.values());
    }

    private void assignTags(UUID inboxItemId, List<String> tagNames) {
        contentTagRepository.deleteByInboxItemId(inboxItemId);
        for (String name : tagNames) {
            Tag tag = tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));
            contentTagRepository.save(com.synapse.modules.inbox.entity.InboxItemTag.builder()
                    .inboxItemId(inboxItemId)
                    .tagId(tag.getId())
                    .build());
        }
    }

    private void saveSummary(UUID inboxItemId, String summaryText, String language) {
        summaryRepository.deleteByInboxItemId(inboxItemId);
        summaryRepository.save(Summary.builder()
                .inboxItemId(inboxItemId)
                .summaryText(summaryText)
                .model(aiService.getModelName())
                .language(language != null ? language : "en")
                .build());
    }

    private void saveGeneratedTitle(UUID inboxItemId, String generatedTitle, String language) {
        String fallback = language != null && language.startsWith("es") ? "Captura" : "Capture";
        String resolved = generatedTitle != null && !generatedTitle.isBlank() ? generatedTitle.trim() : fallback;
        inboxItemRepository.findById(inboxItemId).ifPresent(c -> {
            c.setTitle(resolved);
            inboxItemRepository.save(c);
        });
    }

    private void markContentReady(UUID inboxItemId) {
        inboxItemRepository.findById(inboxItemId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_READY);
            inboxItemRepository.save(c);
        });
    }

    private void markContentFailed(UUID inboxItemId) {
        inboxItemRepository.findById(inboxItemId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_FAILED);
            inboxItemRepository.save(c);
        });
    }

    /**
     * Optional helper for future job integration.
     * Currently a no-op unless ProcessingJob is already being used.
     */
    private void updateJobStepCreateIfNeeded(UUID inboxItemId, String step) {
        // No-op: we keep the legacy async job pipeline for now.
        // This placeholder avoids duplicating job tracking logic during the confirm flow.
    }
}
