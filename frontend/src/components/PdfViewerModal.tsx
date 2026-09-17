import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  MessageSquare,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import type { Document } from "../types";
import * as documentService from "../services/documentService";
import { getErrorMessage } from "../services/apiClient";
import ErrorState from "./ErrorState";

interface PdfViewerModalProps {
  document: Document | null;
  initialPage?: number;
  onClose: () => void;
}

export default function PdfViewerModal({ document, initialPage = 1, onClose }: PdfViewerModalProps) {
  const navigate = useNavigate();

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const totalPages = document?.page_count || 1;

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (!document) {
      setPdfBlobUrl(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;

    async function loadPdf() {
      if (!document) return;
      setLoading(true);
      setError(null);
      try {
        const blob = await documentService.fetchDocumentPdfBlob(document.id);
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(createdUrl);
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load the PDF file."));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [document?.id]);

  if (!document) return null;

  function handlePrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1));
  }

  function handlePageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && (!totalPages || val <= totalPages)) {
      setPage(val);
    }
  }

  function handleZoomIn() {
    setZoom((z) => Math.min(250, z + 20));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(50, z - 20));
  }

  function handleResetZoom() {
    setZoom(100);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedSearch(searchQuery.trim());
  }

  async function handleDownload() {
    if (!document) return;
    setDownloading(true);
    try {
      await documentService.downloadDocument(document.id, document.filename);
    } catch (err) {
      setError(getErrorMessage(err, "Download failed. Please try again."));
    } finally {
      setDownloading(false);
    }
  }

  function handleAskAboutPage() {
    if (!document) return;
    onClose();
    navigate(`/app/ask?document=${document.id}&page=${page}`);
  }

  // Construct iframe source with standard PDF open parameters
  const iframeParams = [
    `page=${page}`,
    `zoom=${zoom}`,
    appliedSearch ? `search=${encodeURIComponent(appliedSearch)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  const iframeSrc = pdfBlobUrl ? `${pdfBlobUrl}#${iframeParams}` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[95vh] w-full max-w-6xl flex-col rounded-2xl border border-base-700 bg-base-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-800 bg-base-900 px-5 py-3">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-sm font-semibold text-ink-100" title={document.filename}>
              {document.filename}
            </h2>
            <p className="text-xs text-ink-400">
              {totalPages > 0 ? `${totalPages} pages` : "Document"} · {document.status}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAskAboutPage}
              className="flex items-center gap-1.5 rounded-lg bg-accent-600/20 px-3 py-1.5 text-xs font-medium text-accent-300 hover:bg-accent-600/30 transition-colors focus-ring"
              title="Ask AI questions about this specific page"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Ask About Page {page}</span>
              <span className="sm:hidden">Ask p.{page}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-ink-100 transition-colors focus-ring"
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-800 bg-base-900/90 px-4 py-2 text-xs text-ink-300">
          {/* Page Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="rounded p-1 hover:bg-base-800 disabled:opacity-30 transition-colors focus-ring"
              aria-label="Previous Page"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-ink-400">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || undefined}
              value={page}
              onChange={handlePageInputChange}
              className="w-12 rounded border border-base-700 bg-base-950 px-1.5 py-0.5 text-center text-xs text-ink-100 focus-ring"
            />
            <span className="text-ink-500">of {totalPages || 1}</span>
            <button
              onClick={handleNextPage}
              disabled={totalPages > 0 && page >= totalPages}
              className="rounded p-1 hover:bg-base-800 disabled:opacity-30 transition-colors focus-ring"
              aria-label="Next Page"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-x border-base-800 px-3">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="rounded p-1 hover:bg-base-800 disabled:opacity-30 transition-colors focus-ring"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="w-12 text-center text-xs text-ink-300">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 250}
              className="rounded p-1 hover:bg-base-800 disabled:opacity-30 transition-colors focus-ring"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={handleResetZoom}
              className="ml-1 rounded p-1 hover:bg-base-800 text-ink-400 hover:text-ink-200 transition-colors focus-ring"
              title="Reset Zoom to 100%"
              aria-label="Reset zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                placeholder="Search PDF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 sm:w-44 rounded-md border border-base-700 bg-base-950 py-1 pl-7 pr-2 text-xs text-ink-100 placeholder:text-ink-600 focus-ring"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-base-800 px-2.5 py-1 text-xs text-ink-300 hover:bg-base-700 hover:text-white transition-colors"
            >
              Find
            </button>
          </form>

          {/* Download Action */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-md bg-base-800 px-3 py-1 text-xs font-medium text-ink-200 hover:bg-base-700 transition-colors focus-ring disabled:opacity-50"
              title="Download the real PDF file"
            >
              <Download size={13} />
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>
        </div>

        {/* Viewer Canvas / Frame */}
        <div className="relative flex-1 bg-base-950 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-base-950 text-ink-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              <p className="text-xs">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorState message={error} onRetry={() => setPdfBlobUrl(null)} />
            </div>
          )}

          {!loading && !error && iframeSrc && (
            <iframe
              key={`${document.id}-${iframeParams}`}
              src={iframeSrc}
              title={document.filename}
              className="h-full w-full border-0 bg-base-900"
            />
          )}
        </div>
      </div>
    </div>
  );
}
