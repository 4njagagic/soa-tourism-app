import axios from 'axios';

export const BLOG_API_URL = import.meta.env.VITE_BLOG_API_URL || '/blog-api/api';
export const BLOG_PUBLIC_BASE = BLOG_API_URL.replace(/\/api\/?$/, '');

export const resolveBlogAssetUrl = (url: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  if (url.startsWith('/')) return `${BLOG_PUBLIC_BASE}${url}`;
  return `${BLOG_PUBLIC_BASE}/${url}`;
};

export interface Blog {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  imageUrls?: string[];
  authorUsername: string;
  likesCount: number;
  userHasLiked?: boolean;
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

  createBlogWithFiles: async (data: { title: string; description: string; images?: File[] }): Promise<Blog> => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('description', data.description);
    (data.images || []).forEach((f) => form.append('images', f));

    const res = await blogClient.post('/blogs', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  likeBlog: async (blogId: string): Promise<void> => {
    await blogClient.post(`/blogs/${blogId}/like`);
  },

  unlikeBlog: async (blogId: string): Promise<void> => {
    await blogClient.delete(`/blogs/${blogId}/like`);
  },
};

export default blogClient;
