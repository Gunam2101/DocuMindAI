import React, { useEffect, useState } from "react";
import {
  NotebookPen,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import type { Document, NotesData, NoteTopic } from "../../../types";
import * as contentService from "../../../services/contentService";
import { getErrorMessage } from "../../../services/apiClient";
import AIResponseRenderer from "../../AIResponseRenderer";
import ErrorState from "../../ErrorState";

interface WorkspaceNotesViewProps {
  document: Document;
  onBackToPdf: () => void;
  onAskAi: (prompt: string) => void;
}

export default function WorkspaceNotesView({
  document: doc,
  onBackToPdf,
  onAskAi,
}: WorkspaceNotesViewProps) {
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadNotes() {
    setLoading(true);
    setError(null);
    setActiveIndex(0);
    try {
      const data = await contentService.generateNotes(doc.id);
      setNotes(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate study notes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, [doc.id]);

  const activeTopic = notes?.topics[activeIndex] || null;

  async function handleCopy() {
    if (!activeTopic) return;
    const text = [
      `# ${activeTopic.title}`,
      "",
      `### Definition`,
      activeTopic.definition,
      "",
      `### Explanation`,
      activeTopic.explanation,
      ...(activeTopic.key_points ? ["", "### Key Points", ...activeTopic.key_points.map((p) => `- ${p}`)] : []),
      ...(activeTopic.examples ? ["", "### Examples", ...activeTopic.examples.map((e) => `* ${e}`)] : []),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full bg-base-950 overflow-hidden animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-750/70 p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToPdf}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:border-accent-500/40 hover:bg-base-800 hover:text-white transition-all focus-ring"
          >
            <ArrowLeft size={14} />
            <span>Back to PDF</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <NotebookPen size={15} />
            <span>Digital Study Notes</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTopic && (
            <>
              <button
                type="button"
                onClick={() => onAskAi(`Explain the topic "${activeTopic.title}" from ${doc.filename} in greater detail with real-world examples.`)}
                className="flex items-center gap-1.5 rounded-xl bg-accent-600/20 border border-accent-500/40 px-3 py-1.5 text-xs font-semibold text-accent-300 hover:bg-accent-600/30 transition-all focus-ring"
              >
                <MessageSquare size={13} />
                <span>Ask AI About Topic</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-white transition-colors focus-ring"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy Topic"}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={loadNotes}
            disabled={loading}
            className="rounded-xl border border-base-750 bg-base-850 p-1.5 text-ink-400 hover:text-white transition-colors focus-ring disabled:opacity-40"
            title="Regenerate notes"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shadow-glow" />
          <p className="text-xs font-medium">Generating digital study notebook...</p>
        </div>
      )}

      {error && (
        <div className="p-6">
          <ErrorState message={error} onRetry={loadNotes} />
        </div>
      )}

      {notes && !loading && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Topics Sidebar */}
          <div className="w-56 sm:w-64 border-r border-base-750/70 overflow-y-auto p-3 space-y-1.5 shrink-0 bg-base-900/60">
            <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Topics ({notes.topics.length})
            </span>
            {notes.topics.map((t, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all focus-ring ${
                    isActive
                      ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                      : "text-ink-300 hover:bg-base-800 hover:text-white"
                  }`}
                >
                  <span className="truncate">{idx + 1}. {t.title}</span>
                  {isActive && <ChevronRight size={14} className="shrink-0 text-accent-400" />}
                </button>
              );
            })}
          </div>

          {/* Right: Topic Detailed Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {activeTopic && (
              <div className="space-y-4 max-w-3xl">
                <div className="space-y-1 border-b border-base-750/50 pb-3">
                  <span className="text-[10px] font-mono font-bold text-accent-400 uppercase">
                    Topic {activeIndex + 1} of {notes.topics.length}
                  </span>
                  <h2 className="text-lg font-bold text-ink-50">{activeTopic.title}</h2>
                </div>

                {/* Definition */}
                <div className="rounded-xl border border-base-750 bg-base-900/80 p-4 space-y-1.5">
                  <h3 className="text-xs font-bold text-accent-300 uppercase tracking-wide">
                    Definition
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-200 leading-relaxed">
                    {activeTopic.definition}
                  </p>
                </div>

                {/* Explanation */}
                <div className="rounded-xl border border-base-750 bg-base-900/80 p-4 space-y-1.5">
                  <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                    Detailed Explanation
                  </h3>
                  <AIResponseRenderer content={activeTopic.explanation} />
                </div>

                {/* Key Points */}
                {activeTopic.key_points && activeTopic.key_points.length > 0 && (
                  <div className="rounded-xl border border-base-750 bg-base-900/80 p-4 space-y-2">
                    <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      Key Points to Remember
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-ink-200">
                      {activeTopic.key_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Examples */}
                {activeTopic.examples && activeTopic.examples.length > 0 && (
                  <div className="rounded-xl border border-base-750 bg-base-900/80 p-4 space-y-2">
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Practical Examples
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-ink-300">
                      {activeTopic.examples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400">💡</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
