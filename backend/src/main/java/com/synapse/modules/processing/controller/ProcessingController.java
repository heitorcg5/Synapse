package com.synapse.modules.processing.controller;

import com.synapse.modules.processing.dto.ProcessingJobResponse;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Digital Brain processing pipeline visibility.
 */
@RestController
@RequestMapping("/processing")
@RequiredArgsConstructor
public class ProcessingController {

    private final ProcessingJobRepository processingJobRepository;

    @GetMapping("/jobs")
    public ResponseEntity<List<ProcessingJobResponse>> listJobs(
            @CurrentUser User currentUser
    ) {
        List<ProcessingJob> jobs = processingJobRepository.findForUserOrderByCreatedAtDesc(currentUser.getId());
        return ResponseEntity.ok(jobs.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    private ProcessingJobResponse toResponse(ProcessingJob j) {
        UUID inboxId = j.getInboxItemId() != null ? j.getInboxItemId() : j.getContentId();
        return ProcessingJobResponse.builder()
                .id(j.getId())
                .inboxItemId(inboxId)
                .status(j.getStatus())
                .step(j.getStep())
                .createdAt(j.getCreatedAt())
                .updatedAt(j.getUpdatedAt())
                .build();
    }
}
