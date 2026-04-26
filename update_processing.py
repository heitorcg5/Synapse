import os
import re

file_path = "backend/src/main/java/com/synapse/modules/processing/service/ProcessingService.java"

with open(file_path, "r") as f:
    content = f.read()

# 1. Update processContentAsync
content = re.sub(
    r'@Async\("processingExecutor"\)\s*public void processContentAsync\(UUID inboxItemId, AiCallOptions options, ProcessingPipelineOptions pipeline\) \{.*?try \{.*?runPipelineSteps.*?\} catch \(Exception e\) \{.*?markContentFailed\(inboxItemId\);\s*\}\s*\}',
    '''public void processContentAsync(UUID inboxItemId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
        inboxItemRepository.findById(inboxItemId).ifPresent(c -> {
            c.setStatus(CONTENT_STATUS_PROCESSING);
            inboxItemRepository.save(c);
        });
        createPipelineJob(inboxItemId);
    }''',
    content, flags=re.DOTALL
)

# 2. Update startManualPipelineAsync
content = re.sub(
    r'@Async\("processingExecutor"\)\s*public void startManualPipelineAsync\(UUID inboxItemId, UUID userId, AiCallOptions options, ProcessingPipelineOptions pipeline\) \{.*?try \{.*?runPipelineSteps.*?\} catch \(Exception e\) \{.*?markContentFailed\(inboxItemId\);\s*\}\s*\}',
    '''public void startManualPipelineAsync(UUID inboxItemId, UUID userId, AiCallOptions options, ProcessingPipelineOptions pipeline) {
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
    }''',
    content, flags=re.DOTALL
)

# 3. Update processQueuedJob
# We want to rename it to processQueuedJobSafe, remove @Async, and add retry logic.
content = re.sub(
    r'@Async\("processingExecutor"\)\s*public void processQueuedJob\(UUID jobId\) \{.*?try \{.*?runPipelineSteps.*?\} catch \(Exception e\) \{.*?failJob\(job\.getId\(\)\);.*?markContentFailed\(content\.getId\(\)\);\s*\}\s*\}',
    '''@org.springframework.scheduling.annotation.Async("processingExecutor")
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
        
        AiCallOptions opts = UserAiPreferences.aiCallOptions(user, content.getLanguage(), null);
        ProcessingPipelineOptions pipeline = ProcessingPipelineOptions.fromUser(user);
        
        try {
            runPipelineSteps(content.getId(), job.getId(), opts, pipeline);
        } catch (Exception e) {
            log.error("Queued processing failed for job {}", job.getId(), e);
            failJobWithRetry(job.getId(), e.getMessage());
        }
    }''',
    content, flags=re.DOTALL
)

# 4. Update createPipelineJob
content = re.sub(
    r'private ProcessingJob createPipelineJob\(UUID inboxItemId\) \{.*?ProcessingJob job = ProcessingJob\.builder\(\).*?\.inboxItemId\(inboxItemId\).*?\.inboxItemId\(inboxItemId\).*?\.status\(STATUS_RUNNING\).*?\.step\("INIT"\).*?\.build\(\);\s*return processingJobRepository\.save\(job\);\s*\}',
    '''private ProcessingJob createPipelineJob(UUID inboxItemId) {
        ProcessingJob job = ProcessingJob.builder()
                .inboxItemId(inboxItemId)
                .status(STATUS_QUEUED)
                .step("INIT")
                .retryCount(0)
                .build();
        return processingJobRepository.save(job);
    }''',
    content, flags=re.DOTALL
)

# 5. Add failJobWithRetry
# Also keep failJob for backward compatibility if any other method uses it.
content = re.sub(
    r'private void failJob\(UUID jobId\) \{',
    '''private void failJobWithRetry(UUID jobId, String errorMessage) {
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
            }
            processingJobRepository.save(job);
        });
    }

    private void failJob(UUID jobId) {''',
    content
)

with open(file_path, "w") as f:
    f.write(content)

print("ProcessingService updated.")
