import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MoreVertical, Eye, Download, Trash2, ArrowRight, MessageSquare, BookOpen, Clock } from "lucide-react";
import type { Document } from "../types";
import StatusBadge from "./StatusBadge";
import DocuMindLogo from "./DocuMindLogo";
import * as documentService from "../services/documentService";

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (doc: Document) => void;
  onViewPdf: (doc: Document) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export default function DocumentCard({
  document: doc,
  isSelected = false,
  onSelect,
  onViewPdf,
  onDelete,
  className = "",
}: DocumentCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isReady = doc.status === "READY" || (doc.status as string) === "COMPLETED";
  const isProcessing = doc.status === "PROCESSING" || (doc.status as string) === "UPLOADING";

  function handleCardClick() {
    navigate(`/app/workspace/${doc.id}`);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between rounded-2xl border bg-gradient-to-b from-base-900 to-base-900/70 p-5 shadow-card transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-accent-500 shadow-glow bg-base-850/90 ring-1 ring-accent-500/50"
          : "border-base-750 hover:border-accent-500/40 hover:bg-base-800"
      } ${className}`}
    >
      <div>
        {/* Top bar: Icon, Status, and Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-accent-600/10 text-red-400 border border-red-500/20 shadow-sm transition-transform group-hover:scale-105">
            <FileText size={22} strokeWidth={1.75} />
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} />

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1 text-ink-400 hover:bg-base-800 hover:text-ink-100 transition-colors focus-ring"
                aria-label="More options"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-base-750 bg-base-850 p-1 shadow-card animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onViewPdf(doc);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink-200 hover:bg-base-800 hover:text-ink-50 transition-colors"
                    >
                      <Eye size={13} className="text-accent-400" /> View PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        documentService.downloadDocument(doc.id, doc.filename);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink-200 hover:bg-base-800 hover:text-ink-50 transition-colors"
                    >
                      <Download size={13} className="text-sky-400" /> Download
                    </button>
                    <div className="my-1 border-t border-base-750/70" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(doc.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title and metadata */}
        <div className="mt-4 space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-100 group-hover:text-accent-300 transition-colors" title={doc.filename}>
            {doc.filename}
          </h3>
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <span>{doc.page_count > 0 ? `${doc.page_count} pages` : "Processing pages..."}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-ink-500" />
              Recent
            </span>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3.5 space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-amber-300">
              <div className="flex items-center gap-1.5 font-medium">
                <DocuMindLogo variant="icon" size="xs" />
                <span>AI Ingesting</span>
              </div>
              <span className="animate-pulse">Extracting & indexing...</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
              <div className="h-full w-2/3 animate-pulse-soft rounded-full bg-amber-400" />
            </div>
          </div>
        )}

        {/* Failure reason */}
        {doc.status === "FAILED" && doc.failure_reason && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-400">
            <p className="font-medium">Processing failed</p>
            <p className="mt-0.5 opacity-90 line-clamp-2">{doc.failure_reason}</p>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="mt-5 pt-3 border-t border-base-750/50 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => navigate(`/app/workspace/${doc.id}?mode=pdf`)}
          className="flex items-center gap-1.5 rounded-lg border border-base-750 bg-base-850 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:border-base-700 hover:bg-base-800 hover:text-ink-100 transition-all focus-ring"
        >
          <Eye size={13} />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/app/workspace/${doc.id}`)}
          disabled={!isReady}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm hover:from-accent-500 hover:to-accent-600 disabled:opacity-40 disabled:pointer-events-none transition-all focus-ring"
        >
          <MessageSquare size={13} />
          <span>Learn</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
