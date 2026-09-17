import React, { useRef, useEffect } from "react";
import { FileText, ChevronRight } from "lucide-react";

interface WorkspacePageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  className?: string;
}

export default function WorkspacePageNavigator({
  currentPage,
  totalPages,
  onSelectPage,
  className = "",
}: WorkspacePageNavigatorProps) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const total = Math.max(1, totalPages);
  const pages = Array.from({ length: total }, (_, i) => i + 1);

  // Auto-scroll the active page thumbnail into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentPage]);

  return (
    <nav aria-label="PDF Page Navigation" className={`flex flex-col h-full bg-base-900/95 border-r border-base-750/70 select-none ${className}`}>
      {/* Navigator Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-base-750/60 bg-base-900 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
          Pages ({total})
        </span>
        <span className="text-[11px] font-medium text-accent-300">
          p. {currentPage}
        </span>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 focus-ring">
        {pages.map((pageNum) => {
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              ref={isActive ? activeItemRef : null}
              type="button"
              onClick={() => onSelectPage(pageNum)}
              className={`group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all focus-ring ${
                isActive
                  ? "bg-accent-600/20 border border-accent-500/50 shadow-glow-sm"
                  : "border border-base-750/50 bg-base-850/60 hover:border-base-700 hover:bg-base-850"
              }`}
              title={`Jump to Page ${pageNum}`}
            >
              {/* Miniature Page Thumbnail Representation */}
              <div
                className={`relative flex h-14 w-10 shrink-0 flex-col justify-between rounded-lg border p-1 shadow-sm transition-transform group-hover:scale-105 ${
                  isActive
                    ? "border-accent-400/60 bg-base-950"
                    : "border-base-700 bg-base-900"
                }`}
              >
                {/* Miniature content lines representation */}
                <div className="space-y-1 opacity-70">
                  <div className={`h-1 w-3/4 rounded-full ${isActive ? "bg-accent-400" : "bg-ink-500"}`} />
                  <div className="h-0.5 w-full rounded-full bg-ink-600" />
                  <div className="h-0.5 w-5/6 rounded-full bg-ink-600" />
                  <div className="h-0.5 w-2/3 rounded-full bg-ink-600" />
                </div>
                {/* Miniature bottom page number badge */}
                <div className="text-right">
                  <span className={`text-[8px] font-mono font-bold ${isActive ? "text-accent-300" : "text-ink-500"}`}>
                    {pageNum}
                  </span>
                </div>
              </div>

              {/* Page details label */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-accent-300" : "text-ink-200 group-hover:text-white"
                    }`}
                  >
                    Page {pageNum}
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] text-ink-500 truncate">
                  {isActive ? "Active View" : "Click to view"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
