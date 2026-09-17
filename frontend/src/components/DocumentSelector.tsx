import { useEffect, useState } from "react";
import * as documentService from "../services/documentService";
import type { Document } from "../types";
import { getErrorMessage } from "../services/apiClient";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setDocuments(await documentService.listDocuments());
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load your documents."));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { documents, error, reload: load };
}

export default function DocumentSelector({
  documents,
  selectedId,
  onSelect,
  readyOnly = true,
}: {
  documents: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  readyOnly?: boolean;
}) {
  const options = readyOnly ? documents.filter((d) => d.status === "READY") : documents;

  return (
    <select
      aria-label="Select a document"
      value={selectedId || ""}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full max-w-xs rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100 focus-ring focus:border-accent-500"
    >
      <option value="" disabled>
        {options.length ? "Select a document..." : "No ready documents yet"}
      </option>
      {options.map((d) => (
        <option key={d.id} value={d.id}>
          {d.filename}
        </option>
      ))}
    </select>
  );
}
