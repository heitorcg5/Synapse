package com.synapse.modules.knowledge.service;

import com.synapse.modules.knowledge.entity.KnowledgeItem;
import com.synapse.modules.knowledge.entity.KnowledgeRelation;
import com.synapse.modules.knowledge.entity.KnowledgeRelationType;
import com.synapse.modules.knowledge.repository.KnowledgeItemRepository;
import com.synapse.modules.knowledge.repository.KnowledgeRelationRepository;
import com.synapse.modules.notification.service.NotificationService;
import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.util.UserKnowledgePreferences;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeLinkingService {

    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+");
    private static final double MIN_JACCARD = 0.12;
    private static final int MAX_NEW_RELATIONS = 12;

    private final KnowledgeItemRepository knowledgeItemRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;
    private final NotificationService notificationService;

    @Transactional
    public void autoLinkIfEnabled(User user, KnowledgeItem newItem) {
        if (user == null || newItem == null) {
            return;
        }
        if (!UserKnowledgePreferences.isAutoLinkEnabled(user)) {
            return;
        }
        UUID userId = user.getId();
        Set<String> newTokens = tokenize(textCorpus(newItem));
        if (newTokens.size() < 3) {
            return;
        }
        List<KnowledgeItem> others = knowledgeItemRepository.findByUserIdOrderByInboxUploadedAtDesc(userId).stream()
                .filter(k -> !k.getId().equals(newItem.getId()))
                .toList();
        int added = 0;
        for (KnowledgeItem other : others) {
            if (added >= MAX_NEW_RELATIONS) {
                break;
            }
            Set<String> ot = tokenize(textCorpus(other));
            if (ot.size() < 3) {
                continue;
            }
            double j = jaccard(newTokens, ot);
            if (j < MIN_JACCARD) {
                continue;
            }
            if (knowledgeRelationRepository
                    .findBySourceItemIdAndTargetItemIdAndRelationType(
                            newItem.getId(), other.getId(), KnowledgeRelationType.RELATED)
                    .isPresent()) {
                continue;
            }
            KnowledgeRelation row = KnowledgeRelation.builder()
                    .userId(userId)
                    .sourceItemId(newItem.getId())
                    .targetItemId(other.getId())
                    .relationType(KnowledgeRelationType.RELATED)
                    .confidenceScore(roundConfidence(j))
                    .build();
            knowledgeRelationRepository.save(row);
            added++;
        }
        if (added > 0) {
            log.debug("Auto-linked knowledge item {} with {} RELATED relations", newItem.getId(), added);
            notificationService.notifyNewConnectionsIfEnabled(user, newItem.getId(), added);
        }
    }

    private static double roundConfidence(double j) {
        return Math.round(j * 1000.0) / 1000.0;
    }

    private static String textCorpus(KnowledgeItem k) {
        String t = Optional.ofNullable(k.getTitle()).orElse("");
        String s = Optional.ofNullable(k.getSummary()).orElse("");
        String b = Optional.ofNullable(k.getBody()).orElse("");
        String chunk = (t + "\n" + s + "\n" + b).toLowerCase(Locale.ROOT);
        if (chunk.length() > 8000) {
            return chunk.substring(0, 8000);
        }
        return chunk;
    }

    static Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(TOKEN_SPLIT.split(text))
                .map(String::trim)
                .filter(w -> w.length() > 1)
                .collect(Collectors.toCollection(HashSet::new));
    }

    static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }
        Set<String> inter = new HashSet<>(a);
        inter.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0.0 : (double) inter.size() / (double) union.size();
    }
}
