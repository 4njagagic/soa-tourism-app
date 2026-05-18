package com.soa.follower.repository;

import com.soa.follower.domain.UserNode;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends Neo4jRepository<UserNode, String> {
    @Query("MATCH (u:User {username:$username})-[:FOLLOWS]->(f:User) RETURN f.username")
    List<String> findFollowedUsernames(String username);

    @Query("MATCH (u:User {username:$username})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(rec:User) WHERE rec.username <> $username AND NOT (u)-[:FOLLOWS]->(rec) RETURN DISTINCT rec.username LIMIT $limit")
    List<String> recommendByFriendsOfFriends(String username, int limit);

    @Query("MATCH (f:User)-[:FOLLOWS]->(u:User {username:$username}) RETURN f.username")
    List<String> findFollowersUsernames(String username);

    @Query("MATCH (u:User {username:$username})-[r:FOLLOWS]->(f:User {username:$toUnfollow}) DELETE r")
    void deleteFollowRelationship(String username, String toUnfollow);
}
