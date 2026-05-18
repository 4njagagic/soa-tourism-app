import axios from "axios";

const BASE = import.meta.env.VITE_FOLLOWER_URL || "/followers";

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use((cfg) => {
  try {
    const u = localStorage.getItem("user");
    if (u) {
      const user = JSON.parse(u);
      cfg.headers["X-Username"] = user.username;
    }
  } catch {}
  return cfg;
});

export const followerApi = {
  follow: async (username: string) => {
    await client.post(`/${username}`);
  },
  unfollow: async (username: string) => {
    await client.delete(`/${username}`);
  },
  getFollowed: async (): Promise<string[]> => {
    const r = await client.get("/followed");
    return r.data;
  },
  getFollowers: async (): Promise<string[]> => {
    const r = await client.get("/followers");
    return r.data;
  },
  isFollowing: async (username: string): Promise<boolean> => {
    const r = await client.get(`/isFollowing/${username}`);
    return r.data;
  },
  recommendations: async (limit = 5): Promise<string[]> => {
    const r = await client.get(`/recommendations?limit=${limit}`);
    return r.data;
  },
};

export default followerApi;
