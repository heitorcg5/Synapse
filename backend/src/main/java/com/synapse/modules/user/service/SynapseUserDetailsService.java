package com.synapse.modules.user.service;

import com.synapse.modules.user.entity.User;
import com.synapse.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SynapseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                Collections.emptyList()
        );
    }
}
