package com.synapse.modules.user.service;

import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.inbox.repository.InboxItemTagRepository;
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

    private final InboxItemRepository inboxItemRepository;
    private final KnowledgeItemRepository knowledgeItemRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;
    private final SummaryRepository summaryRepository;
    private final InboxItemTagRepository contentTagRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final ProcessingJobRepository processingJobRepository;

    @Transactional
    public void deleteCaptureAndDependents(UUID inboxItemId, UUID userId) {
        InboxItem content = inboxItemRepository.findById(inboxItemId).orElse(null);
        if (content == null || !content.getUserId().equals(userId)) {
            return;
        }
        knowledgeItemRepository.findByInboxItemId(inboxItemId).ifPresent(ki -> {
            knowledgeRelationRepository.deleteAllTouchingKnowledgeItem(ki.getId());
            knowledgeItemRepository.delete(ki);
        });
        summaryRepository.deleteByInboxItemId(inboxItemId);
        contentTagRepository.deleteByInboxItemId(inboxItemId);
        analysisResultRepository.deleteByInboxItemId(inboxItemId);
        processingJobRepository.deleteByInboxItemId(inboxItemId);
        inboxItemRepository.delete(content);
        log.debug("Deleted capture {} and dependents for user {}", inboxItemId, userId);
    }
}
