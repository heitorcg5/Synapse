package com.synapse.modules.processing.service;

import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.ai.SummaryDetailLevel;
import com.synapse.modules.ai.service.AiService;
import com.synapse.modules.content.dto.AiPreviewResponse;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.entity.Tag;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.content.repository.TagRepository;
import com.synapse.modules.content.service.WebContentExtractionService;
import com.synapse.modules.content.service.YouTubeTranscriptService;
import com.synapse.modules.processing.entity.AnalysisResult;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.AnalysisResultRepository;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
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

    private final ContentRepository contentRepository;
    private final ProcessingJobRepository processingJobRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final SummaryRepository summaryRepository;
    private final TagRepository tagRepository;
    private final ContentTagRepository contentTagRepository;
    private final AiService aiService;
    private final KnowledgeService knowledgeService;
    private final UserRepository userRepository;
    private final WebContentExtractionService webContentExtractionService;
    private final YouTubeTranscriptService youTubeTranscriptService;
    private final NotificationService notificationService;

    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_QUEUED = "QUEUED";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_PENDING = "PENDING";
    private static final String CONTENT_STATUS_READY = "READY";
    private static final int PREVIEW_MAX_CHARS = 2200;
    private static final long PREVIEW_CACHE_TTL_SECONDS = 300;

    /**
     * Small in-memory cache to avoid regenerating the same preview repeatedly.
     * Key format: contentId:previewCacheKey (language + summary detail).
     */
    private final Map<String, CachedPreview> previewCache = new ConcurrentHashMap<>();

    /**
     * Full pipeline after capture (immediate mode). Creates a new RUNNING job.
     */
    @Async("processingExecutor")
    public void processContentAsync(UUID contentId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        ProcessingPipelineOptions pipe = pipeline != null
                ? pipeline
                : contentRepository.findById(contentId)
                        .flatMap(c -> userRepository.findById(c.getUserId()))
                        .map(ProcessingPipelineOptions::fromUser)
                        .orElseGet(ProcessingPipelineOptions::defaults);
        log.debug("Processing contentId={} aiLang={} detail={} summarize={}",
                contentId, opts.responseLanguage(), opts.summaryDetail(), pipe.summarize());
        ProcessingJob job = createPipelineJob(contentId);
        try {
            runPipelineSteps(contentId, job.getId(), opts, pipe);
        } catch (Exception e) {
            log.error("Processing failed for content {}", contentId, e);
            failJob(job.getId());
        }
    }

    /**
     * User-triggered processing (e.g. manual mode) for a pending capture.
     */
    @Async("processingExecutor")
    public void startManualPipelineAsync(UUID contentId, UUID userId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Content not found");
        }
        if (!STATUS_PENDING.equals(content.getStatus())) {
            log.debug("start manual pipeline skipped contentId={} status={}", contentId, content.getStatus());
            return;
        }
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        ProcessingPipelineOptions pipe = pipeline != null ? pipeline : ProcessingPipelineOptions.defaults();
        ProcessingJob job = createPipelineJob(contentId);
        try {
            runPipelineSteps(contentId, job.getId(), opts, pipe);
        } catch (Exception e) {
            log.error("Manual processing failed for content {}", contentId, e);
            failJob(job.getId());
        }
    }

    /**
     * Background queue: transition QUEUED job to pipeline (must match user {@code background} mode).
     */
    @Async("processingExecutor")
    public void processQueuedJob(UUID jobId) {
        ProcessingJob job = processingJobRepository.findById(jobId).orElse(null);
        if (job == null || !STATUS_QUEUED.equals(job.getStatus())) {
            return;
        }
        Content content = contentRepository.findById(job.getContentId()).orElse(null);
        if (content == null) {
            return;
        }
        User user = userRepository.findById(content.getUserId()).orElse(null);
        if (user == null) {
            return;
        }
        if (!"background".equals(UserProcessingPreferences.effectiveProcessingMode(user))) {
            return;
        }
        job.setStatus(STATUS_RUNNING);
        job.setStep("INIT");
        processingJobRepository.save(job);
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), null);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        try {
            runPipelineSteps(content.getId(), job.getId(), opts, pipeline);
        } catch (Exception e) {
            log.error("Queued processing failed for content {}", content.getId(), e);
            failJob(job.getId());
        }
    }

    private void runPipelineSteps(UUID contentId, UUID jobId, AiCallOptions opts, ProcessingPipelineOptions pipeline) {
        Content contentRow = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalStateException("Content vanished during processing"));
        User user = userRepository.findById(contentRow.getUserId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        String lang = opts.responseLanguage();
        updateJobStep(jobId, "EXTRACTION");
        String rawText = extractText(contentId, lang);
        updateJobStep(jobId, "CLEANING");
        String cleanedText = cleanText(rawText);
        updateJobStep(jobId, "ANALYSIS");
        saveAnalysis(contentId, cleanedText, lang);

        updateJobStep(jobId, "CLASSIFICATION");
        List<String> tagNames = new ArrayList<>();
        if (pipeline.classify()) {
            tagNames.addAll(aiService.classify(cleanedText, opts));
        }
        if (pipeline.generateTags()) {
            if (UserKnowledgePreferences.isAutoTaggingEnabled(user)) {
                List<String> aiTags = aiService.generateTags(cleanedText, opts);
                tagNames = mergeDistinctTagLabels(tagNames, aiTags);
                assignTags(contentId, tagNames);
            } else {
                assignTags(contentId, List.of());
            }
        } else {
            assignTags(contentId, List.of());
        }

        updateJobStep(jobId, "SUMMARY");
        if (pipeline.summarize()) {
            String summaryText = aiService.summarize(cleanedText, opts);
            saveSummary(contentId, summaryText, lang);
        } else {
            summaryRepository.deleteByContentId(contentId);
        }

        if (pipeline.detectDuplicates()) {
            detectDuplicateCaptures(contentRow, user);
        }
        if (pipeline.suggestConnections()) {
            log.debug("Suggest connections for contentId={} (not implemented — enable reserved for future graph links)", contentId);
        }

        completeJob(jobId);
        markContentReady(contentId);
        notificationService.notifyProcessingFinishedIfEnabled(user, contentId);
    }

    private void detectDuplicateCaptures(Content current, User user) {
        String url = current.getSourceUrl();
        if (url == null || url.isBlank()) {
            return;
        }
        List<Content> others = contentRepository.findByUserIdAndSourceUrlAndIdNotOrderByUploadedAtAsc(
                current.getUserId(), url.trim(), current.getId());
        if (!others.isEmpty()) {
            Content first = others.get(0);
            log.info("Duplicate capture: same source URL already exists for user {} (content {} vs {})",
                    current.getUserId(), current.getId(), first.getId());
            notificationService.notifyDuplicateIfEnabled(user, current.getId(), first.getId());
        }
    }

    /**
     * Generates AI suggestions for the "pending confirmation" modal.
     * This does not persist anything yet.
     */
    public AiPreviewResponse generateAiPreview(UUID contentId, UUID userId, String acceptLanguageHeader) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Content not found");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), acceptLanguageHeader);
        String cacheKey = contentId + ":" + opts.previewCacheKey();
        CachedPreview cached = previewCache.get(cacheKey);
        if (cached != null && !isExpired(cached.createdAt())) {
            return cached.preview();
        }

        String rawText = extractText(contentId, opts.responseLanguage());
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
            UUID contentId,
            UUID userId,
            String acceptLanguageHeader,
            String title,
            String summaryText,
            boolean notificationsEnabled
    ) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found"));
        if (!content.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Content not found");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String resolvedLang = UserAiPreferences.resolveResponseLanguage(user, content.getLanguage(), acceptLanguageHeader);

        content.setTitle(title);
        content.setLanguage(resolvedLang);
        content.setNotificationsEnabled(notificationsEnabled);
        content.setStatus(CONTENT_STATUS_READY);
        contentRepository.save(content);

        saveSummary(contentId, summaryText, resolvedLang);
        previewCache.keySet().removeIf(k -> k.startsWith(contentId + ":"));

        String body = content.getRawContent() != null && !content.getRawContent().isBlank()
                ? content.getRawContent()
                : summaryText;
        knowledgeService.upsertFromInboxConfirmation(
                userId,
                contentId,
                title,
                summaryText,
                body,
                resolvedLang,
                content.getType()
        );

        processingJobRepository.findFirstByContentIdOrderByCreatedAtDesc(contentId)
                .ifPresent(job -> {
                    job.setStatus(STATUS_COMPLETED);
                    job.setStep("DONE");
                    processingJobRepository.save(job);
                });

        AiCallOptions enrichOpts = UserAiPreferences.aiCallOptions(user, resolvedLang, acceptLanguageHeader);
        self.runBackgroundEnrichment(contentId, enrichOpts);
    }

    /**
     * Digital Brain: after frictionless capture, register a queued processing job (pipeline entry).
     */
    @Transactional
    public void enqueueInboxCapture(UUID inboxItemId) {
        ProcessingJob job = ProcessingJob.builder()
                .contentId(inboxItemId)
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
    public void runBackgroundEnrichment(UUID contentId, AiCallOptions options) {
        Content content = contentRepository.findById(contentId).orElse(null);
        if (content == null) {
            return;
        }
        User user = userRepository.findById(content.getUserId()).orElse(null);
        ProcessingPipelineOptions pipe = ProcessingPipelineOptions.fromUser(user);
        AiCallOptions opts = options != null ? options : new AiCallOptions("en", SummaryDetailLevel.MEDIUM);
        String lang = opts.responseLanguage();
        try {
            String rawText = extractText(contentId, lang);
            String cleanedText = cleanText(rawText);
            saveAnalysis(contentId, cleanedText, lang);
            updateJobStepCreateIfNeeded(contentId, "CONFIRMATION");
            List<String> tagNames = new ArrayList<>();
            if (pipe.classify()) {
                tagNames.addAll(aiService.classify(cleanedText, opts));
            }
            if (pipe.generateTags()) {
                if (user != null && UserKnowledgePreferences.isAutoTaggingEnabled(user)) {
                    tagNames = mergeDistinctTagLabels(tagNames, aiService.generateTags(cleanedText, opts));
                    assignTags(contentId, tagNames);
                } else {
                    assignTags(contentId, List.of());
                }
            } else {
                assignTags(contentId, List.of());
            }
        } catch (Exception e) {
            log.error("Background enrichment failed for content {}", contentId, e);
        }
    }

    private ProcessingJob createPipelineJob(UUID contentId) {
        ProcessingJob job = ProcessingJob.builder()
                .contentId(contentId)
                .inboxItemId(contentId)
                .status(STATUS_RUNNING)
                .step("INIT")
                .build();
        return processingJobRepository.save(job);
    }

    private void updateJobStep(UUID jobId, String step) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStep(step);
            processingJobRepository.save(job);
        });
    }

    private void completeJob(UUID jobId) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(STATUS_COMPLETED);
            job.setStep("DONE");
            processingJobRepository.save(job);
        });
    }

    private void failJob(UUID jobId) {
        processingJobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(STATUS_FAILED);
            processingJobRepository.save(job);
        });
    }

    private String extractText(UUID contentId, String preferredLanguage) {
        return contentRepository.findById(contentId)
                .map(c -> extractTextFromContent(c, preferredLanguage))
                .orElse("");
    }

    /**
     * Extracts best-available capture text:
     * raw content > YouTube transcript+metadata > readable web article extraction.
     */
    private String extractTextFromContent(Content c, String preferredLanguage) {
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

    private AnalysisResult saveAnalysis(UUID contentId, String cleanedText, String language) {
        analysisResultRepository.deleteByContentId(contentId);
        String lang = language != null && !language.isBlank() ? language : "en";
        AnalysisResult ar = AnalysisResult.builder()
                .contentId(contentId)
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

    private void assignTags(UUID contentId, List<String> tagNames) {
        contentTagRepository.deleteByContentId(contentId);
        for (String name : tagNames) {
            Tag tag = tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));
            contentTagRepository.save(com.synapse.modules.content.entity.ContentTag.builder()
                    .contentId(contentId)
                    .tagId(tag.getId())
                    .build());
        }
    }

    private void saveSummary(UUID contentId, String summaryText, String language) {
        summaryRepository.deleteByContentId(contentId);
        summaryRepository.save(Summary.builder()
                .contentId(contentId)
                .summaryText(summaryText)
                .model(aiService.getModelName())
                .language(language != null ? language : "en")
                .build());
    }

    private void markContentReady(UUID contentId) {
        contentRepository.findById(contentId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_READY);
            contentRepository.save(c);
        });
    }

    /**
     * Optional helper for future job integration.
     * Currently a no-op unless ProcessingJob is already being used.
     */
    private void updateJobStepCreateIfNeeded(UUID contentId, String step) {
        // No-op: we keep the legacy async job pipeline for now.
        // This placeholder avoids duplicating job tracking logic during the confirm flow.
    }
}
