package com.synapse.modules.knowledge.service;

import com.synapse.exceptions.ResourceNotFoundException;
import com.synapse.modules.inbox.entity.InboxItem;
import com.synapse.modules.inbox.entity.InboxFolder;
import com.synapse.modules.inbox.entity.InboxItemTag;
import com.synapse.modules.inbox.repository.InboxFolderRepository;
import com.synapse.modules.inbox.repository.InboxItemRepository;
import com.synapse.modules.inbox.repository.InboxItemTagRepository;
import com.synapse.modules.inbox.repository.TagRepository;
import com.synapse.modules.knowledge.dto.AssignKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.CreateKnowledgeFolderRequest;
import com.synapse.modules.knowledge.dto.KnowledgeGraphEdgeResponse;
import com.synapse.modules.knowledge.dto.KnowledgeGraphNodeResponse;
import com.synapse.modules.knowledge.dto.KnowledgeGraphResponse;
import com.synapse.modules.knowledge.dto.KnowledgeFacetsResponse;
import com.synapse.modules.knowledge.dto.KnowledgeFolderResponse;
import com.synapse.modules.knowledge.dto.KnowledgeItemResponse;
import com.synapse.modules.knowledge.dto.KnowledgeLinkedNoteResponse;
import com.synapse.modules.knowledge.entity.KnowledgeFolder;
import com.synapse.modules.knowledge.entity.KnowledgeItem;
import com.synapse.modules.knowledge.entity.KnowledgeRelation;
import com.synapse.modules.knowledge.repository.KnowledgeFolderRepository;
import com.synapse.modules.knowledge.repository.KnowledgeItemRepository;
import com.synapse.modules.knowledge.repository.KnowledgeRelationRepository;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeService {

    /** Offer every capture type in filters even when no row has it yet (or legacy rows lack source_content_type). */
    private static final List<String> DEFAULT_KNOWLEDGE_TYPES = List.of(
            "VIDEO", "WEB", "AUDIO", "DOCUMENT", "TEXT"
    );

    private final KnowledgeItemRepository knowledgeItemRepository;
    private final KnowledgeFolderRepository knowledgeFolderRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;
    private final KnowledgeLinkingService knowledgeLinkingService;
    private final UserRepository userRepository;
    private final InboxItemRepository inboxItemRepository;
    private final InboxFolderRepository contentFolderRepository;
    private final InboxItemTagRepository contentTagRepository;
    private final TagRepository tagRepository;
    private final com.synapse.modules.knowledge.repository.KnowledgeEmbeddingRepository knowledgeEmbeddingRepository;
    private final com.synapse.modules.ai.service.AiService aiService;

    @Transactional(readOnly = true)
    public List<KnowledgeItemResponse> searchSemantic(UUID userId, String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        try {
            List<Float> queryVector = aiService.generateEmbedding(query);
            if (queryVector == null || queryVector.isEmpty()) return List.of();
            // Convert List<Float> to Postgres vector string format: "[1.0, 2.0, ...]"
            String vectorString = queryVector.toString();
            List<com.synapse.modules.knowledge.entity.KnowledgeEmbedding> nearest = knowledgeEmbeddingRepository.findNearestNeighbors(userId, vectorString, limit);
            if (nearest.isEmpty()) return List.of();
            
            List<UUID> itemIds = nearest.stream().map(e -> e.getKnowledgeItemId()).filter(id -> id != null).distinct().collect(Collectors.toList());
            if (itemIds.isEmpty()) {
                // Try inbox item ids if knowledge item ids are null
                List<UUID> inboxIds = nearest.stream().map(e -> e.getInboxItemId()).filter(id -> id != null).distinct().collect(Collectors.toList());
                List<KnowledgeItem> items = knowledgeItemRepository.findByInboxItemIdIn(inboxIds);
                Map<UUID, Integer> inboxRank = new java.util.HashMap<>();
                for (int i = 0; i < inboxIds.size(); i++) {
                    inboxRank.put(inboxIds.get(i), i);
                }
                items.sort((a, b) -> Integer.compare(
                        inboxRank.getOrDefault(a.getInboxItemId(), Integer.MAX_VALUE),
                        inboxRank.getOrDefault(b.getInboxItemId(), Integer.MAX_VALUE)
                ));
                return mapToResponses(items, userId);
            }
            List<KnowledgeItem> items = knowledgeItemRepository.findAllById(itemIds);
            Map<UUID, Integer> rank = new java.util.HashMap<>();
            for (int i = 0; i < itemIds.size(); i++) {
                rank.put(itemIds.get(i), i);
            }
            items.sort((a, b) -> Integer.compare(
                    rank.getOrDefault(a.getId(), Integer.MAX_VALUE),
                    rank.getOrDefault(b.getId(), Integer.MAX_VALUE)
            ));
            return mapToResponses(items, userId);
        } catch (Exception e) {
            log.error("Semantic search failed for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    @Transactional(readOnly = true)
    public List<KnowledgeItemResponse> listByUser(
            UUID userId,
            LocalDate createdFrom,
            LocalDate createdTo,
            String typeFilter,
            String tagFilter,
            String sortParam,
            String timezoneParam
    ) {
        ZoneId zone = resolveZone(timezoneParam);
        Instant fromInst = createdFrom != null ? createdFrom.atStartOfDay(zone).toInstant() : null;
        Instant toExclusive = createdTo != null ? createdTo.plusDays(1).atStartOfDay(zone).toInstant() : null;
        String type = normalizeFilter(typeFilter);
        String tag = normalizeFilter(tagFilter);
        boolean newestFirst = !"asc".equalsIgnoreCase(normalizeFilter(sortParam));

        if (fromInst == null && toExclusive == null && type == null && tag == null) {
            List<KnowledgeItem> rows = newestFirst
                    ? knowledgeItemRepository.findByUserIdOrderByInboxCapturedAtDesc(userId)
                    : knowledgeItemRepository.findByUserIdOrderByInboxCapturedAtAsc(userId);
            return mapToResponses(rows, userId);
        }
        List<KnowledgeItem> rows = new ArrayList<>(
                knowledgeItemRepository.search(userId, fromInst, toExclusive, type, tag)
        );
        if (!newestFirst) {
            Collections.reverse(rows);
        }
        return mapToResponses(rows, userId);
    }

    @Transactional(readOnly = true)
    public List<KnowledgeFolderResponse> listFolders(UUID userId) {
        return knowledgeFolderRepository.findByUserIdOrderByNameAsc(userId).stream()
                .map(f -> KnowledgeFolderResponse.builder()
                        .id(f.getId())
                        .parentId(f.getParentId())
                        .name(f.getName())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public KnowledgeFolderResponse createFolder(UUID userId, CreateKnowledgeFolderRequest req) {
        UUID parentId = req.getParentId();
        if (parentId != null) {
            knowledgeFolderRepository.findByIdAndUserId(parentId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent folder not found"));
        }
        String name = req.getName() != null ? req.getName().trim() : "";
        if (name.isBlank()) {
            throw new IllegalArgumentException("Folder name is required");
        }
        KnowledgeFolder saved = knowledgeFolderRepository.save(KnowledgeFolder.builder()
                .userId(userId)
                .parentId(parentId)
                .name(name)
                .build());
        return KnowledgeFolderResponse.builder()
                .id(saved.getId())
                .parentId(saved.getParentId())
                .name(saved.getName())
                .build();
    }

    @Transactional
    public KnowledgeItemResponse assignFolder(UUID knowledgeItemId, UUID userId, AssignKnowledgeFolderRequest req) {
        KnowledgeItem item = knowledgeItemRepository.findByIdAndUserId(knowledgeItemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("KNOWLEDGE_NOT_FOUND", "Knowledge item not found"));
        UUID folderId = req.getFolderId();
        if (folderId != null) {
            boolean existsInKnowledgeFolders = knowledgeFolderRepository.findByIdAndUserId(folderId, userId).isPresent();
            boolean existsInContentFolders = contentFolderRepository.findByIdAndUserId(folderId, userId).isPresent();
            if (!existsInKnowledgeFolders && !existsInContentFolders) {
                throw new IllegalArgumentException("Folder not found");
            }
            item.setFolderId(folderId);
        } else {
            item.setFolderId(null);
        }
        knowledgeItemRepository.save(item);
        return toResponse(item, userId, loadInboxFields(Set.of(item.getInboxItemId())), true);
    }

    private List<KnowledgeItemResponse> mapToResponses(List<KnowledgeItem> rows, UUID userId) {
        Set<UUID> inboxIds = rows.stream().map(KnowledgeItem::getInboxItemId).collect(Collectors.toSet());
        Map<UUID, InboxFields> inboxFields = loadInboxFields(inboxIds);
        return rows.stream()
                .map(k -> toResponse(k, userId, inboxFields, false))
                .collect(Collectors.toList());
    }

    private record InboxFields(String type, Instant capturedAt) {}

    private Map<UUID, InboxFields> loadInboxFields(Set<UUID> inboxItemIds) {
        if (inboxItemIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return inboxItemRepository.findAllById(inboxItemIds).stream()
                .collect(Collectors.toMap(InboxItem::getId, c -> new InboxFields(c.getType(), c.getCapturedAt())));
    }

    private static ZoneId resolveZone(String timezoneParam) {
        if (timezoneParam == null || timezoneParam.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timezoneParam.trim());
        } catch (Exception ignored) {
            return ZoneOffset.UTC;
        }
    }

    private static String normalizeFilter(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphResponse graphForUser(UUID userId) {
        List<KnowledgeItem> items = knowledgeItemRepository.findByUserIdOrderByInboxCapturedAtDesc(userId);
        List<KnowledgeGraphNodeResponse> nodes = items.stream()
                .map(k -> KnowledgeGraphNodeResponse.builder()
                        .id(k.getId())
                        .title(k.getTitle() != null ? k.getTitle() : "")
                        .build())
                .collect(Collectors.toList());
        List<KnowledgeGraphEdgeResponse> edges = knowledgeRelationRepository.findByUserId(userId).stream()
                .map(r -> KnowledgeGraphEdgeResponse.builder()
                        .sourceItemId(r.getSourceItemId())
                        .targetItemId(r.getTargetItemId())
                        .relationType(r.getRelationType().name())
                        .confidence(r.getConfidenceScore())
                        .build())
                .collect(Collectors.toList());
        return KnowledgeGraphResponse.builder().nodes(nodes).edges(edges).build();
    }

    @Transactional(readOnly = true)
    public KnowledgeFacetsResponse facetsForUser(UUID userId) {
        Set<String> types = new LinkedHashSet<>(DEFAULT_KNOWLEDGE_TYPES);
        for (String row : knowledgeItemRepository.findDistinctSourceTypesByUserId(userId)) {
            if (row != null && !row.isBlank()) {
                types.add(row.trim());
            }
        }
        return KnowledgeFacetsResponse.builder()
                .tags(knowledgeItemRepository.findDistinctTagNamesByUserId(userId))
                .types(List.copyOf(types))
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeItemResponse getById(UUID id, UUID userId) {
        KnowledgeItem k = knowledgeItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("KNOWLEDGE_NOT_FOUND", "Knowledge item not found"));
        return toResponse(k, userId, loadInboxFields(Set.of(k.getInboxItemId())), true);
    }

    /**
     * Upsert knowledge when user confirms inbox processing (AI suggests, user validates).
     */
    @Transactional
    public void upsertFromInboxConfirmation(
            UUID userId,
            UUID inboxItemId,
            String title,
            String summary,
            String body,
            String language,
            String sourceContentType
    ) {
        String lang = language != null && !language.isBlank() ? language : "en";
        String bodyFinal = body != null && !body.isBlank() ? body : summary;
        String ctype = sourceContentType != null && !sourceContentType.isBlank() ? sourceContentType.trim() : null;
        UUID contentFolderId = inboxItemRepository.findById(inboxItemId)
                .map(InboxItem::getFolderId)
                .orElse(null);

        KnowledgeItem item = knowledgeItemRepository.findByInboxItemId(inboxItemId).map(existing -> {
            existing.setTitle(title);
            existing.setSummary(summary);
            existing.setBody(bodyFinal);
            existing.setLanguage(lang);
            if (ctype != null) {
                existing.setSourceContentType(ctype);
            }

            if (existing.getFolderId() == null && contentFolderId != null) {
                existing.setFolderId(contentFolderId);
            }
            return knowledgeItemRepository.save(existing);
        }).orElseGet(() -> knowledgeItemRepository.save(KnowledgeItem.builder()
                .userId(userId)
                .inboxItemId(inboxItemId)
                .title(title)
                .summary(summary)
                .body(bodyFinal)
                .language(lang)
                .sourceContentType(ctype)
                .folderId(contentFolderId)

                .build()));

        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            knowledgeLinkingService.autoLinkIfEnabled(user, item);
        }
    }

    private KnowledgeItemResponse toResponse(
            KnowledgeItem k,
            UUID userId,
            Map<UUID, InboxFields> inboxById,
            boolean includeRelations
    ) {
        if (!k.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("KNOWLEDGE_NOT_FOUND", "Knowledge item not found");
        }
        InboxFields inbox = inboxById.get(k.getInboxItemId());
        String storedType = k.getSourceContentType();
        String sourceType = (storedType != null && !storedType.isBlank())
                ? storedType
                : (inbox != null ? inbox.type() : null);
        Instant inboxCapturedAt = inbox != null ? inbox.capturedAt() : null;
        List<String> tagNames = loadTagNames(k.getInboxItemId());
        String folderName = null;
        if (k.getFolderId() != null) {
            folderName = knowledgeFolderRepository.findByIdAndUserId(k.getFolderId(), userId)
                    .map(KnowledgeFolder::getName)
                    .orElse(null);
            if (folderName == null) {
                folderName = contentFolderRepository.findByIdAndUserId(k.getFolderId(), userId)
                        .map(InboxFolder::getName)
                        .orElse(null);
            }
        }
        var builder = KnowledgeItemResponse.builder()
                .id(k.getId())
                .inboxItemId(k.getInboxItemId())
                .title(k.getTitle())
                .body(k.getBody())
                .summary(k.getSummary())
                .language(k.getLanguage())
                .sourceContentType(sourceType)
                .tags(tagNames)

                .folderId(k.getFolderId())
                .folderName(folderName)
                .createdAt(k.getCreatedAt())
                .inboxCapturedAt(inboxCapturedAt);
        if (includeRelations) {
            builder.relatedNotes(loadRelatedNotes(userId, k.getId(), true))
                    .backlinks(loadRelatedNotes(userId, k.getId(), false));
        } else {
            builder.relatedNotes(Collections.emptyList()).backlinks(Collections.emptyList());
        }
        return builder.build();
    }

    private List<KnowledgeLinkedNoteResponse> loadRelatedNotes(UUID userId, UUID knowledgeItemId, boolean outgoing) {
        List<KnowledgeRelation> rels = outgoing
                ? knowledgeRelationRepository.findByUserIdAndSourceItemIdOrderByConfidenceScoreDesc(userId, knowledgeItemId)
                : knowledgeRelationRepository.findByUserIdAndTargetItemIdOrderByConfidenceScoreDesc(userId, knowledgeItemId);
        List<KnowledgeLinkedNoteResponse> out = new ArrayList<>();
        for (KnowledgeRelation r : rels) {
            UUID peerId = outgoing ? r.getTargetItemId() : r.getSourceItemId();
            String title = knowledgeItemRepository.findByIdAndUserId(peerId, userId)
                    .map(KnowledgeItem::getTitle)
                    .orElse("");
            out.add(KnowledgeLinkedNoteResponse.builder()
                    .knowledgeItemId(peerId)
                    .title(title)
                    .relationType(r.getRelationType().name())
                    .confidence(r.getConfidenceScore())
                    .build());
        }
        return out;
    }

    private List<String> loadTagNames(UUID inboxItemId) {
        List<InboxItemTag> contentTags = contentTagRepository.findByInboxItemId(inboxItemId);
        return contentTags.stream()
                .map(ct -> tagRepository.findById(ct.getTagId()).orElse(null))
                .filter(t -> t != null)
                .map(t -> t.getName())
                .collect(Collectors.toList());
    }


}
