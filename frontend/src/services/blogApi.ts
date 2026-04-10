import axios from 'axios';

const BLOG_API_URL = import.meta.env.VITE_BLOG_API_URL || '/blog-api/api';

export interface Blog {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  imageUrls?: string[];
  authorUsername: string;
}

export interface CreateBlogRequest {
  title: string;
  description: string;
  imageUrls?: string[];
}

export interface Comment {
  id: string;
  blogId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  authorUsername: string;
}

const blogClient = axios.create({
  baseURL: BLOG_API_URL,
});

blogClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const blogService = {
  listBlogs: async (): Promise<Blog[]> => {
    const res = await blogClient.get('/blogs');
    return res.data;
  },

  getBlog: async (id: string): Promise<Blog> => {
    const res = await blogClient.get(`/blogs/${id}`);
    return res.data;
  },

  createBlog: async (data: CreateBlogRequest): Promise<Blog> => {
    const res = await blogClient.post('/blogs', data);
    return res.data;
  },

  listComments: async (blogId: string): Promise<Comment[]> => {
    const res = await blogClient.get(`/blogs/${blogId}/comments`);
    return res.data;
  },

  addComment: async (blogId: string, text: string): Promise<Comment> => {
    const res = await blogClient.post(`/blogs/${blogId}/comments`, { text });
    return res.data;
  },

  updateComment: async (commentId: string, text: string): Promise<Comment> => {
    const res = await blogClient.put(`/comments/${commentId}`, { text });
    return res.data;
  },
};

export default blogClient;
