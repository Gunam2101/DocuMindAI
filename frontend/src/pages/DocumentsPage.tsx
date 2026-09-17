import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Upload, Search, FileText, Sparkles, Filter } from "lucide-react";
import * as documentService from "../services/documentService";
import type { Document, DocumentStatus } from "../types";
import DocumentCard from "../components/DocumentCard";
import DocumentWorkspace from "../components/DocumentWorkspace";
import PageHeader from "../components/PageHeader";
import { EmptyState, SkeletonCard } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import PdfViewerModal from "../components/PdfViewerModal";
import { getErrorMessage } from "../services/apiClient";

const FILTERS: { key: "ALL" | DocumentStatus; label: string }[] = [
  { key: "ALL", label: "All Documents" },
  { key: "READY", label: "Ready to Study" },
  { key: "PROCESSING", label: "Processing" },
  { key: "FAILED", label: "Failed" },
];

export default function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightId = searchParams.get("highlight");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [filter, setFilter] = useState<"ALL" | DocumentStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await documentService.listDocuments();
      setDocuments(data);
      if (highlightId && !selectedDoc) {
        const found = data.find((d) => d.id === highlightId);
        if (found) setSelectedDoc(found);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load documents."));
    }
  }

  useEffect(() => {
    load();
  }, [highlightId]);

  // Poll while anything is processing
  useEffect(() => {
    const hasPending = documents?.some(
      (d) =>
        d.status === "PROCESSING" ||
        d.status === "UPLOADED" ||
        (d.status as string) === "UPLOADING"
    );
    if (!hasPending) return;
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [documents]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const newDoc = await documentService.uploadDocument(file);
      navigate(`/app/workspace/${newDoc.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete this document."));
    }
  }

  const filtered = (documents || [])
    .filter((d) => (filter === "ALL" ? true : d.status === filter))
    .filter((d) => d.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Your Learning Library"
        subtitle="Manage your study materials, explore previews, and launch AI study workflows."
        badge={
          documents && documents.length > 0 ? (
            <span className="rounded-full border border-base-750 bg-base-850 px-2.5 py-0.5 text-xs font-semibold text-accent-300">
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </span>
          ) : undefined
        }
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.02] disabled:opacity-50 focus-ring"
            >
              <Upload size={16} />
              <span>{uploading ? "Uploading..." : "Upload Document"}</span>
            </button>
          </>
        }
      />

      {/* Selected Document Contextual Workspace */}
      {selectedDoc && (
        <DocumentWorkspace
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onOpenPdf={(doc) => setViewingDoc(doc)}
        />
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full rounded-xl border border-base-750 bg-base-900 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-ink-100 placeholder:text-ink-500 focus-ring"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all focus-ring ${
                filter === f.key
                  ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                  : "bg-base-900 text-ink-400 border border-base-750/70 hover:bg-base-850 hover:text-ink-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Bookshelf Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {documents === null &&
          !error &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {documents !== null && filtered.length === 0 && !error && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              icon={FileText}
              title={query || filter !== "ALL" ? "No matching documents" : "Your learning library is empty"}
              description={
                query || filter !== "ALL"
                  ? "Try changing your search keywords or switching filters."
                  : "Upload a PDF textbook, lecture notes, or syllabus to begin learning."
              }
              action={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
                >
                  <Upload size={14} />
                  <span>Upload Document</span>
                </button>
              }
            />
          </div>
        )}

        {filtered.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            isSelected={selectedDoc?.id === doc.id}
            onSelect={(d) => navigate(`/app/workspace/${d.id}`)}
            onViewPdf={(d) => navigate(`/app/workspace/${d.id}?mode=pdf`)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerModal document={viewingDoc} onClose={() => setViewingDoc(null)} />
    </div>
  );
}
