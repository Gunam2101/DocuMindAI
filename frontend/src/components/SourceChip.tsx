import React from "react";
import { BookOpen } from "lucide-react";

interface SourceChipProps {
  page: number;
  snippet?: string;
  onClick?: (page: number) => void;
  className?: string;
}

export default function SourceChip({ page, snippet, onClick, className = "" }: SourceChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(page)}
      title={snippet ? `Page ${page}: "${snippet.slice(0, 80)}..."` : `Jump to page ${page}`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-base-750 bg-base-850 px-2 py-0.5 text-xs font-medium text-accent-300 transition-all hover:border-accent-500/50 hover:bg-base-800 hover:text-accent-200 focus-ring ${className}`}
    >
      <BookOpen size={11} className="text-accent-400" />
      <span>Page {page}</span>
    </button>
  );
}
