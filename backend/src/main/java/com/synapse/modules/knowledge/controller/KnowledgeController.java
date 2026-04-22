package com.synapse.modules.knowledge.controller;

import com.synapse.modules.knowledge.dto.AssignKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.CreateKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.KnowledgeFacetsResponse;
import com.synapse.modules.knowledge.dto.KnowledgeGraphResponse;
import com.synapse.modules.knowledge.dto.KnowledgeFolderResponse;
import com.synapse.modules.knowledge.dto.KnowledgeItemResponse;
import com.synapse.modules.knowledge.service.KnowledgeService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Digital Brain knowledge layer (structured notes derived from inbox).
 */
@RestController
@RequestMapping("/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {

    private static final String KNOWLEDGE_ID_SEGMENT =
            "/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}";

    private final KnowledgeService knowledgeService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<KnowledgeItemResponse>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String sort,
            @RequestHeader(value = "X-Synapse-Timezone", required = false) String timezone
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(
                knowledgeService.listByUser(userId, from, to, type, tag, sort, timezone)
        );
    }

    @GetMapping("/facets")
    public ResponseEntity<KnowledgeFacetsResponse> facets(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(knowledgeService.facetsForUser(userId));
    }

    @GetMapping("/graph")
    public ResponseEntity<KnowledgeGraphResponse> graph(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(knowledgeService.graphForUser(userId));
    }

    @GetMapping("/folders")
    public ResponseEntity<List<KnowledgeFolderResponse>> listFolders(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(knowledgeService.listFolders(userId));
    }

    @PostMapping("/folders")
    public ResponseEntity<KnowledgeFolderResponse> createFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateKnowledgeFolderRequest request
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(knowledgeService.createFolder(userId, request));
    }

    @GetMapping(KNOWLEDGE_ID_SEGMENT)
    public ResponseEntity<KnowledgeItemResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(knowledgeService.getById(id, userId));
    }

    @PatchMapping(KNOWLEDGE_ID_SEGMENT + "/folder")
    public ResponseEntity<KnowledgeItemResponse> assignFolder(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AssignKnowledgeFolderRequest request
    ) {
        UUID userId = userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow();
        return ResponseEntity.ok(knowledgeService.assignFolder(id, userId, request));
    }
}
