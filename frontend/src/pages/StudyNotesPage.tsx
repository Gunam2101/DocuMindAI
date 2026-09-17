import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  NotebookPen,
  Sparkles,
  Copy,
  Check,
  Download,
  BookOpen,
  Bookmark,
  ChevronRight,
  RotateCcw,
  Star,
} from "lucide-react";
import DocumentSelector, { useDocuments } from "../components/DocumentSelector";
import { EmptyState, SkeletonLine } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import AIResponseRenderer from "../components/AIResponseRenderer";
import * as contentService from "../services/contentService";
import { getErrorMessage } from "../services/apiClient";
import type { NotesData, NoteTopic } from "../types";

function notesToMarkdown(title: string, topics: NoteTopic[]): string {
  return [
    `# Study Notes: ${title}`,
    "",
    ...topics.map((t, idx) => {
      const parts = [
        `## ${idx + 1}. ${t.title}`,
        "",
        `### Definition`,
        t.definition,
        "",
        `### Explanation`,
        t.explanation,
      ];
      if (t.key_points && t.key_points.length > 0) {
        parts.push("", `### Key Points`, ...t.key_points.map((p) => `- ${p}`));
      }
      if (t.examples && t.examples.length > 0) {
        parts.push("", `### Examples`, ...t.examples.map((e) => `* ${e}`));
      }
      if (t.source_page) {
        parts.push("", `*Source: Page ${t.source_page}*`);
      }
      return parts.join("\n");
    }),
  ].join("\n\n---\n\n");
}

export default function StudyNotesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { documents, error: docsError, reload } = useDocuments();

  const [documentId, setDocumentId] = useState<string | null>(searchParams.get("document"));
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDoc = documents?.find((d) => d.id === documentId) || null;

  async function generate(id: string) {
    setLoading(true);
    setError(null);
    setNotes(null);
    setActiveIndex(0);
    try {
      const res = await contentService.generateNotes(id);
      setNotes(res);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't generate study notes right now."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (documentId) {
      generate(documentId);
    }
  }, [documentId]);

  const activeTopic = notes?.topics[activeIndex] || null;

  async function handleCopyActive() {
    if (!activeTopic) return;
    const text = notesToMarkdown(activeTopic.title, [activeTopic]);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadAll() {
    if (!notes || !selectedDoc) return;
    const md = notesToMarkdown(selectedDoc.filename, notes.topics);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc.filename.replace(/\.pdf$/i, "")}-study-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Digital Study Notebook"
        subtitle={selectedDoc ? `Modular study notes for ${selectedDoc.filename}` : "Concept definitions, explanations, examples, and key points."}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DocumentSelector
              documents={documents || []}
              selectedId={documentId}
              onSelect={(id) => {
                setDocumentId(id);
                navigate(`/app/notes?document=${id}`, { replace: true });
              }}
            />
            {notes && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-accent-500/40 hover:text-white transition-all focus-ring"
                >
                  <Download size={14} className="text-accent-400" />
                  <span>Download (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => documentId && generate(documentId)}
                  className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-accent-500/40 hover:text-white transition-all focus-ring"
                >
                  <RotateCcw size={14} />
                  <span>Regenerate</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {docsError && <ErrorState message={docsError} onRetry={reload} />}
      {error && <ErrorState message={error} onRetry={() => documentId && generate(documentId)} />}

      {!documentId && !docsError && (
        <EmptyState
          icon={NotebookPen}
          title="Select a document to view study notes"
          description="Choose an uploaded document to extract organized topic definitions, explanations, and practical examples."
        />
      )}

      {loading && (
        <div className="rounded-3xl border border-base-750 bg-base-900/60 p-8 space-y-6 animate-pulse-soft">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-accent-500/30 animate-spin" />
            <p className="text-sm font-semibold text-accent-300">
              Structuring notebook topics, definitions, and examples...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            <div className="space-y-2">
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
            </div>
            <div className="space-y-4">
              <SkeletonLine className="h-8 w-1/3" />
              <SkeletonLine className="h-24 w-full" />
              <SkeletonLine className="h-32 w-full" />
            </div>
          </div>
        </div>
      )}

      {notes && !loading && notes.topics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start animate-fade-in">
          {/* Left Topic Index Navigator */}
          <aside className="rounded-2xl border border-base-750 bg-base-900/80 p-4 space-y-2 shadow-card sticky top-20">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-base-750/70">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Topics ({notes.topics.length})
              </span>
              <Bookmark size={14} className="text-accent-400" />
            </div>

            <nav className="space-y-1 pt-1 max-h-[70vh] overflow-y-auto">
              {notes.topics.map((topic, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm font-medium transition-all focus-ring ${
                      isActive
                        ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                        : "text-ink-400 hover:bg-base-850 hover:text-ink-100 border border-transparent"
                    }`}
                  >
                    <span className="truncate pr-2">{topic.title}</span>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-transform ${
                        isActive ? "text-accent-400 translate-x-0.5" : "text-ink-500"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Center Digital Notebook Canvas */}
          {activeTopic && (
            <article className="rounded-3xl border border-base-750 bg-gradient-to-b from-base-900 via-base-900 to-base-950 p-6 sm:p-10 shadow-card space-y-8">
              {/* Topic Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-base-750/70 pb-5">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-accent-400">
                    Topic #{activeIndex + 1} of {notes.topics.length}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-50">
                    {activeTopic.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyActive}
                    className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:border-accent-500/40 hover:text-white transition-all focus-ring"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy Note"}</span>
                  </button>
                </div>
              </div>

              {/* 1. Definition Card */}
              <section className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent-300">
                  Definition
                </h3>
                <div className="text-sm sm:text-base text-ink-100 leading-relaxed font-medium">
                  <AIResponseRenderer content={activeTopic.definition} />
                </div>
              </section>

              {/* 2. Core Explanation */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                  Explanation
                </h3>
                <div className="text-sm sm:text-base text-ink-200 leading-relaxed">
                  <AIResponseRenderer content={activeTopic.explanation} />
                </div>
              </section>

              {/* 3. Important Points (Amber highlight card) */}
              {activeTopic.key_points && activeTopic.key_points.length > 0 && (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star size={15} className="text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Important Points to Remember
                    </h3>
                  </div>
                  <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1">
                    {activeTopic.key_points.map((pt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl bg-base-900/80 border border-amber-500/15 p-3 text-xs sm:text-sm text-ink-200"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        <div className="flex-1 min-w-0">
                          <AIResponseRenderer content={pt} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 4. Practical Examples */}
              {activeTopic.examples && activeTopic.examples.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Practical Applications & Examples
                  </h3>
                  <div className="space-y-2.5">
                    {activeTopic.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-base-750 bg-base-950/60 p-4 text-xs sm:text-sm text-ink-200 leading-relaxed"
                      >
                        <AIResponseRenderer content={ex} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Source attribution */}
              {activeTopic.source_page && (
                <div className="pt-4 border-t border-base-750/50 flex items-center justify-between text-xs text-ink-500">
                  <span>Ground truth from original document</span>
                  <span className="rounded-md bg-base-800 px-2 py-0.5 text-accent-300">
                    Page {activeTopic.source_page}
                  </span>
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
