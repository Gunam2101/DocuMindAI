import { apiClient } from "./apiClient";
import type { User } from "../types";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", { name, email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", { email, password });
  return data;
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/google", { credential });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/api/auth/me");
  return data;
}
