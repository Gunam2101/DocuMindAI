import axios, { AxiosError } from "axios";
import type { ApiError } from "../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (import.meta.env.PROD ? "" : "http://localhost:8000");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

if (typeof window !== "undefined") {
  (window as any).__apiClient = apiClient;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("documind_token");
  if (token) {
    if (config.headers && typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      // Only clear tokens and redirect if this was a user authentication / auth endpoint failure
      const isUserAuthError = url.includes("/auth/") || error.response?.data?.error_code === "HTTP_401";
      if (isUserAuthError) {
        localStorage.removeItem("documind_token");
        localStorage.removeItem("documind_user");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

/** Extracts a clean, user-facing message from any API error. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong while processing your request."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.detail) {
      // Return safe backend-provided detail
      return data.detail;
    }
    if (error.code === "ECONNABORTED") return "The request took too long. Please try again.";
    if (!error.response) return "Couldn't reach the server. Please check your connection and try again.";
    if (error.response.status === 429) return "The AI service is receiving too many requests. Please wait a few seconds and try again.";
    if (error.response.status === 502 || error.response.status === 503) return "The AI service is temporarily unavailable. Please try again shortly.";
  }
  return fallback;
}
