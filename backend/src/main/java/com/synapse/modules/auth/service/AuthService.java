package com.synapse.modules.auth.service;

import com.synapse.modules.auth.dto.AuthResponse;
import com.synapse.modules.auth.dto.LoginRequest;
import com.synapse.modules.user.dto.RegisterRequest;
import com.synapse.modules.user.dto.UserResponse;
import com.synapse.modules.user.service.UserService;
import com.synapse.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserService userService;

    @Value("${synapse.jwt.expiration-ms:86400000}")
    private long expirationMs;

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String token = jwtService.generateToken(userDetails);
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .build();
    }

    public AuthResponse register(RegisterRequest request) {
        UserResponse user = userService.register(request);
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateToken(userDetails);
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .build();
    }
}
