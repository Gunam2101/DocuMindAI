import { apiClient } from "./apiClient";
import type { User } from "../types";

export interface SettingsUpdate {
  theme?: "dark" | "light";
  preferred_language?: string;
  response_style?: "concise" | "detailed";
}

export async function updateSettings(update: SettingsUpdate): Promise<User> {
  const { data } = await apiClient.patch<User>("/api/settings", update);
  return data;
}
