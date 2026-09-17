import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, FileText, NotebookPen, GraduationCap, Eye, Download, Sparkles, X, ChevronRight } from "lucide-react";
import type { Document } from "../types";
import StatusBadge from "./StatusBadge";
import * as documentService from "../services/documentService";

interface DocumentWorkspaceProps {
  document: Document;
  onClose: () => void;
  onOpenPdf: (doc: Document) => void;
}

export default function DocumentWorkspace({ document: doc, onClose, onOpenPdf }: DocumentWorkspaceProps) {
  const navigate = useNavigate();
  const isReady = doc.status === "READY" || (doc.status as string) === "COMPLETED";

  const ACTIONS = [
    {
      title: "Ask AI Teacher",
      description: "Chat in any language, ask doubts, and understand core concepts.",
      icon: MessageSquare,
      path: `/app/ask?document=${doc.id}`,
      color: "from-accent-500 to-accent-600",
      border: "border-accent-500/30",
    },
    {
      title: "Generate Summary",
      description: "Overview, main topics, key concepts, and takeaways in seconds.",
      icon: FileText,
      path: `/app/summary?document=${doc.id}`,
      color: "from-sky-500 to-sky-600",
      border: "border-sky-500/30",
    },
    {
      title: "Create Study Notes",
      description: "Notebook breakdown with definitions, explanations, and key points.",
      icon: NotebookPen,
      path: `/app/notes?document=${doc.id}`,
      color: "from-emerald-500 to-emerald-600",
      border: "border-emerald-500/30",
    },
    {
      title: "Practice Quiz",
      description: "Test your comprehension with an interactive multi-question quiz.",
      icon: GraduationCap,
      path: `/app/quiz?document=${doc.id}`,
      color: "from-amber-500 to-amber-600",
      border: "border-amber-500/30",
    },
  ];

  return (
    <div className="rounded-2xl border border-accent-500/40 bg-gradient-to-b from-base-900 via-base-900 to-base-950 p-6 shadow-glow animate-fade-in">
      {/* Workspace Header */}
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-base-750/60">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-300">
              Active Workspace
            </span>
            <StatusBadge status={doc.status} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-ink-50 truncate" title={doc.filename}>
            {doc.filename}
          </h2>
          <p className="text-xs text-ink-400">
            {doc.page_count > 0 ? `${doc.page_count} total pages` : "Document processing"} • Document ID: <code className="font-mono text-ink-500">{doc.id.slice(0, 8)}</code>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenPdf(doc)}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-accent-500/50 hover:bg-base-800 hover:text-white transition-all focus-ring"
          >
            <Eye size={14} className="text-accent-400" />
            <span>Open PDF</span>
          </button>
          <button
            type="button"
            onClick={() => documentService.downloadDocument(doc.id, doc.filename)}
            className="rounded-xl border border-base-750 bg-base-850 p-2 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-colors focus-ring"
            title="Download PDF"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-500 hover:text-ink-200 hover:bg-base-800 transition-colors focus-ring"
            aria-label="Close workspace"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Learning Pathways Grid */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Learn From This Document
          </h3>
          <span className="text-xs text-accent-400">Choose a study mode</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                type="button"
                disabled={!isReady}
                onClick={() => navigate(action.path)}
                className={`group flex flex-col items-start justify-between rounded-xl border ${action.border} bg-base-950/80 p-4 text-left transition-all hover:scale-[1.02] hover:bg-base-850 disabled:opacity-40 disabled:hover:scale-100 focus-ring`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform group-hover:scale-110" style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                  <div className={`flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br ${action.color}`}>
                    <Icon size={18} />
                  </div>
                </div>

                <div className="mt-3.5 space-y-1">
                  <p className="text-sm font-semibold text-ink-100 group-hover:text-accent-300 transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-ink-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="mt-4 flex w-full items-center justify-between text-xs font-medium text-accent-400 group-hover:text-accent-300">
                  <span>Start learning</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
