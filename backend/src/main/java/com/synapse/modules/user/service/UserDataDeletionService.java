package com.synapse.modules.user.service;

import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.knowledge.repository.KnowledgeItemRepository;
import com.synapse.modules.knowledge.repository.KnowledgeRelationRepository;
import com.synapse.modules.processing.repository.AnalysisResultRepository;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.summary.repository.SummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Deletes an inbox capture and dependent rows (summaries, tags, knowledge, relations, jobs).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserDataDeletionService {

    private final ContentRepository contentRepository;
    private final KnowledgeItemRepository knowledgeItemRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;
    private final SummaryRepository summaryRepository;
    private final ContentTagRepository contentTagRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final ProcessingJobRepository processingJobRepository;

    @Transactional
    public void deleteCaptureAndDependents(UUID contentId, UUID userId) {
        Content content = contentRepository.findById(contentId).orElse(null);
        if (content == null || !content.getUserId().equals(userId)) {
            return;
        }
        knowledgeItemRepository.findByInboxItemId(contentId).ifPresent(ki -> {
            knowledgeRelationRepository.deleteAllTouchingKnowledgeItem(ki.getId());
            knowledgeItemRepository.delete(ki);
        });
        summaryRepository.deleteByContentId(contentId);
        contentTagRepository.deleteByContentId(contentId);
        analysisResultRepository.deleteByContentId(contentId);
        processingJobRepository.deleteByContentId(contentId);
        contentRepository.delete(content);
        log.debug("Deleted capture {} and dependents for user {}", contentId, userId);
    }
}
