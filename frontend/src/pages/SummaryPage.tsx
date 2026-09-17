import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Sparkles,
  BookOpen,
  ListOrdered,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import DocumentSelector, { useDocuments } from "../components/DocumentSelector";
import { EmptyState, SkeletonLine } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import AIResponseRenderer from "../components/AIResponseRenderer";
import * as contentService from "../services/contentService";
import { getErrorMessage } from "../services/apiClient";
import type { SummaryData } from "../types";

type SummaryTab = "overview" | "main_topics" | "key_concepts" | "key_takeaways";

export default function SummaryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { documents, error: docsError, reload } = useDocuments();

  const [documentId, setDocumentId] = useState<string | null>(searchParams.get("document"));
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activeTab, setActiveTab] = useState<SummaryTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDoc = documents?.find((d) => d.id === documentId) || null;

  async function generate(id: string) {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const data = await contentService.generateSummary(id);
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't generate summary right now."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (documentId) {
      generate(documentId);
    }
  }, [documentId]);

  async function handleCopySummary() {
    if (!summary) return;
    const text = [
      `# Executive Summary: ${selectedDoc?.filename || "Document"}`,
      "",
      summary.overview,
      "",
      "## Main Topics",
      ...summary.main_topics.map((t, i) => `${i + 1}. ${t}`),
      "",
      "## Key Concepts",
      ...summary.key_concepts.map((c, i) => `• ${c}`),
      "",
      "## Key Takeaways",
      ...summary.key_takeaways.map((k, i) => `✓ ${k}`),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Structured Summary"
        subtitle={selectedDoc ? `Reading summary of ${selectedDoc.filename}` : "A structured executive overview of your document."}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DocumentSelector
              documents={documents || []}
              selectedId={documentId}
              onSelect={(id) => {
                setDocumentId(id);
                navigate(`/app/summary?document=${id}`, { replace: true });
              }}
            />
            {summary && !loading && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-2 text-xs font-semibold text-ink-300 hover:border-accent-500/40 hover:text-ink-100 transition-all focus-ring"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => documentId && generate(documentId)}
                  className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-2 text-xs font-semibold text-ink-300 hover:border-accent-500/40 hover:text-ink-100 transition-all focus-ring"
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
          icon={BookOpen}
          title="Select a document to read its summary"
          description="Choose any uploaded textbook, notes, or paper from the dropdown above to generate an executive overview."
        />
      )}

      {loading && (
        <div className="rounded-3xl border border-base-750 bg-base-900/60 p-8 space-y-6 animate-pulse-soft">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-accent-500/30 animate-spin" />
            <p className="text-sm font-semibold text-accent-300">
              Analyzing document & synthesizing executive reading summary...
            </p>
          </div>
          <div className="space-y-3">
            <SkeletonLine className="w-full h-5" />
            <SkeletonLine className="w-5/6 h-5" />
            <SkeletonLine className="w-3/4 h-5" />
          </div>
        </div>
      )}

      {summary && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Navigation Reading Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-base-750/70 pb-3">
            {[
              { id: "overview", label: "Overview", icon: BookOpen, count: undefined },
              { id: "main_topics", label: "Main Topics", icon: ListOrdered, count: summary.main_topics.length },
              { id: "key_concepts", label: "Key Concepts", icon: Lightbulb, count: summary.key_concepts.length },
              { id: "key_takeaways", label: "Key Takeaways", icon: CheckCircle2, count: summary.key_takeaways.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SummaryTab)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all focus-ring ${
                    isActive
                      ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                      : "text-ink-400 hover:bg-base-850 hover:text-ink-100"
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1 rounded-full bg-base-800 px-2 py-0.5 text-[10px] text-ink-300">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Container: Designed as a reading experience */}
          <div className="rounded-3xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 sm:p-10 shadow-card">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-accent-500/15 px-2.5 py-1 text-xs font-semibold text-accent-300">
                    Executive Overview
                  </span>
                  <span className="text-xs text-ink-500">Comprehensive synthesis</span>
                </div>
                <div className="pt-2 text-base text-ink-100 leading-relaxed font-normal">
                  <AIResponseRenderer content={summary.overview} />
                </div>
              </div>
            )}

            {activeTab === "main_topics" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
                    Core Subject Topics
                  </h3>
                  <span className="text-xs text-ink-500">{summary.main_topics.length} topics identified</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  {summary.main_topics.map((topic, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-base-750 bg-base-950/60 p-5 space-y-2 hover:border-accent-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-600/20 text-xs font-bold text-accent-400">
                          {i + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-ink-100">Topic {i + 1}</h4>
                      </div>
                      <div className="text-sm text-ink-300 leading-relaxed pl-8">
                        <AIResponseRenderer content={topic} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "key_concepts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
                    Key Concepts & Explanations
                  </h3>
                  <span className="text-xs text-ink-500">{summary.key_concepts.length} concepts</span>
                </div>
                <div className="space-y-3.5 pt-2">
                  {summary.key_concepts.map((concept, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 rounded-2xl border border-base-750 bg-base-950/60 p-5 hover:border-sky-500/40 transition-colors"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                        <Lightbulb size={16} />
                      </div>
                      <div className="flex-1 min-w-0 text-sm text-ink-200 leading-relaxed">
                        <AIResponseRenderer content={concept} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "key_takeaways" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
                    Key Learning Takeaways
                  </h3>
                  <span className="text-xs text-ink-500">{summary.key_takeaways.length} points to remember</span>
                </div>
                <div className="space-y-3 pt-2">
                  {summary.key_takeaways.map((takeaway, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3.5 rounded-2xl border border-base-750 bg-base-950/60 p-4 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="flex-1 min-w-0 text-sm text-ink-200 leading-relaxed">
                        <AIResponseRenderer content={takeaway} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
