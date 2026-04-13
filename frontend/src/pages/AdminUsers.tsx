import React, { useEffect, useState } from "react";
import { userService } from "../services/api";
import "../styles/admin.css";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  enabled: boolean;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (user: User) => {
    if (!window.confirm(`Are you sure you want to block user ${user.username}?`)) {
      return;
    }

    try {
      await userService.blockUser(user.id);
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, enabled: false } : u));
      
      setSuccessMessage(`User ${user.username} has been blocked successfully.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert("Failed to block user.");
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === "ALL") return true;
    return u.role === filter;
  });

  if (loading) return <div className="loading-state">Loading users...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>User Management</h1>
        <div className="filter-group">
          <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>ALL</button>
          <button className={filter === "GUIDE" ? "active" : ""} onClick={() => setFilter("GUIDE")}>GUIDES</button>
          <button className={filter === "TOURIST" ? "active" : ""} onClick={() => setFilter("TOURIST")}>TOURISTS</button>
        </div>
      </div>

      {successMessage && <div className="success-banner">{successMessage}</div>}

      <div className="user-grid">
        {filteredUsers.map(u => (
          <div key={u.id} className="user-card">
            <div className="card-image">
              {u.profilePicture ? (
                <img src={u.profilePicture} alt="Profile" />
              ) : (
                <div className="placeholder">{u.username[0].toUpperCase()}</div>
              )}
            </div>
            <div className="card-content">
              <h3>@{u.username}</h3>
              <p className="role-text">{u.role}</p>
              <p className="email-text">{u.email}</p>
            </div>
            <div className="card-actions">
              {u.enabled ? (
                <button className="btn-block-active" onClick={() => handleBlock(u)}>BLOCK</button>
              ) : (
                <button className="btn-block-disabled" disabled>BLOCKED</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;