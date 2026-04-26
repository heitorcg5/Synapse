package com.synapse.modules.processing;

import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time cleanup: mark ProcessingJobs as COMPLETED when their InboxItem is already READY.
 * Fixes orphaned jobs that stayed QUEUED/INBOX after user confirmation (before we added the update).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessingJobCleanup {

    private static final String STATUS_QUEUED = "QUEUED";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String CONTENT_READY = "READY";

    private final ProcessingJobRepository processingJobRepository;
    private final InboxItemRepository inboxItemRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void fixOrphanedJobs() {
        List<ProcessingJob> queued = processingJobRepository.findAll().stream()
                .filter(j -> STATUS_QUEUED.equals(j.getStatus()))
                .toList();
        int fixed = 0;
        for (ProcessingJob job : queued) {
            boolean contentReady = inboxItemRepository.findById(job.getInboxItemId())
                    .map(c -> CONTENT_READY.equals(c.getStatus()))
                    .orElse(false);
            if (contentReady) {
                job.setStatus(STATUS_COMPLETED);
                job.setStep("DONE");
                processingJobRepository.save(job);
                fixed++;
            }
        }
        if (fixed > 0) {
            log.info("ProcessingJobCleanup: fixed {} orphaned jobs (InboxItem READY but job was QUEUED)", fixed);
        }
    }
}
