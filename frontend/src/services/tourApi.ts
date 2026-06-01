import axios from "axios";

const runtimeDefault = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : "/tour-api/api";

export const TOUR_API_URL = import.meta.env.VITE_TOUR_API_URL || runtimeDefault;
export const TOUR_PUBLIC_BASE = TOUR_API_URL.replace(/\/api\/?$/, "");

export const resolveTourAssetUrl = (url: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  if (url.startsWith("/")) return `${TOUR_PUBLIC_BASE}${url}`;
  return `${TOUR_PUBLIC_BASE}/${url}`;
};

export const getTourApiErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError<{ error?: string; message?: string }>(err)) {
    return err.response?.data?.error || err.response?.data?.message || fallback;
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

export type TourExecutionStatus = "Active" | "Completed" | "Abandoned";

export interface TourExecutionKeyPointProgress {
  keyPointId: string;
  keyPointName: string;
  order: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  completedAt: string;
}

export interface TourExecution {
  id: string;
  tourId: string;
  tourName: string;
  touristUsername: string;
  status: TourExecutionStatus;
  startedLatitude: number;
  startedLongitude: number;
  finishedLatitude: number | null;
  finishedLongitude: number | null;
  totalKeyPoints: number;
  completedKeyPoints: TourExecutionKeyPointProgress[];
  startedAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
}

export interface TourExecutionCheckResult {
  execution: TourExecution;
  matchedKeyPoint: boolean;
  completedKeyPoint: TourExecutionKeyPointProgress | null;
  distanceKm: number | null;
}

export interface CreateTourRequest {
  name: string;
  description: string;
  difficulty: string;
  tags: string[];
}

const pick = <T = unknown>(obj: Record<string, unknown> | null | undefined, ...keys: string[]): T | undefined => {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
};

const normalizeExecutionKeyPoint = (raw: unknown): TourExecutionKeyPointProgress => {
  const src = (raw ?? {}) as Record<string, unknown>;
  return {
    keyPointId: pick<string>(src, "keyPointId", "key_point_id") ?? "",
    keyPointName: pick<string>(src, "keyPointName", "key_point_name") ?? "",
    order: Number(pick<number>(src, "order") ?? 0),
    latitude: Number(pick<number>(src, "latitude") ?? 0),
    longitude: Number(pick<number>(src, "longitude") ?? 0),
    distanceKm: Number(pick<number>(src, "distanceKm", "distance_km") ?? 0),
    completedAt: pick<string>(src, "completedAt", "completed_at") ?? "",
  };
};

const normalizeTourExecution = (raw: unknown): TourExecution => {
  const src = (raw ?? {}) as Record<string, unknown>;
  const completed = pick<unknown[]>(src, "completedKeyPoints", "completed_key_points") ?? [];

  return {
    id: pick<string>(src, "id") ?? "",
    tourId: pick<string>(src, "tourId", "tour_id") ?? "",
    tourName: pick<string>(src, "tourName", "tour_name") ?? "",
    touristUsername: pick<string>(src, "touristUsername", "tourist_username") ?? "",
    status: (pick<string>(src, "status") ?? "Active") as TourExecutionStatus,
    startedLatitude: Number(pick<number>(src, "startedLatitude", "started_latitude") ?? 0),
    startedLongitude: Number(pick<number>(src, "startedLongitude", "started_longitude") ?? 0),
    finishedLatitude: pick<number>(src, "finishedLatitude", "finished_latitude") ?? null,
    finishedLongitude: pick<number>(src, "finishedLongitude", "finished_longitude") ?? null,
    totalKeyPoints: Number(pick<number>(src, "totalKeyPoints", "total_key_points") ?? 0),
    completedKeyPoints: completed.map(normalizeExecutionKeyPoint),
    startedAt: pick<string>(src, "startedAt", "started_at") ?? "",
    lastActivityAt: pick<string>(src, "lastActivityAt", "last_activity_at") ?? "",
    finishedAt: pick<string>(src, "finishedAt", "finished_at") ?? null,
  };
};

const normalizeCheckResult = (raw: unknown): TourExecutionCheckResult => {
  const src = (raw ?? {}) as Record<string, unknown>;
  const completedKeyPoint = pick<unknown>(src, "completedKeyPoint", "completed_key_point");

  return {
    execution: normalizeTourExecution(pick<unknown>(src, "execution") ?? {}),
    matchedKeyPoint: Boolean(pick<boolean>(src, "matchedKeyPoint", "matched_key_point")),
    completedKeyPoint: completedKeyPoint ? normalizeExecutionKeyPoint(completedKeyPoint) : null,
    distanceKm: (pick<number>(src, "distanceKm", "distance_km") ?? null) as number | null,
  };
};

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
  },

  startTourExecution: async (
    tourId: string,
    latitude: number,
    longitude: number,
  ): Promise<TourExecution> => {
    const res = await tourClient.post("/tour-executions/start", {
      tourId,
      latitude,
      longitude,
    });
    const data = (res.data ?? {}) as Record<string, unknown>;
    const executionPayload = pick<unknown>(data, "execution") ?? res.data;
    return normalizeTourExecution(executionPayload);
  },

  getTourExecution: async (executionId: string): Promise<TourExecution> => {
    const res = await tourClient.get(`/tour-executions/${executionId}`);
    return normalizeTourExecution(res.data);
  },

  checkNearbyKeyPoint: async (
    executionId: string,
    latitude: number,
    longitude: number,
  ): Promise<TourExecutionCheckResult> => {
    const res = await tourClient.post(`/tour-executions/${executionId}/check-nearby-key-point`, {
      latitude,
      longitude,
    });
    return normalizeCheckResult(res.data);
  },

  completeTourExecution: async (
    executionId: string,
    latitude: number,
    longitude: number,
    force?: boolean,
  ): Promise<TourExecution> => {
    const res = await tourClient.post(`/tour-executions/${executionId}/complete`, {
      latitude,
      longitude,
      force: !!force,
    });
    return normalizeTourExecution(res.data);
  },

  abandonTourExecution: async (
    executionId: string,
    latitude: number,
    longitude: number,
  ): Promise<TourExecution> => {
    const res = await tourClient.post(`/tour-executions/${executionId}/abandon`, {
      latitude,
      longitude,
    });
    return normalizeTourExecution(res.data);
  }
};

export default tourClient;
