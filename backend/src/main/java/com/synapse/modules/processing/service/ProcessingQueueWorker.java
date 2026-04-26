package com.synapse.modules.processing.service;

import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessingQueueWorker {

    private final ProcessingJobRepository processingJobRepository;
    private final ProcessingService processingService;

    /**
     * Recovers jobs that were stuck in PROCESSING when the server shut down abruptly.
     */
    @PostConstruct
    @Transactional
    public void recoverOrphanedJobs() {
        List<ProcessingJob> orphaned = processingJobRepository.findByStatusOrderByCreatedAtAsc(
                ProcessingService.STATUS_PROCESSING, 
                PageRequest.of(0, 1000)
        );
        if (!orphaned.isEmpty()) {
            log.warn("Found {} orphaned processing jobs. Reverting them to QUEUED status.", orphaned.size());
            for (ProcessingJob job : orphaned) {
                job.setStatus(ProcessingService.STATUS_QUEUED);
                processingJobRepository.save(job);
            }
        }
    }

    /**
     * Polls for queued jobs periodically. 
     * Uses Postgres SKIP LOCKED to safely fetch jobs even if multiple instances run.
     */
    @Scheduled(fixedDelayString = "${synapse.processing.queue.delay-ms:5000}")
    @Transactional
    public void processNextBatch() {
        // Fetch up to 5 jobs using pessimistic write lock (SKIP LOCKED)
        List<ProcessingJob> nextJobs = processingJobRepository.findNextJobs(
                ProcessingService.STATUS_QUEUED, 
                PageRequest.of(0, 5)
        );
        
        for (ProcessingJob job : nextJobs) {
            log.info("Picked up job {} from database queue for inboxItemId {}", job.getId(), job.getInboxItemId());
            job.setStatus(ProcessingService.STATUS_PROCESSING);
            processingJobRepository.save(job);
            
            // Delegate actual execution. The job will be picked up by the async executor,
            // freeing this worker thread to commit the transaction and release the database locks.
            processingService.processQueuedJobSafe(job.getId());
        }
    }
}
