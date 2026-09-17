import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Download,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { Document } from "../../types";
import * as documentService from "../../services/documentService";
import { getErrorMessage } from "../../services/apiClient";
import ErrorState from "../ErrorState";

interface WorkspacePdfViewerProps {
  document: Document;
  currentPage: number;
  zoom: number;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onSearchSubmit: (query: string) => void;
  onAskAboutPage: () => void;
  onExplainText?: (text: string) => void;
  className?: string;
}

export default function WorkspacePdfViewer({
  document: doc,
  currentPage,
  zoom,
  searchQuery,
  onPageChange,
  onZoomChange,
  onSearchSubmit,
  onAskAboutPage,
  onExplainText,
  className = "",
}: WorkspacePdfViewerProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [downloading, setDownloading] = useState(false);

  // Text selection highlight helper state
  const [selectedText, setSelectedText] = useState("");
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number } | null>(null);

  const totalPages = doc.page_count || 1;

  // Fetch real PDF blob
  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const blob = await documentService.fetchDocumentPdfBlob(doc.id);
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, "Could not load the PDF document file."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.id]);

  function handlePrev() {
    onPageChange(Math.max(1, currentPage - 1));
  }

  function handleNext() {
    onPageChange(Math.min(totalPages, currentPage + 1));
  }

  function handlePageInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val);
    }
  }

  function handleZoomIn() {
    onZoomChange(Math.min(250, zoom + 15));
  }

  function handleZoomOut() {
    onZoomChange(Math.max(50, zoom - 15));
  }

  function handleResetZoom() {
    onZoomChange(100);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearchSubmit(localSearch.trim());
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await documentService.downloadDocument(doc.id, doc.filename);
    } finally {
      setDownloading(false);
    }
  }

  // Handle text selection from window if user highlights text
  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 2) {
        setSelectedText(text);
        setSelectionBox({
          x: Math.min(window.innerWidth - 180, Math.max(20, e.clientX - 60)),
          y: Math.max(70, e.clientY - 45),
        });
      } else {
        setSelectedText("");
        setSelectionBox(null);
      }
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Assemble PDF open parameters
  const params = [
    `page=${currentPage}`,
    `zoom=${zoom}`,
    searchQuery ? `search=${encodeURIComponent(searchQuery)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  const iframeSrc = pdfBlobUrl ? `${pdfBlobUrl}#${params}` : undefined;

  return (
    <div className={`relative flex flex-col h-full bg-base-950 overflow-hidden ${className}`}>
      {/* PDF Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-base-750/70 bg-base-900/95 px-3 py-2 text-xs text-ink-200 z-10">
        {/* Page Step & Jump Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="rounded-lg p-1.5 text-ink-300 hover:bg-base-800 hover:text-white disabled:opacity-30 transition-colors focus-ring"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-ink-400 font-medium">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handlePageInput}
            aria-label="Current Page Number"
            className="w-12 rounded-lg border border-base-700 bg-base-950 px-1.5 py-1 text-center text-xs font-semibold text-ink-100 focus-ring hover:border-accent-500/40"
          />
          <span className="text-ink-400">of {totalPages}</span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="rounded-lg p-1.5 text-ink-300 hover:bg-base-800 hover:text-white disabled:opacity-30 transition-colors focus-ring"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-x border-base-750/60 px-2.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="rounded-lg p-1.5 text-ink-300 hover:bg-base-800 hover:text-white disabled:opacity-30 transition-colors focus-ring"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <span className="w-12 text-center text-xs font-semibold text-ink-200">
            {zoom}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 250}
            className="rounded-lg p-1.5 text-ink-300 hover:bg-base-800 hover:text-white disabled:opacity-30 transition-colors focus-ring"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="ml-1 rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-accent-300 transition-colors focus-ring"
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Search inside PDF */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-1.5">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              type="text"
              placeholder="Search PDF..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-28 md:w-36 rounded-lg border border-base-750 bg-base-950 py-1 pl-7 pr-2 text-xs text-ink-100 placeholder:text-ink-600 focus-ring"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-base-750 bg-base-850 px-2 py-1 text-xs font-medium text-ink-300 hover:border-accent-500/40 hover:text-white transition-colors"
          >
            Find
          </button>
        </form>

        {/* Contextual Ask & Download */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onAskAboutPage}
            className="flex items-center gap-1.5 rounded-lg border border-accent-500/40 bg-accent-600/15 px-2.5 py-1 text-xs font-semibold text-accent-300 hover:bg-accent-600/25 transition-all focus-ring"
            title={`Ask AI Teacher about page ${currentPage}`}
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Ask About Page {currentPage}</span>
            <span className="sm:hidden">p.{currentPage}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-lg border border-base-750 bg-base-850 p-1.5 text-ink-300 hover:bg-base-800 hover:text-white transition-colors focus-ring"
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Floating Selection Action: Explain with AI */}
      {selectionBox && selectedText && onExplainText && (
        <div
          style={{ left: `${selectionBox.x}px`, top: `${selectionBox.y}px` }}
          className="fixed z-50 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => {
              onExplainText(selectedText);
              setSelectedText("");
              setSelectionBox(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-3 py-1.5 text-xs font-semibold text-white shadow-glow hover:scale-105 transition-all focus-ring"
          >
            <Sparkles size={13} />
            <span>Explain with AI</span>
          </button>
        </div>
      )}

      {/* PDF Viewport Canvas */}
      <div className="relative flex-1 bg-base-950 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-base-950 text-ink-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shadow-glow" />
            <p className="text-xs font-medium">Loading document reader...</p>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-6">
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                setError(null);
              }}
            />
          </div>
        )}

        {!loading && !error && iframeSrc && (
          <iframe
            key={`${doc.id}-${params}`}
            src={iframeSrc}
            title={doc.filename}
            className="h-full w-full border-0 bg-base-900"
          />
        )}
      </div>
    </div>
  );
}
