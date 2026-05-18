package com.soa.follower.domain;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;

import java.util.HashSet;
import java.util.Set;
import java.util.Objects;

@Node("User")
public class UserNode {
    @Id
    private String username;

    @Relationship(type = "FOLLOWS")
    private Set<UserNode> follows = new HashSet<>();

    public UserNode() {}

    public UserNode(String username) { this.username = username; }

    public String getUsername(){ return username; }
    public void setUsername(String username){ this.username = username; }

    public Set<UserNode> getFollows(){ return follows; }
    public void setFollows(Set<UserNode> follows){ this.follows = follows; }

    public void follow(UserNode other){ follows.add(other); }
    public void unfollow(UserNode other){ follows.remove(other); }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserNode userNode = (UserNode) o;
        return Objects.equals(username, userNode.username);
    }

    @Override
    public int hashCode() {
        return Objects.hash(username);
    }
}
