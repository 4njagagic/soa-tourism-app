import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: 'GUIDE' | 'TOURIST' | 'ADMIN';
}

interface LoginData {
  username: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  biography?: string;
  motto?: string;
}

interface AuthResponse {
  token: string;
  message: string;
  user: User;
}

const client = axios.create({
  baseURL: API_URL,
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await client.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await client.post('/auth/login', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const userService = {
  getProfile: async (userId: number): Promise<User> => {
    const response = await client.get(`/users/${userId}`);
    return response.data;
  },

  getProfileByUsername: async (username: string): Promise<User> => {
    const response = await client.get(`/users/profile/${username}`);
    return response.data;
  },

  updateProfile: async (userId: number, data: Partial<User>): Promise<User> => {
    const response = await client.put(`/users/${userId}`, data);
    return response.data;
  },
};

export default client;
