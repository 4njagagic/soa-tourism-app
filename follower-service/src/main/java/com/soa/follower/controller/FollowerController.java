package com.soa.follower.controller;

import com.soa.follower.service.FollowerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/followers")
public class FollowerController {
    private final FollowerService followerService;

    public FollowerController(FollowerService followerService){ this.followerService = followerService; }

    private String extractUsernameFromHeader(@RequestHeader(value = "X-Username", required = false) String headerUser){
        return headerUser; // simple extraction; frontend will send X-Username
    }

    @PostMapping("/{target}")
    public ResponseEntity<Void> follow(@RequestHeader(value = "X-Username", required = false) String headerUser, @PathVariable String target){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.badRequest().build();
        followerService.follow(user, target);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{target}")
    public ResponseEntity<Void> unfollow(@RequestHeader(value = "X-Username", required = false) String headerUser, @PathVariable String target){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.badRequest().build();
        followerService.unfollow(user, target);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/followed")
    public ResponseEntity<List<String>> followed(@RequestHeader(value = "X-Username", required = false) String headerUser){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(followerService.getFollowed(user));
    }

    @GetMapping("/followers")
    public ResponseEntity<List<String>> followers(@RequestHeader(value = "X-Username", required = false) String headerUser){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(followerService.getFollowers(user));
    }

    @GetMapping("/isFollowing/{other}")
    public ResponseEntity<Boolean> isFollowing(@RequestHeader(value = "X-Username", required = false) String headerUser, @PathVariable String other){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.ok(false);
        return ResponseEntity.ok(followerService.isFollowing(user, other));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<String>> recommendations(@RequestHeader(value = "X-Username", required = false) String headerUser, @RequestParam(value = "limit", defaultValue = "5") int limit){
        String user = extractUsernameFromHeader(headerUser);
        if (user == null || user.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(followerService.recommend(user, limit));
    }
}
