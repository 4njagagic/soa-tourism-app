import axios from "axios";
import client from "./api";

export interface OrderItem {
  tourId: string;
  tourName: string;
  price: number;
}

export interface Cart {
  username: string;
  totalPrice: number;
  items: OrderItem[];
}

export interface PurchaseToken {
  tourId: string;
  token: string;
  purchasedAt: string;
}

export interface CheckoutResult {
  totalPaid: number;
  tokens: {
    tourId: string;
    tourName: string;
    token: string;
    purchasedAt: string;
  }[];
}

export const getPurchaseApiErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: string }).message);
    }
  }
  return fallback;
};

export const purchaseService = {
  getCart: async (): Promise<Cart> => {
    const res = await client.get("/cart");
    return res.data;
  },

  addToCart: async (tourId: string): Promise<Cart> => {
    const res = await client.post("/cart/items", { tourId });
    return res.data;
  },

  removeFromCart: async (tourId: string): Promise<Cart> => {
    const res = await client.delete(`/cart/items/${tourId}`);
    return res.data;
  },

  checkout: async (): Promise<CheckoutResult> => {
    const res = await client.post("/cart/checkout");
    return res.data;
  },

  getPurchases: async (): Promise<PurchaseToken[]> => {
    const res = await client.get("/cart/purchases");
    return res.data;
  },

  hasPurchased: async (tourId: string): Promise<boolean> => {
    const res = await client.get(`/cart/purchases/${tourId}`);
    return res.data.purchased;
  },
};
