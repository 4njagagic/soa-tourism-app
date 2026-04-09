package com.soa.stakeholders.service;

import com.soa.stakeholders.dto.UpdateProfileRequest;
import com.soa.stakeholders.dto.UserProfileDto;
import com.soa.stakeholders.model.User;
import com.soa.stakeholders.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Funkcionalnost 2: Pregled profila korisnika
     */
    public UserProfileDto getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return mapToProfileDto(user);
    }

    /**
     * Pregled profila po username-u
     */
    public UserProfileDto getProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return mapToProfileDto(user);
    }

    /**
     * Ažuriranje profila korisnika
     */
    @Transactional
    public UserProfileDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getProfilePicture() != null) {
            user.setProfilePicture(request.getProfilePicture());
        }
        if (request.getBiography() != null) {
            user.setBiography(request.getBiography());
        }
        if (request.getMotto() != null) {
            user.setMotto(request.getMotto());
        }

        user = userRepository.save(user);

        return mapToProfileDto(user);
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
