import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Download,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MoreVertical,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { Document } from "../../types";
import StatusBadge from "../StatusBadge";
import * as documentService from "../../services/documentService";

interface WorkspaceHeaderProps {
  document: Document;
  currentPage: number;
  totalPages: number;
  isNavOpen: boolean;
  isAiOpen: boolean;
  onToggleNav: () => void;
  onToggleAi: () => void;
  onAskAboutPage: () => void;
  onDeleteDocument?: () => void;
}

export default function WorkspaceHeader({
  document: doc,
  currentPage,
  totalPages,
  isNavOpen,
  isAiOpen,
  onAskAboutPage,
  onToggleNav,
  onToggleAi,
  onDeleteDocument,
}: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isReady = doc.status === "READY" || (doc.status as string) === "COMPLETED";

  async function handleDownload() {
    setDownloading(true);
    try {
      await documentService.downloadDocument(doc.id, doc.filename);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-base-750/70 bg-base-900/90 px-3 sm:px-5 backdrop-blur-md">
      {/* Left: Back button + Document Info */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/app/documents"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-base-750 bg-base-850 text-ink-300 hover:border-accent-500/40 hover:bg-base-800 hover:text-ink-100 transition-all focus-ring"
          title="Back to Documents Library"
          aria-label="Back to Documents"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Brand/Doc icon */}
        <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-700/10 border border-accent-500/30 text-accent-300">
          <FileText size={16} />
        </div>

        {/* Title and metadata */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="truncate text-xs sm:text-sm font-bold text-ink-50 max-w-[180px] sm:max-w-xs md:max-w-md"
              title={doc.filename}
            >
              {doc.filename}
            </h1>
            <div className="shrink-0 hidden md:block">
              <StatusBadge status={doc.status} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-400">
            <span>
              {totalPages > 0 ? `${totalPages} pages` : "Processing"}
            </span>
            <span>•</span>
            <span className="text-accent-300 font-medium">DocuMind AI Active</span>
          </div>
        </div>
      </div>

      {/* Center: Context Page Badge */}
      <div className="hidden lg:flex items-center gap-2 rounded-xl border border-base-750 bg-base-950/60 px-3 py-1 text-xs">
        <span className="font-semibold text-accent-300">📄 Page {currentPage}</span>
        <span className="text-ink-500">/ {totalPages || 1}</span>
      </div>

      {/* Right: Actions & Panel Toggles */}
      <div className="flex items-center gap-2">
        {/* Toggle Page Navigator button */}
        <button
          type="button"
          onClick={onToggleNav}
          className={`hidden md:flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all focus-ring ${
            isNavOpen
              ? "border-accent-500/40 bg-accent-600/15 text-accent-300"
              : "border-base-750 bg-base-850 text-ink-300 hover:text-ink-100 hover:bg-base-800"
          }`}
          title={isNavOpen ? "Hide Page Navigator" : "Show Page Navigator"}
        >
          {isNavOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          <span className="hidden xl:inline">Pages</span>
        </button>

        {/* Ask About This Page CTA */}
        {isReady && (
          <button
            type="button"
            onClick={onAskAboutPage}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.02] focus-ring"
            title={`Ask AI Teacher about page ${currentPage}`}
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Ask About Page {currentPage}</span>
            <span className="sm:hidden">Ask p.{currentPage}</span>
          </button>
        )}

        {/* Download PDF */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:border-base-700 hover:bg-base-800 hover:text-ink-100 transition-all focus-ring disabled:opacity-50"
          title="Download original PDF"
        >
          <Download size={13} />
          <span className="hidden lg:inline">{downloading ? "Downloading..." : "Download"}</span>
        </button>

        {/* Toggle AI Teacher Panel */}
        <button
          type="button"
          onClick={onToggleAi}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all focus-ring ${
            isAiOpen
              ? "border-accent-500/40 bg-accent-600/15 text-accent-300"
              : "border-base-750 bg-base-850 text-ink-300 hover:text-ink-100 hover:bg-base-800"
          }`}
          title={isAiOpen ? "Hide AI Teacher" : "Open AI Teacher"}
        >
          {isAiOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          <span className="hidden sm:inline">AI Teacher</span>
        </button>

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl border border-base-750 bg-base-850 p-1.5 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-colors focus-ring"
            aria-label="More document options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-2xl border border-base-750 bg-base-900 p-1.5 shadow-2xl animate-fade-in text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDownload();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-ink-200 hover:bg-base-800 hover:text-white transition-colors"
                >
                  <Download size={14} className="text-sky-400" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/app/ask?document=${doc.id}`);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-ink-200 hover:bg-base-800 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} className="text-accent-400" />
                  <span>Open Standalone Chat</span>
                </button>
                {onDeleteDocument && (
                  <>
                    <div className="my-1 border-t border-base-750/70" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteDocument();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete Document</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
