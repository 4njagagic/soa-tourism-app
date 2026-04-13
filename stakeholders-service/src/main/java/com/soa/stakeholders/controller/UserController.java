package com.soa.stakeholders.controller;

import com.soa.stakeholders.dto.UpdateProfileRequest;
import com.soa.stakeholders.dto.UserProfileDto;
import com.soa.stakeholders.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}, allowedHeaders = "*", allowCredentials = "true")
public class UserController {

    private final UserService userService;

    /**
     * Funkcionalnost 2: Pregled profila korisnika po ID-u
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getProfile(@PathVariable Long id) {
        try {
            UserProfileDto profile = userService.getProfile(id);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Pregled profila po username-u
     */
    @GetMapping("/profile/{username}")
    public ResponseEntity<UserProfileDto> getProfileByUsername(@PathVariable String username) {
        try {
            UserProfileDto profile = userService.getProfileByUsername(username);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Ažuriranje sopstvenog profila
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('GUIDE', 'TOURIST', 'ADMIN')")
    public ResponseEntity<UserProfileDto> updateProfile(
            @PathVariable Long id,
            @RequestBody UpdateProfileRequest request) {
        try {
            UserProfileDto profile = userService.updateProfile(id, request);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
       public ResponseEntity<List<UserProfileDto>> getAllNonAdminUsers() {
    return ResponseEntity.ok(userService.getNonAdminUsers());
    }

    @PatchMapping("/{id}/block")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> blockUser(@PathVariable Long id) {
      try {
        userService.blockUser(id);
        return ResponseEntity.ok().build();
      } catch (IllegalArgumentException e) {
        return ResponseEntity.notFound().build();
      }
    }

}
