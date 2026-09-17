import React, { useEffect, useState } from "react";
import {
  FileText,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import type { Document, SummaryData } from "../../../types";
import * as contentService from "../../../services/contentService";
import { getErrorMessage } from "../../../services/apiClient";
import AIResponseRenderer from "../../AIResponseRenderer";
import ErrorState from "../../ErrorState";

interface WorkspaceSummaryViewProps {
  document: Document;
  onBackToPdf: () => void;
  onAskAi: (prompt: string) => void;
}

type SummaryTab = "overview" | "main_topics" | "key_concepts" | "key_takeaways";

export default function WorkspaceSummaryView({
  document: doc,
  onBackToPdf,
  onAskAi,
}: WorkspaceSummaryViewProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activeTab, setActiveTab] = useState<SummaryTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const data = await contentService.generateSummary(doc.id);
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate document summary."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [doc.id]);

  async function handleCopy() {
    if (!summary) return;
    const text = [
      `# Executive Summary: ${doc.filename}`,
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

  const TABS = [
    { id: "overview" as SummaryTab, label: "Overview", count: null },
    { id: "main_topics" as SummaryTab, label: "Main Topics", count: summary?.main_topics.length },
    { id: "key_concepts" as SummaryTab, label: "Key Concepts", count: summary?.key_concepts.length },
    { id: "key_takeaways" as SummaryTab, label: "Takeaways", count: summary?.key_takeaways.length },
  ];

  return (
    <div className="flex flex-col h-full bg-base-950 overflow-y-auto p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-750/70 pb-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToPdf}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:border-accent-500/40 hover:bg-base-800 hover:text-white transition-all focus-ring"
          >
            <ArrowLeft size={14} />
            <span>Back to PDF</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-300">
            <FileText size={15} />
            <span>Document Summary</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary && (
            <>
              <button
                type="button"
                onClick={() => onAskAi(`Based on the document summary of "${doc.filename}", explain how the main topics connect together.`)}
                className="flex items-center gap-1.5 rounded-xl bg-accent-600/20 border border-accent-500/40 px-3 py-1.5 text-xs font-semibold text-accent-300 hover:bg-accent-600/30 transition-all focus-ring"
              >
                <MessageSquare size={13} />
                <span>Ask AI About Summary</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-white transition-colors focus-ring"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="rounded-xl border border-base-750 bg-base-850 p-1.5 text-ink-400 hover:text-white transition-colors focus-ring disabled:opacity-40"
            title="Regenerate summary"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shadow-glow" />
          <p className="text-xs font-medium">Synthesizing document summary...</p>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={loadSummary} />}

      {summary && !loading && (
        <div className="space-y-5">
          {/* Tabs bar */}
          <div className="flex items-center gap-2 border-b border-base-750/60 pb-2 overflow-x-auto">
            {TABS.map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                  activeTab === id
                    ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                    : "text-ink-400 hover:text-ink-200 hover:bg-base-850"
                }`}
              >
                <span>{label}</span>
                {count !== null && (
                  <span className="rounded-full bg-base-800 px-1.5 py-0.2 text-[10px] text-ink-300">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <div className="rounded-2xl border border-base-750/70 bg-base-900/60 p-5 shadow-card animate-fade-in">
            {activeTab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink-100">Executive Overview</h3>
                <AIResponseRenderer content={summary.overview} />
              </div>
            )}

            {activeTab === "main_topics" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink-100">Core Document Topics</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {summary.main_topics.map((topic, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-base-750 bg-base-850/80 p-3.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-600/20 text-accent-300 text-xs font-bold font-mono">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm text-ink-200 font-medium leading-relaxed">
                        {topic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "key_concepts" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink-100">Fundamental Concepts</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {summary.key_concepts.map((concept, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-base-750 bg-base-850/80 p-3.5"
                    >
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-sky-400 mt-1.5" />
                      <span className="text-xs sm:text-sm text-ink-200 leading-relaxed font-medium">
                        {concept}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "key_takeaways" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink-100">Essential Takeaways</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {summary.key_takeaways.map((takeaway, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-base-750 bg-base-850/80 p-3.5"
                    >
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 mt-1.5" />
                      <span className="text-xs sm:text-sm text-ink-200 leading-relaxed font-medium">
                        {takeaway}
                      </span>
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
