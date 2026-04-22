package com.synapse.modules.processing;

import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.util.UserProcessingPreferences;

/**
 * Per-user toggles for the capture processing pipeline.
 */
public record ProcessingPipelineOptions(
        boolean summarize,
        boolean classify,
        boolean generateTags,
        boolean detectDuplicates,
        boolean suggestConnections
) {
    public static ProcessingPipelineOptions defaults() {
        return new ProcessingPipelineOptions(true, true, true, false, false);
    }

    public static ProcessingPipelineOptions fromUser(User user) {
        if (user == null) {
            return defaults();
        }
        return new ProcessingPipelineOptions(
                UserProcessingPreferences.isPipelineSummarizeOn(user),
                UserProcessingPreferences.isPipelineClassifyOn(user),
                UserProcessingPreferences.isPipelineGenerateTagsOn(user),
                UserProcessingPreferences.isPipelineDetectDuplicatesOn(user),
                UserProcessingPreferences.isPipelineSuggestConnectionsOn(user)
        );
    }
}
