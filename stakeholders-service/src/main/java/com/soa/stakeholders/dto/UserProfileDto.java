package com.soa.stakeholders.dto;

import com.soa.stakeholders.model.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {

    private Long id;
    private String username;
    private String email;
    private UserRole role;
    private String firstName;
    private String lastName;
    private String profilePicture;
    private String biography;
    private String motto;
    private Boolean enabled;
}
