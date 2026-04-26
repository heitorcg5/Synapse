package com.synapse.modules.inbox.controller;

import com.synapse.modules.inbox.dto.InboxItemResponse;
import com.synapse.modules.inbox.service.InboxService;
import com.synapse.modules.user.web.CurrentUser;
import com.synapse.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Digital Brain capture layer: unified inbox (pending items only).
 */
@RestController
@RequestMapping("/inbox")
@RequiredArgsConstructor
public class InboxController {

    private final InboxService inboxService;

    @GetMapping
    public ResponseEntity<List<InboxItemResponse>> listPending(
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(inboxService.listInboxPending(currentUser.getId()));
    }
}
