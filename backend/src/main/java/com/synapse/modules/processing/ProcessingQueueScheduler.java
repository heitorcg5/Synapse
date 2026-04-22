package com.synapse.modules.processing;

import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.processing.service.ProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Drains {@code QUEUED} jobs when users have {@code background} processing mode.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessingQueueScheduler {

    private static final String QUEUED = "QUEUED";

    private final ProcessingJobRepository processingJobRepository;
    private final ProcessingService processingService;

    @Scheduled(fixedDelay = 10_000, initialDelay = 15_000)
    public void drainQueuedJobs() {
        List<ProcessingJob> batch = processingJobRepository.findByStatusOrderByCreatedAtAsc(
                QUEUED,
                PageRequest.of(0, 5)
        );
        for (ProcessingJob job : batch) {
            try {
                processingService.processQueuedJob(job.getId());
            } catch (Exception e) {
                log.warn("Scheduler could not run job {}: {}", job.getId(), e.getMessage());
            }
        }
    }
}
