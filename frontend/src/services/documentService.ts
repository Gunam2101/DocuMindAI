import { apiClient } from "./apiClient";
import type { Document } from "../types";

export async function uploadDocument(file: File, onProgress?: (pct: number) => void): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<Document>("/api/documents", form, {
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
  return data;
}

export async function listDocuments(): Promise<Document[]> {
  const { data } = await apiClient.get<{ documents: Document[] }>("/api/documents");
  return data.documents;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get<Document>(`/api/documents/${id}`);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/api/documents/${id}`);
}

export async function touchDocument(id: string): Promise<Document> {
  const { data } = await apiClient.post<Document>(`/api/documents/${id}/touch`);
  return data;
}

export async function fetchDocumentPdfBlob(id: string): Promise<Blob> {
  const response = await apiClient.get(`/api/documents/${id}/view`, {
    responseType: "blob",
  });
  return response.data;
}

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/api/documents/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || "document.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
