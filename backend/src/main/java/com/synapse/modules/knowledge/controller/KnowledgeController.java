package com.synapse.modules.knowledge.controller;

import com.synapse.modules.knowledge.dto.AssignKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.CreateKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.KnowledgeFacetsResponse;
import com.synapse.modules.knowledge.dto.KnowledgeGraphResponse;
import com.synapse.modules.knowledge.dto.KnowledgeFolderResponse;
import com.synapse.modules.knowledge.dto.KnowledgeItemResponse;
import com.synapse.modules.knowledge.service.KnowledgeService;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @GetMapping
    public ResponseEntity<List<KnowledgeItemResponse>> list(
            @CurrentUser User currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String sort,
            @RequestHeader(value = "X-Synapse-Timezone", required = false) String timezone
    ) {
        return ResponseEntity.ok(
                knowledgeService.listByUser(currentUser.getId(), from, to, type, tag, sort, timezone)
        );
    }

    @GetMapping("/facets")
    public ResponseEntity<KnowledgeFacetsResponse> facets(@CurrentUser User currentUser) {
        return ResponseEntity.ok(knowledgeService.facetsForUser(currentUser.getId()));
    }

    @GetMapping("/graph")
    public ResponseEntity<KnowledgeGraphResponse> graph(@CurrentUser User currentUser) {
        return ResponseEntity.ok(knowledgeService.graphForUser(currentUser.getId()));
    }

    @GetMapping("/folders")
    public ResponseEntity<List<KnowledgeFolderResponse>> listFolders(@CurrentUser User currentUser) {
        return ResponseEntity.ok(knowledgeService.listFolders(currentUser.getId()));
    }

    @PostMapping("/folders")
    public ResponseEntity<KnowledgeFolderResponse> createFolder(
            @CurrentUser User currentUser,
            @Valid @RequestBody CreateKnowledgeFolderRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(knowledgeService.createFolder(currentUser.getId(), request));
    }

    @GetMapping(KNOWLEDGE_ID_SEGMENT)
    public ResponseEntity<KnowledgeItemResponse> getById(
            @PathVariable UUID id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(knowledgeService.getById(id, currentUser.getId()));
    }

    @PatchMapping(KNOWLEDGE_ID_SEGMENT + "/folder")
    public ResponseEntity<KnowledgeItemResponse> assignFolder(
            @PathVariable UUID id,
            @CurrentUser User currentUser,
            @Valid @RequestBody AssignKnowledgeFolderRequest request
    ) {
        return ResponseEntity.ok(knowledgeService.assignFolder(id, currentUser.getId(), request));
    }
}
