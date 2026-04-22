package com.synapse.modules.processing.controller;

import com.synapse.modules.processing.dto.ProcessingJobResponse;
import com.synapse.modules.processing.entity.ProcessingJob;
import com.synapse.modules.processing.repository.ProcessingJobRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    private final UserRepository userRepository;

    @GetMapping("/jobs")
    public ResponseEntity<List<ProcessingJobResponse>> listJobs(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        List<ProcessingJob> jobs = processingJobRepository.findForUserOrderByCreatedAtDesc(userId);
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
