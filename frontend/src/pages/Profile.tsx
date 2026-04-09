import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import '../styles/profile.css';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  biography?: string;
  profilePicture?: string;
  motto?: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    biography: user?.biography || '',
    profilePicture: user?.profilePicture || '',
    motto: user?.motto || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await userService.getProfile(user.id);
      setProfileData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        biography: profile.biography || '',
        profilePicture: profile.profilePicture || '',
        motto: profile.motto || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({
          ...prev,
          profilePicture: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      await userService.updateProfile(user.id, profileData);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="profile-container"><p>Please log in to view your profile.</p></div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>My Profile</h1>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>

        <div className="profile-info">
          <div className="profile-picture">
            {profileData.profilePicture ? (
              <img src={profileData.profilePicture} alt="Profile" />
            ) : (
              <div className="profile-placeholder">No Image</div>
            )}
          </div>

          <div className="profile-details">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            {profileData.firstName && <p><strong>First Name:</strong> {profileData.firstName}</p>}
            {profileData.lastName && <p><strong>Last Name:</strong> {profileData.lastName}</p>}
            {profileData.biography && <p><strong>Biography:</strong> {profileData.biography}</p>}
            {profileData.motto && <p><strong>Motto:</strong> {profileData.motto}</p>}
          </div>
        </div>

        {!isEditing && (
          <button className="btn-edit" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}

        {isEditing && (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
              />
            </div>

            <div className="form-group">
              <label>Biography</label>
              <textarea
                name="biography"
                value={profileData.biography}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Motto / Citat</label>
              <input
                type="text"
                name="motto"
                value={profileData.motto}
                onChange={handleChange}
                placeholder="Your favorite quote or motto"
              />
            </div>

            <div className="form-group">
              <label>Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-save">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
};

export default Profile;
