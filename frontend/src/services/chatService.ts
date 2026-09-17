import { apiClient } from "./apiClient";
import type { ChatMessage, Conversation } from "../types";

export type TeachingLevel = "beginner" | "intermediate" | "advanced";
export type AnswerMode = "auto" | "quick" | "2_marks" | "5_marks" | "10_marks" | "detailed";

export interface SendMessageParams {
  message: string;
  conversationId?: string;
  documentId?: string;
  language?: string;
  image?: File | null;
  currentPage?: number;
  selectedText?: string;
  learningPathStepId?: string;
  learningPathTopic?: string;
  teachingLevel?: TeachingLevel;
  answerMode?: AnswerMode;
}

export interface ChatResponse {
  answer: string;
  sources: { page: number }[];
  conversation_id: string;
  message_id: string;
}

export async function sendMessage(params: SendMessageParams): Promise<ChatResponse> {
  const form = new FormData();
  form.append("message", params.message);
  if (params.conversationId) form.append("conversation_id", params.conversationId);
  if (params.documentId) form.append("document_id", params.documentId);
  form.append("language", params.language || "auto");
  if (params.image) form.append("image", params.image);
  if (params.currentPage) form.append("current_page", String(params.currentPage));
  if (params.selectedText) form.append("selected_text", params.selectedText);
  if (params.learningPathStepId) form.append("learning_path_step_id", params.learningPathStepId);
  if (params.learningPathTopic) form.append("learning_path_topic", params.learningPathTopic);
  if (params.teachingLevel) form.append("teaching_level", params.teachingLevel);
  if (params.answerMode) form.append("answer_mode", params.answerMode);

  const { data } = await apiClient.post<ChatResponse>("/api/chat", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}


export async function listConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<Conversation[]>("/api/chat/conversations");
  return data;
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ChatMessage[]>(`/api/chat/conversations/${conversationId}/messages`);
  return data;
}
