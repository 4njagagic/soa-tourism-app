package com.soa.stakeholders.service;

import com.soa.stakeholders.dto.AuthResponse;
import com.soa.stakeholders.dto.RegisterRequest;
import com.soa.stakeholders.dto.UpdateProfileRequest;
import com.soa.stakeholders.dto.UserProfileDto;
import com.soa.stakeholders.model.User;
import com.soa.stakeholders.model.UserRole;
import com.soa.stakeholders.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Funkcionalnost 1: Registracija novog korisnika
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Proveravamo da li korisnik već postoji
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Kreiramo novog korisnika
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .role(request.getRole())
                .enabled(true)
                .build();

        user = userRepository.save(user);

        // Generisemo JWT token
        String token = jwtService.generateToken(user);

        UserProfileDto profileDto = mapToProfileDto(user);

        return AuthResponse.builder()
                .token(token)
                .message("User registered successfully")
                .user(profileDto)
                .build();
    }

    /**
     * Login korisnika
     */
    public AuthResponse login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }

        String token = jwtService.generateToken(user);
        UserProfileDto profileDto = mapToProfileDto(user);

        return AuthResponse.builder()
                .token(token)
                .message("Login successful")
                .user(profileDto)
                .build();
    }

    private UserProfileDto mapToProfileDto(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profilePicture(user.getProfilePicture())
                .biography(user.getBiography())
                .motto(user.getMotto())
                .build();
    }
}
