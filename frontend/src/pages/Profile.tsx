import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';

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
    return (
      <div className="rounded-xl border bg-surface p-6 text-sm text-text-secondary">
        Please log in to view your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Update your public details.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium text-error hover:bg-muted"
        >
          Logout
        </button>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes('success')
              ? 'mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success'
              : 'mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error'
          }
        >
          {message}
        </div>
      )}

      <div className="rounded-xl border bg-surface p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="w-full sm:w-56">
            <div className="aspect-square w-full overflow-hidden rounded-xl border bg-muted">
              {profileData.profilePicture ? (
                <img
                  src={profileData.profilePicture}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm text-text-muted">
                  No image
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-text-secondary">
                Profile picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-1 block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted px-3 py-2">
                <div className="text-xs text-text-muted">Username</div>
                <div className="text-sm font-medium">{user.username}</div>
              </div>
              <div className="rounded-lg border bg-muted px-3 py-2">
                <div className="text-xs text-text-muted">Email</div>
                <div className="text-sm font-medium">{user.email}</div>
              </div>
              <div className="rounded-lg border bg-muted px-3 py-2">
                <div className="text-xs text-text-muted">Role</div>
                <div className="text-sm font-medium">{user.role}</div>
              </div>
            </div>

            {!isEditing ? (
              <div className="mt-6">
                <div className="space-y-2 text-sm text-text-secondary">
                  {profileData.firstName && (
                    <div>
                      <span className="text-text-muted">First name:</span> {profileData.firstName}
                    </div>
                  )}
                  {profileData.lastName && (
                    <div>
                      <span className="text-text-muted">Last name:</span> {profileData.lastName}
                    </div>
                  )}
                  {profileData.motto && (
                    <div>
                      <span className="text-text-muted">Motto:</span> {profileData.motto}
                    </div>
                  )}
                  {profileData.biography && (
                    <div className="whitespace-pre-wrap">
                      <span className="text-text-muted">Bio:</span> {profileData.biography}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Edit profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      First name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      Last name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Motto
                  </label>
                  <input
                    type="text"
                    name="motto"
                    value={profileData.motto}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Biography
                  </label>
                  <textarea
                    name="biography"
                    value={profileData.biography}
                    onChange={handleChange}
                    rows={5}
                    className="mt-1 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover disabled:opacity-60"
                  >
                    {loading ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
