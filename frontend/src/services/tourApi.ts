import axios from "axios";

export const TOUR_API_URL = import.meta.env.VITE_TOUR_API_URL || "/tour-api/api";
export const TOUR_PUBLIC_BASE = TOUR_API_URL.replace(/\/api\/?$/, "");

export const resolveTourAssetUrl = (url: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  if (url.startsWith("/")) return `${TOUR_PUBLIC_BASE}${url}`;
  return `${TOUR_PUBLIC_BASE}/${url}`;
};

export const getTourApiErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError<{ error?: string }>(err)) {
    return err.response?.data?.error || fallback;
  }

  return fallback;
};
export interface UserPosition {
  username: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface KeyPoint {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order: number;
  distanceFromPreviousKm: number;
  imageUrl: string;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  touristUsername: string;
  visitDate: string;
  commentDate: string;
  images: string[];
}

export interface TransportTime {
  type: "Walking" | "Bicycle" | "Car";
  durationMinutes: number;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  tags: string[];
  status: "Draft" | "Published" | "Archived";
  price: number;
  authorUsername: string;
  keyPoints: KeyPoint[];
  totalDistanceKm: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  archivedAt: string;
  reviews: Review[];
  transportTimes: TransportTime[]
}

export interface CreateTourRequest {
  name: string;
  description: string;
  difficulty: string;
  tags: string[];
}

const tourClient = axios.create({
  baseURL: TOUR_API_URL,
});

tourClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const tourService = {
  createTour: async (data: CreateTourRequest): Promise<Tour> => {
    const res = await tourClient.post("/tours", data);
    return res.data;
  },

  listTours: async (): Promise<Tour[]> => {
    const res = await tourClient.get("/tours");
    return res.data;
  },

  listMyTours: async (): Promise<Tour[]> => {
    const res = await tourClient.get("/tours/mine");
    return res.data;
  },

  getTour: async (id: string): Promise<Tour> => {
    const res = await tourClient.get(`/tours/${id}`);
    return res.data;
  },

  addKeyPoint: async (
    tourId: string,
    data: {
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      image: File;
    },
  ): Promise<Tour> => {
    const form = new FormData();
    form.append("name", data.name);
    form.append("description", data.description);
    form.append("latitude", String(data.latitude));
    form.append("longitude", String(data.longitude));
    form.append("image", data.image);

    const res = await tourClient.post(`/tours/${tourId}/key-points`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  addReview: async (
    tourId: string,
    data: {
      rating: number;
      comment: string;
      visitDate: string;
      images?: File[];
    }
  ): Promise<Tour> => {
    const form = new FormData();
    form.append("rating", String(data.rating));
    form.append("comment", data.comment);
    form.append("visitDate", data.visitDate);
    if (data.images) {
      data.images.forEach((img) => form.append("images", img));
    }

    const res = await tourClient.post(`/tours/${tourId}/reviews`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateKeyPoint: async (
    tourId: string,
    pointId: string,
    data: {
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      image?: File;
    }
  ): Promise<Tour> => {
    const form = new FormData();
    form.append("name", data.name);
    form.append("description", data.description);
    form.append("latitude", String(data.latitude));
    form.append("longitude", String(data.longitude));
    if (data.image) form.append("image", data.image);

    const res = await tourClient.put(`/tours/${tourId}/key-points/${pointId}`, form);
    return res.data;
  },

  deleteKeyPoint: async (tourId: string, pointId: string): Promise<Tour> => {
    const res = await tourClient.delete(`/tours/${tourId}/key-points/${pointId}`);
    return res.data;
  },
  getMyPosition: async (): Promise<UserPosition> => {
    const res = await tourClient.get("/user-positions/my");
    return res.data;
  },

  updateMyPosition: async (lat: number, lng: number): Promise<UserPosition> => {
    const res = await tourClient.post("/user-positions/my", {
      latitude: lat,
      longitude: lng,
    });
    return res.data;
  },
    addTransportTime: async (
    tourId: string,
    data: { 
      type: 'Walking' | 'Bicycle' | 'Car'; 
      durationMinutes: number 
    }
  ): Promise<Tour> => {
    const res = await tourClient.post(`/tours/${tourId}/transport-times`, data);
    return res.data;
  },

  publishTour: async (tourId: string): Promise<Tour> => {
    const res = await tourClient.post(`/tours/${tourId}/publish`);
    return res.data;
  },

  archiveTour: async (tourId: string): Promise<Tour> => {
    const res = await tourClient.post(`/tours/${tourId}/archive`);
    return res.data;
  },

  reactivateTour: async (tourId: string): Promise<Tour> => {
    const res = await tourClient.post(`/tours/${tourId}/reactivate`);
    return res.data;
  }
};

export default tourClient;
