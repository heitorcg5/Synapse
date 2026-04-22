package com.synapse.modules.knowledge.dto;

import org.springframework.http.MediaType;

public record KnowledgeExportFile(byte[] body, MediaType mediaType, String filename) {}
