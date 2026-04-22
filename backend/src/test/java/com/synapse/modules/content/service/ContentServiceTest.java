package com.synapse.modules.content.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
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
class ContentServiceTest {

    @Mock
    private ContentRepository contentRepository;

    @Mock
    private ContentTagRepository contentTagRepository;

    @Mock
    private SummaryRepository summaryRepository;

    @Mock
    private ProcessingService processingService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ContentService contentService;

    @Test
    void create_persistsContent_doesNotAutoProcessWhenManualMode() {
        UUID userId = UUID.randomUUID();
        CreateContentRequest request = new CreateContentRequest();
        request.setType("TEXT");
        request.setSourceUrl("https://example.com");

        User user = User.builder()
                .id(userId)
                .aiAutoProcessCapture(false)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        Content saved = Content.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type("TEXT")
                .sourceUrl(request.getSourceUrl())
                .status("PENDING")
                .build();
        when(contentRepository.save(any(Content.class))).thenReturn(saved);

        ContentResponse response = contentService.create(userId, request, "en", "en-US,en;q=0.9");

        assertThat(response.getType()).isEqualTo("TEXT");
        assertThat(response.getSourceUrl()).isEqualTo(request.getSourceUrl());
        assertThat(response.getStatus()).isEqualTo("PENDING");

        ArgumentCaptor<Content> contentCaptor = ArgumentCaptor.forClass(Content.class);
        verify(contentRepository).save(contentCaptor.capture());
        assertThat(contentCaptor.getValue().getUserId()).isEqualTo(userId);

        verify(processingService, never()).enqueueInboxCapture(any());
        verify(processingService, never())
                .processContentAsync(any(), any(AiCallOptions.class), any(ProcessingPipelineOptions.class));
    }

    @Test
    void create_runsPipelineWhenAutoProcessOn() {
        UUID userId = UUID.randomUUID();
        CreateContentRequest request = new CreateContentRequest();
        request.setType("TEXT");
        request.setRawContent("hello");

        User user = User.builder()
                .id(userId)
                .aiAutoProcessCapture(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        Content saved = Content.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type("TEXT")
                .status("PENDING")
                .build();
        when(contentRepository.save(any(Content.class))).thenReturn(saved);

        contentService.create(userId, request, "en", "es-ES,es;q=0.9");

        verify(processingService)
                .processContentAsync(eq(saved.getId()), any(AiCallOptions.class), any(ProcessingPipelineOptions.class));
        verify(processingService, never()).enqueueInboxCapture(any());
    }

    @Test
    void getById_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(contentRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contentService.getById(id, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Content not found");
    }
}
