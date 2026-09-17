import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ListChecks,
  Sparkles,
  Award,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import DocumentSelector, { useDocuments } from "../components/DocumentSelector";
import { EmptyState, SkeletonLine } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import AIResponseRenderer from "../components/AIResponseRenderer";
import * as contentService from "../services/contentService";
import { getErrorMessage } from "../services/apiClient";
import type { Difficulty, GeneratedQuestion, QuestionType } from "../types";

const TYPE_LABELS: Record<QuestionType, string> = {
  mixed: "Mixed (MCQ + Short + Long)",
  mcq: "Multiple Choice (MCQ)",
  short: "Short Answer Questions",
  long: "Long Conceptual Questions",
};

export default function QuestionGeneratorPage() {
  const [searchParams] = useSearchParams();
  const { documents, error: docsError, reload } = useDocuments();

  const [documentId, setDocumentId] = useState<string | null>(searchParams.get("document"));
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState<QuestionType>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [marks, setMarks] = useState(5);

  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDoc = documents?.find((d) => d.id === documentId) || null;

  async function handleGenerate() {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    setQuestions(null);
    setRevealed({});
    try {
      const res = await contentService.generateQuestions({
        documentId,
        numQuestions,
        questionType,
        difficulty,
        marks,
      });
      setQuestions(res);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't generate exam questions right now."));
    } finally {
      setLoading(false);
    }
  }

  function handleToggleAllAnswers() {
    if (!questions) return;
    const allRevealed = Object.keys(revealed).length === questions.length && Object.values(revealed).every(Boolean);
    if (allRevealed) {
      setRevealed({});
    } else {
      const all: Record<number, boolean> = {};
      questions.forEach((_, i) => (all[i] = true));
      setRevealed(all);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Question Generator"
        subtitle={
          selectedDoc
            ? `Exam preparation paper from ${selectedDoc.filename}`
            : "Generate curriculum-aligned exam questions with marking criteria."
        }
      />

      {docsError && <ErrorState message={docsError} onRetry={reload} />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr] items-start">
        {/* Left Controls Panel */}
        <div className="rounded-3xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 shadow-card space-y-5 sticky top-20">
          <div className="flex items-center gap-2 pb-3 border-b border-base-750/70">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
              <ListChecks size={16} />
            </div>
            <h2 className="text-sm font-bold text-ink-100 uppercase tracking-wider">
              Exam Parameters
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-300">
                Source Document
              </label>
              <DocumentSelector
                documents={documents || []}
                selectedId={documentId}
                onSelect={setDocumentId}
              />
            </div>

            <div>
              <label htmlFor="num-q" className="mb-1.5 block text-xs font-semibold text-ink-300">
                Number of Questions
              </label>
              <select
                id="num-q"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full rounded-xl border border-base-750 bg-base-950 px-3 py-2 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} Questions
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="q-type" className="mb-1.5 block text-xs font-semibold text-ink-300">
                Question Format
              </label>
              <select
                id="q-type"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full rounded-xl border border-base-750 bg-base-950 px-3 py-2 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
              >
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="mb-1.5 block text-xs font-semibold text-ink-300">
                Difficulty Level
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-xl border border-base-750 bg-base-950 px-3 py-2 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
              >
                <option value="easy">Easy (Foundational recall)</option>
                <option value="medium">Medium (Analytical & conceptual)</option>
                <option value="hard">Hard (Advanced application)</option>
              </select>
            </div>

            <div>
              <label htmlFor="marks" className="mb-1.5 block text-xs font-semibold text-ink-300">
                Marks per Question
              </label>
              <select
                id="marks"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full rounded-xl border border-base-750 bg-base-950 px-3 py-2 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
              >
                {[2, 5, 10].map((m) => (
                  <option key={m} value={m}>
                    {m} Marks each
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!documentId || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-accent-600 to-accent-700 py-3 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 focus-ring"
            >
              <Sparkles size={16} />
              <span>{loading ? "Generating Exam..." : "Generate Questions"}</span>
            </button>
          </div>
        </div>

        {/* Right Exam Paper Canvas */}
        <div className="space-y-6">
          {error && <ErrorState message={error} onRetry={handleGenerate} />}

          {!questions && !loading && !error && (
            <EmptyState
              icon={FileQuestion}
              title="Exam paper ready to generate"
              description="Choose your source document, question format, and difficulty on the left, then click Generate to create an exam-ready practice set."
            />
          )}

          {loading && (
            <div className="rounded-3xl border border-base-750 bg-base-900/60 p-8 space-y-6 animate-pulse-soft">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-accent-500/30 animate-spin" />
                <p className="text-sm font-semibold text-accent-300">
                  Synthesizing exam questions, options, and model answers...
                </p>
              </div>
              <div className="space-y-4">
                <SkeletonLine className="w-full h-16 rounded-2xl" />
                <SkeletonLine className="w-full h-16 rounded-2xl" />
                <SkeletonLine className="w-full h-16 rounded-2xl" />
              </div>
            </div>
          )}

          {questions && !loading && (
            <div className="space-y-4 animate-fade-in">
              {/* Paper Top Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-750/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink-100">
                    Questions ({questions.length})
                  </span>
                  <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-300">
                    Total Marks: {questions.reduce((acc, q) => acc + q.marks, 0)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAllAnswers}
                    className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:border-accent-500/40 hover:text-white transition-all focus-ring"
                  >
                    <Eye size={13} />
                    <span>Toggle Answers</span>
                  </button>
                </div>
              </div>

              {/* Clean Exam Question Paper List */}
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const isRevealed = revealed[i];
                  return (
                    <article
                      key={i}
                      className="rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-5 shadow-card space-y-4 hover:border-base-700 transition-colors"
                    >
                      {/* Question Prompt Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-base-800 text-xs font-bold text-accent-300 border border-base-750">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0 text-sm sm:text-base font-semibold text-ink-50 pt-0.5">
                            <AIResponseRenderer content={q.prompt} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full border border-base-750 bg-base-850 px-2.5 py-0.5 text-xs font-semibold text-ink-300">
                            {q.marks} {q.marks === 1 ? "mark" : "marks"}
                          </span>
                          <span className="rounded-full border border-base-750 bg-base-850 px-2 py-0.5 text-[10px] uppercase font-bold text-accent-400">
                            {q.type}
                          </span>
                        </div>
                      </div>

                      {/* Multiple Choice Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-9">
                          {q.options.map((opt, oi) => (
                            <div
                              key={oi}
                              className="flex items-start gap-3 rounded-xl border border-base-750/70 bg-base-950/60 p-3 text-xs sm:text-sm text-ink-200"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-base-800 font-mono text-xs font-bold text-accent-300 border border-base-750">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <AIResponseRenderer content={opt} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-base-750/50 pt-3 pl-9">
                        <button
                          type="button"
                          onClick={() => setRevealed((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                        >
                          {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{isRevealed ? "Hide Model Answer" : "Show Model Answer"}</span>
                        </button>

                        {q.source_page && (
                          <span className="text-[11px] text-ink-500">
                            Ground truth: Page {q.source_page}
                          </span>
                        )}
                      </div>

                      {/* Model Answer Drawer */}
                      {isRevealed && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 ml-9 space-y-1.5 animate-fade-in">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 size={14} />
                            <span>Model Answer & Solution</span>
                          </div>
                          <div className="text-xs sm:text-sm text-ink-100 leading-relaxed pt-1">
                            <AIResponseRenderer content={q.answer} />
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
