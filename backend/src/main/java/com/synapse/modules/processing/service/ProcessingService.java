package com.synapse.modules.processing.service;

import com.synapse.modules.ai.service.AiService;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.entity.Tag;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.content.repository.TagRepository;
import com.synapse.modules.processing.entity.AnalysisResult;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.AnalysisResultRepository;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.summary.entity.Summary;
import com.synapse.modules.summary.repository.SummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessingService {

    private final ContentRepository contentRepository;
    private final ProcessingJobRepository processingJobRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final SummaryRepository summaryRepository;
    private final TagRepository tagRepository;
    private final ContentTagRepository contentTagRepository;
    private final AiService aiService;

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String CONTENT_STATUS_PROCESSING = "PROCESSING";
    private static final String CONTENT_STATUS_READY = "READY";

    @Async
    @Transactional
    public void processContentAsync(UUID contentId) {
        ProcessingJob job = createJob(contentId);
        try {
            updateJobStep(job.getId(), "EXTRACTION");
            String rawText = extractText(contentId);
            updateJobStep(job.getId(), "CLEANING");
            String cleanedText = cleanText(rawText);
            updateJobStep(job.getId(), "ANALYSIS");
            AnalysisResult analysis = saveAnalysis(contentId, cleanedText);
            updateJobStep(job.getId(), "CLASSIFICATION");
            List<String> tagNames = aiService.classify(cleanedText);
            assignTags(contentId, tagNames);
            updateJobStep(job.getId(), "SUMMARY");
            String summaryText = aiService.summarize(cleanedText);
            saveSummary(contentId, summaryText);
            completeJob(job.getId());
            markContentReady(contentId);
        } catch (Exception e) {
            log.error("Processing failed for content {}", contentId, e);
            failJob(job.getId());
        }
    }

    private ProcessingJob createJob(UUID contentId) {
        ProcessingJob job = ProcessingJob.builder()
                .contentId(contentId)
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

    private String extractText(UUID contentId) {
        // Placeholder: in real impl, extract from URL/file based on content type
        return "Sample extracted text for content " + contentId;
    }

    private String cleanText(String raw) {
        if (raw == null) return "";
        return raw.trim().replaceAll("\\s+", " ");
    }

    private AnalysisResult saveAnalysis(UUID contentId, String cleanedText) {
        AnalysisResult ar = AnalysisResult.builder()
                .contentId(contentId)
                .rawText(cleanedText)
                .language("en")
                .build();
        return analysisResultRepository.save(ar);
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

    private void saveSummary(UUID contentId, String summaryText) {
        summaryRepository.save(Summary.builder()
                .contentId(contentId)
                .summaryText(summaryText)
                .model(aiService.getModelName())
                .build());
    }

    private void markContentReady(UUID contentId) {
        contentRepository.findById(contentId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_READY);
            contentRepository.save(c);
        });
    }
}
