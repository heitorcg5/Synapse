package com.synapse.modules.knowledge.service;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeLinkingServiceTest {

    @Test
    void jaccard_disjoint() {
        assertThat(KnowledgeLinkingService.jaccard(Set.of("a", "b"), Set.of("c", "d"))).isEqualTo(0.0);
    }

    @Test
    void jaccard_overlap() {
        double j = KnowledgeLinkingService.jaccard(Set.of("spring", "boot", "api"), Set.of("spring", "http", "rest"));
        assertThat(j).isGreaterThan(0.15).isLessThan(0.6);
    }
}
