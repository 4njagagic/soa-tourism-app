package com.soa.follower.service;

import com.soa.follower.domain.UserNode;
import com.soa.follower.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class FollowerService {
    private final UserRepository userRepository;

    public FollowerService(UserRepository userRepository){ this.userRepository = userRepository; }

    @Transactional
    public void follow(String username, String toFollow){
        UserNode u = userRepository.findById(username).orElseGet(() -> userRepository.save(new UserNode(username)));
        UserNode t = userRepository.findById(toFollow).orElseGet(() -> userRepository.save(new UserNode(toFollow)));
        u.follow(t);
        userRepository.save(u);
    }

    @Transactional
    public void unfollow(String username, String toUnfollow){
        // Use direct Cypher deletion to avoid issues with entity equality/proxying
        userRepository.deleteFollowRelationship(username, toUnfollow);
    }

    public List<String> getFollowed(String username){
        return userRepository.findFollowedUsernames(username);
    }

    public List<String> getFollowers(String username){
        return userRepository.findFollowersUsernames(username);
    }

    public boolean isFollowing(String username, String other){
        List<String> followed = getFollowed(username);
        return followed.contains(other);
    }

    public List<String> recommend(String username, int limit){
        return userRepository.recommendByFriendsOfFriends(username, limit);
    }
}
