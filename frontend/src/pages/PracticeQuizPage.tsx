import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Sparkles,
  RotateCcw,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import DocumentSelector, { useDocuments } from "../components/DocumentSelector";
import { EmptyState, SkeletonLine } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import AIResponseRenderer from "../components/AIResponseRenderer";
import * as contentService from "../services/contentService";
import { getErrorMessage } from "../services/apiClient";
import type { QuizQuestion, QuizResult } from "../types";

export default function PracticeQuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { documents, error: docsError, reload } = useDocuments();

  const [documentId, setDocumentId] = useState<string | null>(searchParams.get("document"));
  const [numQuestions, setNumQuestions] = useState(10);

  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDoc = documents?.find((d) => d.id === documentId) || null;

  async function handleStart() {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await contentService.startQuiz(documentId, numQuestions);
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setCurrent(0);
      setAnswers({});
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't generate the quiz. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!quizId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await contentService.submitQuiz(quizId, answers);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't submit your quiz. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setQuizId(null);
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  const activeQuestion = questions[current] || null;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  // ---------- 1. Quiz Results & Review View ----------
  if (result) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Score Card Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-base-750 bg-gradient-to-br from-base-900 via-base-900 to-accent-700/10 p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400 border border-accent-500/30 shadow-glow mb-4">
            <Award size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-50">
            Quiz Completed!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-400">
            Here is your performance breakdown for this document.
          </p>

          <div className="mt-6 flex items-baseline justify-center gap-1 font-extrabold text-accent-400">
            <span className="text-6xl sm:text-7xl">{result.score}</span>
            <span className="text-3xl text-ink-500">/{result.total}</span>
          </div>

          <div className="mt-8 flex justify-center gap-6 sm:gap-12 text-sm border-t border-base-750/70 pt-6">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{result.score}</p>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mt-0.5">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{result.total - result.score}</p>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mt-0.5">Incorrect</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-100">{result.accuracy}%</p>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mt-0.5">Accuracy</p>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all focus-ring"
          >
            <RotateCcw size={15} />
            <span>Take Another Quiz</span>
          </button>
        </div>

        {/* Answer Review Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-100">Review Answers</h2>
            <span className="text-xs text-ink-400">
              {result.review.length} Questions Reviewed
            </span>
          </div>

          <div className="space-y-4">
            {result.review.map((q, i) => (
              <div
                key={q.id}
                className="rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 shadow-card space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      q.is_correct
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {q.is_correct ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <div className="flex-1 text-sm sm:text-base font-semibold text-ink-100">
                    <span className="mr-2 text-ink-400">{i + 1}.</span>
                    <AIResponseRenderer content={q.prompt} />
                  </div>
                </div>

                <div className="space-y-2 pl-9">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.correct_index;
                    const isSelected = oi === q.selected_index;
                    return (
                      <div
                        key={oi}
                        className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border transition-all ${
                          isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold"
                            : isSelected
                            ? "border-red-500/40 bg-red-500/10 text-red-300 font-semibold"
                            : "border-base-750/70 bg-base-950/60 text-ink-300"
                        }`}
                      >
                        <span className="font-mono text-xs mt-0.5 font-bold">{String.fromCharCode(65 + oi)}.</span>
                        <div className="flex-1 min-w-0">
                          <AIResponseRenderer content={opt} />
                          {isCorrect && (
                            <span className="ml-2 text-xs font-semibold text-emerald-400">
                              ✓ Correct Answer
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="ml-2 text-xs font-semibold text-red-400">
                              Your selection
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="rounded-xl border border-base-750/80 bg-base-950/80 p-4 ml-9 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Explanation
                    </span>
                    <div className="text-xs sm:text-sm text-ink-300 leading-relaxed pt-0.5">
                      <AIResponseRenderer content={q.explanation} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- 2. Setup / Start View ----------
  if (!quizId) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="Practice Quiz"
          subtitle="Test your comprehension and exam readiness on any uploaded study document."
        />

        {docsError && <ErrorState message={docsError} onRetry={reload} />}
        {error && <ErrorState message={error} onRetry={handleStart} />}

        <div className="rounded-3xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 sm:p-10 shadow-card space-y-6">
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-300">
                1. Select Document
              </label>
              <DocumentSelector
                documents={documents || []}
                selectedId={documentId}
                onSelect={setDocumentId}
              />
            </div>

            <div>
              <label htmlFor="quiz-n" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-300">
                2. Number of Questions
              </label>
              <select
                id="quiz-n"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full max-w-xs rounded-xl border border-base-750 bg-base-950 px-3.5 py-2.5 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} Questions
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-base-750/70">
            <button
              type="button"
              onClick={handleStart}
              disabled={!documentId || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-accent-600 to-accent-700 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 focus-ring"
            >
              <Sparkles size={16} />
              <span>{loading ? "Generating Quiz Questions..." : "Start Practice Quiz"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 3. Active Immersive Test Session View ----------
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Test Navigation Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-400">
            Practice Session
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-ink-50">
            Question {current + 1} of {questions.length}
          </h1>
        </div>

        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-base-750 bg-base-850 px-3.5 py-2 text-xs font-semibold text-ink-300 hover:text-white hover:border-base-700 transition-colors focus-ring"
        >
          Exit Quiz
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-base-850 border border-base-750/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-500 to-sky-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px] items-start">
        {/* Center Question & Options Box */}
        <div className="rounded-3xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-base sm:text-lg font-semibold text-ink-50 leading-relaxed">
            <AIResponseRenderer content={activeQuestion?.prompt || ""} />
          </div>

          <div className="space-y-3" role="radiogroup" aria-label="Answer options">
            {activeQuestion?.options.map((opt, oi) => {
              const selected = answers[activeQuestion.id] === oi;
              return (
                <button
                  key={oi}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [activeQuestion.id]: oi }))}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left text-xs sm:text-sm transition-all focus-ring ${
                    selected
                      ? "border-accent-500 bg-accent-600/15 text-ink-50 shadow-glow-sm ring-1 ring-accent-500/50"
                      : "border-base-750 bg-base-950/80 text-ink-300 hover:border-base-700 hover:bg-base-850"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                      selected
                        ? "bg-accent-500 text-white shadow-sm"
                        : "bg-base-850 text-ink-400 border border-base-750"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <AIResponseRenderer content={opt} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-between border-t border-base-750/70 pt-6">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 rounded-xl border border-base-750 bg-base-850 px-4 py-2 text-xs sm:text-sm font-semibold text-ink-300 hover:bg-base-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all focus-ring"
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            {current < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all focus-ring"
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 transition-all focus-ring"
              >
                <CheckCircle2 size={15} />
                <span>{submitting ? "Submitting Answers..." : "Submit Quiz"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Side Question Navigator */}
        <aside className="rounded-2xl border border-base-750 bg-base-900/80 p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-300">
              Navigator
            </h2>
            <span className="text-xs text-accent-400 font-semibold">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => {
              const answered = answers[q.id] !== undefined;
              const isCurrent = i === current;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all focus-ring ${
                    isCurrent
                      ? "bg-accent-500 text-white shadow-glow-sm"
                      : answered
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-base-950 text-ink-500 border border-base-750 hover:bg-base-800 hover:text-ink-200"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-base-750/70 pt-3 text-[11px] text-ink-400">
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Answered ({answeredCount})
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-500" /> Current Question
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-base-750" /> Unanswered ({questions.length - answeredCount})
            </p>
          </div>
        </aside>
      </div>

      {error && <ErrorState message={error} onRetry={handleSubmit} />}
    </div>
  );
}
