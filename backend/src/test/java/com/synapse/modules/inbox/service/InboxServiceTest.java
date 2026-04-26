package com.synapse.modules.inbox.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.inbox.dto.InboxItemResponse;
import com.synapse.modules.inbox.dto.CreateInboxItemRequest;
import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.inbox.repository.InboxItemTagRepository;
import com.synapse.modules.summary.repository.SummaryRepository;
import com.synapse.modules.ai.AiCallOptions;
import com.synapse.modules.processing.ProcessingPipelineOptions;
import com.synapse.modules.processing.service.ProcessingService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InboxServiceTest {

    @Mock
    private InboxItemRepository inboxItemRepository;

    @Mock
    private InboxItemTagRepository contentTagRepository;

    @Mock
    private SummaryRepository summaryRepository;

    @Mock
    private ProcessingService processingService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InboxService inboxService;

    @Test
    void create_persistsContent_doesNotAutoProcessWhenManualMode() {
        UUID userId = UUID.randomUUID();
        CreateInboxItemRequest request = new CreateInboxItemRequest();
        request.setType("TEXT");
        request.setSourceUrl("https://example.com");

        User user = User.builder()
                .id(userId)
                .aiAutoProcessCapture(false)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        InboxItem saved = InboxItem.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type("TEXT")
                .sourceUrl(request.getSourceUrl())
                .status("PENDING")
                .build();
        when(inboxItemRepository.save(any(InboxItem.class))).thenReturn(saved);

        InboxItemResponse response = inboxService.create(userId, request, "en", "en-US,en;q=0.9");

        assertThat(response.getType()).isEqualTo("TEXT");
        assertThat(response.getSourceUrl()).isEqualTo(request.getSourceUrl());
        assertThat(response.getStatus()).isEqualTo("PENDING");

        ArgumentCaptor<InboxItem> contentCaptor = ArgumentCaptor.forClass(InboxItem.class);
        verify(inboxItemRepository).save(contentCaptor.capture());
        assertThat(contentCaptor.getValue().getUserId()).isEqualTo(userId);

        verify(processingService, never()).enqueueInboxCapture(any());
        verify(processingService, never())
                .processContentAsync(any(), any(AiCallOptions.class), any(ProcessingPipelineOptions.class));
    }



    @Test
    void getById_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(inboxItemRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inboxService.getById(id, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("InboxItem not found");
    }
}
