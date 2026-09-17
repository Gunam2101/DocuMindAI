import React from "react";
import {
  BookOpen,
  Compass,
  FileText,
  NotebookPen,
  ListChecks,
  GraduationCap,
} from "lucide-react";

export type WorkspaceMode = "pdf" | "path" | "summary" | "notes" | "questions" | "quiz";

interface WorkspaceActionBarProps {
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  className?: string;
}

export default function WorkspaceActionBar({
  activeMode,
  onSelectMode,
  className = "",
}: WorkspaceActionBarProps) {
  const MODES = [
    { id: "pdf" as WorkspaceMode, label: "PDF Reader", icon: BookOpen },
    { id: "path" as WorkspaceMode, label: "Learning Path", icon: Compass },
    { id: "summary" as WorkspaceMode, label: "Summary", icon: FileText },
    { id: "notes" as WorkspaceMode, label: "Study Notes", icon: NotebookPen },
    { id: "questions" as WorkspaceMode, label: "Exam Questions", icon: ListChecks },
    { id: "quiz" as WorkspaceMode, label: "Practice Quiz", icon: GraduationCap },
  ];


  return (
    <div
      role="tablist"
      aria-label="Workspace learning pathways"
      className={`flex items-center justify-center gap-1 sm:gap-2 border-t border-base-750/70 bg-base-900/90 px-3 py-2 backdrop-blur-md shrink-0 overflow-x-auto ${className}`}
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelectMode(id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
              isActive
                ? "bg-accent-600/20 text-accent-300 border border-accent-500/50 shadow-glow-sm"
                : "text-ink-400 hover:text-ink-200 hover:bg-base-800/80 border border-transparent"
            }`}
          >
            <Icon size={14} className={isActive ? "text-accent-400" : "text-ink-500"} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
