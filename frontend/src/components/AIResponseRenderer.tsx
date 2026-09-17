import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import SourceChip from "./SourceChip";
import DocuMindLogo from "./DocuMindLogo";
import type { SourceRef } from "../types";

interface AIResponseRendererProps {
  content: string;
  sources?: SourceRef[];
  onPageClick?: (page: number) => void;
  className?: string;
  showTeacherHeader?: boolean;
}

export default function AIResponseRenderer({
  content,
  sources = [],
  onPageClick,
  className = "",
  showTeacherHeader = false,
}: AIResponseRendererProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Deduplicate sources by page number
  const uniqueSources = sources.reduce((acc: SourceRef[], curr: SourceRef) => {
    if (!acc.some((s) => s.page === curr.page)) {
      acc.push(curr);
    }
    return acc;
  }, [] as SourceRef[]);

  return (
    <div className={`group relative rounded-2xl border border-base-750/70 bg-gradient-to-b from-base-900/90 to-base-900/50 p-5 shadow-card transition-all hover:border-base-700 ${className}`}>
      {showTeacherHeader && (
        <div className="mb-3.5 flex items-center justify-between border-b border-base-750/50 pb-3">
          <div className="flex items-center gap-2">
            <DocuMindLogo variant="icon" size="xs" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-300">DocuMind AI Teacher</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-base-750 bg-base-850 px-2 py-1 text-xs text-ink-400 opacity-70 transition-all hover:border-accent-500/40 hover:text-ink-100 hover:opacity-100 focus-ring"
            title="Copy response"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}

      {/* Main markdown content */}
      <div className="text-ink-100">
        <MarkdownRenderer content={content} />
      </div>

      {/* Sources footer */}
      {uniqueSources.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-base-750/40 pt-3 text-xs text-ink-400">
          <span className="font-medium text-ink-300">Sources:</span>
          {uniqueSources.map((source, idx) => (
            <SourceChip
              key={`${source.page}-${idx}`}
              page={source.page}
              onClick={onPageClick}
            />
          ))}
        </div>
      )}

      {!showTeacherHeader && (
        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-base-750 bg-base-850 p-1.5 text-ink-400 transition-colors hover:text-ink-100 focus-ring"
            title="Copy content"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}
