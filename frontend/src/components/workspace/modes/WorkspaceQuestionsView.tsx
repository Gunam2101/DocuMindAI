import React, { useState } from "react";
import {
  ListChecks,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import type { Document, Difficulty, QuestionType, GeneratedQuestion } from "../../../types";
import * as contentService from "../../../services/contentService";
import { getErrorMessage } from "../../../services/apiClient";
import AIResponseRenderer from "../../AIResponseRenderer";
import ErrorState from "../../ErrorState";

interface WorkspaceQuestionsViewProps {
  document: Document;
  onBackToPdf: () => void;
  onAskAi: (prompt: string) => void;
}

export default function WorkspaceQuestionsView({
  document: doc,
  onBackToPdf,
  onAskAi,
}: WorkspaceQuestionsViewProps) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState<QuestionType>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [marks, setMarks] = useState(5);

  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setQuestions(null);
    setRevealed({});
    try {
      const res = await contentService.generateQuestions({
        documentId: doc.id,
        numQuestions,
        questionType,
        difficulty,
        marks,
      });
      setQuestions(res);
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate questions right now."));
    } finally {
      setLoading(false);
    }
  }

  function toggleAnswer(idx: number) {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

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
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-300">
            <ListChecks size={15} />
            <span>Exam Question Generator</span>
          </div>
        </div>

        {questions && (
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-white transition-colors focus-ring"
          >
            <RotateCcw size={13} />
            <span>Regenerate</span>
          </button>
        )}
      </div>

      {/* Control Panel to Configure Generation */}
      <div className="rounded-2xl border border-base-750/70 bg-base-900/80 p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {/* Difficulty */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-400">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-xl border border-base-750 bg-base-950 px-2.5 py-1.5 text-xs text-ink-200 focus-ring"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Question Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-400">Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full rounded-xl border border-base-750 bg-base-950 px-2.5 py-1.5 text-xs text-ink-200 focus-ring"
            >
              <option value="mixed">Mixed Types</option>
              <option value="mcq">Multiple Choice</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Conceptual</option>
            </select>
          </div>

          {/* Count */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-400">Questions Count</label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full rounded-xl border border-base-750 bg-base-950 px-2.5 py-1.5 text-xs text-ink-200 focus-ring"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
            </select>
          </div>

          {/* Generate Action */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 py-2 text-xs font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all focus-ring disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>{loading ? "Generating..." : "Generate Questions"}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {/* Generated Questions List */}
      {questions && (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isRevealed = !!revealed[idx];
            return (
              <div
                key={idx}
                className="rounded-2xl border border-base-750 bg-base-900/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-600/20 text-accent-300 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      {q.type} · {q.marks} Marks
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAi(`Explain the model answer and reasoning for this question from ${doc.filename}: "${q.prompt}"`)
                      }
                      className="flex items-center gap-1 rounded-lg border border-base-750 bg-base-850 px-2 py-1 text-[11px] text-ink-300 hover:text-white"
                      title="Ask AI Teacher to explain"
                    >
                      <MessageSquare size={12} />
                      <span>Ask AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAnswer(idx)}
                      className="flex items-center gap-1 rounded-lg border border-base-750 bg-base-850 px-2.5 py-1 text-[11px] font-medium text-accent-300 hover:bg-base-800"
                    >
                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{isRevealed ? "Hide Answer" : "View Answer"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-ink-100 leading-relaxed">
                  {q.prompt}
                </p>

                {/* Options if MCQ */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className="rounded-xl border border-base-750 bg-base-850/80 px-3 py-2 text-xs text-ink-200"
                      >
                        <span className="font-bold text-accent-400 mr-2">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Revealed Answer */}
                {isRevealed && (
                  <div className="mt-3 rounded-xl border border-accent-500/30 bg-base-950 p-3 space-y-1.5 animate-fade-in text-xs">
                    <span className="font-bold text-emerald-400">Answer:</span>
                    <p className="text-ink-200">{q.answer}</p>
                    {q.source_page && (
                      <p className="text-ink-400 text-[11px] pt-1 border-t border-base-850">
                        Source: Page {q.source_page}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
