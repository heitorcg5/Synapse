package com.synapse.modules.content.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.content.dto.ContentResponse;
import com.synapse.modules.content.dto.CreateContentRequest;
import com.synapse.modules.content.entity.Content;
import com.synapse.modules.content.repository.ContentRepository;
import com.synapse.modules.content.repository.ContentTagRepository;
import com.synapse.modules.summary.repository.SummaryRepository;
import com.synapse.modules.processing.service.ProcessingService;
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

    @InjectMocks
    private ContentService contentService;

    @Test
    void create_persistsContentAndTriggersProcessing() {
        UUID userId = UUID.randomUUID();
        CreateContentRequest request = new CreateContentRequest();
        request.setType("TEXT");
        request.setSourceUrl("https://example.com");

        Content saved = Content.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type("TEXT")
                .sourceUrl(request.getSourceUrl())
                .status("PENDING")
                .build();
        when(contentRepository.save(any(Content.class))).thenReturn(saved);

        ContentResponse response = contentService.create(userId, request, "en");

        assertThat(response.getType()).isEqualTo("TEXT");
        assertThat(response.getSourceUrl()).isEqualTo(request.getSourceUrl());
        assertThat(response.getStatus()).isEqualTo("PENDING");

        ArgumentCaptor<Content> contentCaptor = ArgumentCaptor.forClass(Content.class);
        verify(contentRepository).save(contentCaptor.capture());
        assertThat(contentCaptor.getValue().getUserId()).isEqualTo(userId);

        verify(processingService).processContentAsync(saved.getId(), "en");
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
