import React, { useState } from "react";
import {
  GraduationCap,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
} from "lucide-react";
import type { Document, QuizQuestion, QuizResult } from "../../../types";
import * as contentService from "../../../services/contentService";
import { getErrorMessage } from "../../../services/apiClient";
import ErrorState from "../../ErrorState";

interface WorkspaceQuizViewProps {
  document: Document;
  onBackToPdf: () => void;
  onAskAi: (prompt: string) => void;
}

export default function WorkspaceQuizView({
  document: doc,
  onBackToPdf,
  onAskAi,
}: WorkspaceQuizViewProps) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await contentService.startQuiz(doc.id, numQuestions);
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
      setError(getErrorMessage(err, "Couldn't submit your quiz answers."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectOption(qId: string, optIdx: number) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  }

  const currentQ = questions[current] || null;

  return (
    <div className="flex flex-col h-full bg-base-950 overflow-y-auto p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Top Header */}
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
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <GraduationCap size={15} />
            <span>Interactive Practice Quiz</span>
          </div>
        </div>

        {quizId && (
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-white transition-colors focus-ring"
          >
            <RotateCcw size={13} />
            <span>Restart Quiz</span>
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={handleStart} />}

      {/* Start Quiz Splash if no quiz active */}
      {!quizId && !loading && !result && (
        <div className="my-auto mx-auto max-w-md text-center space-y-4 py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-glow">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-ink-50">
            Practice What You Learned
          </h2>
          <p className="text-xs text-ink-400 leading-relaxed">
            Test your comprehension of "{doc.filename}" with a personalized AI quiz grounded directly in this document.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="rounded-xl border border-base-750 bg-base-900 px-3 py-2 text-xs font-semibold text-ink-200 focus-ring"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
            </select>

            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-5 py-2 text-xs font-semibold text-white shadow-glow hover:scale-[1.02] transition-all focus-ring"
            >
              <span>Start Quiz</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shadow-glow" />
          <p className="text-xs font-medium">Preparing practice questions from document...</p>
        </div>
      )}

      {/* Ongoing Quiz Interface */}
      {quizId && !result && currentQ && (
        <div className="max-w-2xl mx-auto w-full space-y-5">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-ink-400">
              <span className="font-semibold text-accent-300">
                Question {current + 1} of {questions.length}
              </span>
              <span>{Math.round(((current + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-amber-400 transition-all duration-300"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Question Card */}
          <div className="rounded-2xl border border-base-750 bg-base-900/80 p-5 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-ink-50 leading-relaxed">
              {currentQ.prompt}
            </h3>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-xs font-medium transition-all focus-ring ${
                      isSelected
                        ? "border-accent-500 bg-accent-600/20 text-white ring-1 ring-accent-500/50"
                        : "border border-base-750 bg-base-850 hover:border-base-700 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                        isSelected ? "bg-accent-500 text-white" : "bg-base-800 text-ink-400"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation & Submit controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs text-ink-300 hover:text-white disabled:opacity-30 transition-colors"
            >
              Previous
            </button>

            {current < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="rounded-xl bg-accent-600 px-4 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-glow hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-40"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Results View */}
      {result && (
        <div className="max-w-2xl mx-auto w-full space-y-6 animate-fade-in">
          <div className="rounded-2xl border border-accent-500/40 bg-gradient-to-b from-base-900 to-base-950 p-6 text-center space-y-3 shadow-glow">
            <Award size={36} className="mx-auto text-amber-400" />
            <h3 className="text-lg font-bold text-ink-50">Quiz Complete!</h3>
            <p className="text-3xl font-extrabold text-accent-300">
              {result.accuracy}%
            </p>
            <p className="text-xs text-ink-400">
              {result.score} of {result.total} questions correct
            </p>
          </div>

          {/* Detailed Question Review */}
          {result.review && result.review.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Answer Review
              </h4>
              {result.review.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 space-y-2 ${
                    item.is_correct
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-200">Question {idx + 1}</span>
                    <span
                      className={`font-semibold ${
                        item.is_correct ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {item.is_correct ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-100 font-medium">{item.prompt}</p>
                  <div className="text-xs space-y-1 pt-1 text-ink-300">
                    <p>
                      <span className="text-emerald-400 font-semibold">Correct Answer: </span>
                      {item.options[item.correct_index]}
                    </p>
                    {item.explanation && (
                      <p className="text-[11px] text-ink-400 pt-1 border-t border-base-800">
                        {item.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
            >
              <RotateCcw size={13} />
              <span>Retake Quiz</span>
            </button>
            <button
              type="button"
              onClick={onBackToPdf}
              className="rounded-xl border border-base-750 bg-base-850 px-4 py-2 text-xs font-semibold text-ink-200 hover:text-white transition-colors"
            >
              Return to PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
