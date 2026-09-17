import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  MessageSquare,
  Sparkles,
  BookOpen,
  GraduationCap,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  Compass,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import * as documentService from "../services/documentService";
import type { Document } from "../types";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, SkeletonCard } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import DocuMindLogo from "../components/DocuMindLogo";
import { getErrorMessage } from "../services/apiClient";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function load() {
    setError(null);
    try {
      const docs = await documentService.listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load your documents."));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFileUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const doc = await documentService.uploadDocument(file);
      navigate(`/app/workspace/${doc.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  const recent = (documents || []).slice(0, 4);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Learning Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-base-750 bg-gradient-to-br from-base-900 via-base-900 to-accent-700/10 p-6 sm:p-10 shadow-card">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-600/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-600/10 px-3 py-1 text-xs font-semibold text-accent-300">
            <Sparkles size={13} className="text-accent-400" />
            <span>{greeting()}, {firstName}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-ink-50 leading-tight">
            Learn anything from <br />
            <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-sky-400 bg-clip-text text-transparent">
              your documents.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-ink-400 leading-relaxed max-w-xl">
            Upload a document, ask questions, understand difficult concepts, and practice what you learned with your personal AI teacher.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-accent-600 to-accent-700 px-5 py-3 text-sm font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all hover:scale-[1.02] disabled:opacity-50 focus-ring"
            >
              <Upload size={16} />
              <span>{uploading ? "Uploading..." : "Upload Document"}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/app/ask")}
              className="flex items-center gap-2 rounded-xl border border-base-750 bg-base-850/80 px-5 py-3 text-sm font-semibold text-ink-100 hover:border-accent-500/40 hover:bg-base-800 transition-all focus-ring"
            >
              <MessageSquare size={16} className="text-accent-400" />
              <span>Ask AI Teacher</span>
            </button>
          </div>
        </div>

        {/* Subtle Official Logo Artwork Showcase (Desktop) */}
        <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center opacity-90 transition-opacity">
          <DocuMindLogo variant="graphic" size="lg" className="rounded-2xl shadow-2xl ring-1 ring-accent-500/30 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]" />
        </div>

        {/* Drag and Drop Zone Banner Hint */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-8 flex items-center justify-between rounded-2xl border border-dashed px-5 py-4 transition-all cursor-pointer ${
            isDragging
              ? "border-accent-400 bg-accent-500/10 shadow-glow"
              : "border-base-750/80 bg-base-950/50 hover:border-accent-500/40 hover:bg-base-950/80"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-850 text-accent-400 border border-base-750">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-ink-200">
                {uploading ? "Uploading your document..." : "Drag & drop your PDF here, or browse"}
              </p>
              <p className="text-[11px] text-ink-500">
                Textbooks, lecture slides, research papers, notes (English, Tamil, Hindi, multilingual)
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-accent-400">Browse files →</span>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Learning Pathways: Start Learning */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-ink-100">Start Learning</h2>
          <p className="text-xs text-ink-400">Follow the learning loop: Understand, Ask, and Practice.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Ask Card */}
          <div
            onClick={() => navigate("/app/ask")}
            className="group flex flex-col justify-between rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/60 p-6 shadow-card hover:border-accent-500/50 hover:bg-base-850/80 transition-all cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 border border-accent-500/20 shadow-sm transition-transform group-hover:scale-105">
                <MessageSquare size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-100 group-hover:text-accent-300 transition-colors">
                Ask
              </h3>
              <p className="mt-1.5 text-xs text-ink-400 leading-relaxed">
                Interactive Q&A with your AI teacher in plain English, Tamil, Hindi, or Tanglish. Attach diagrams or photos.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-accent-400 group-hover:text-accent-300">
              <span>Ask a question</span>
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Understand Card */}
          <div
            onClick={() => navigate("/app/summary")}
            className="group flex flex-col justify-between rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/60 p-6 shadow-card hover:border-sky-500/50 hover:bg-base-850/80 transition-all cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-sm transition-transform group-hover:scale-105">
                <BookOpen size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-100 group-hover:text-sky-300 transition-colors">
                Understand
              </h3>
              <p className="mt-1.5 text-xs text-ink-400 leading-relaxed">
                Transform heavy documents into concise summaries and notebook-style study notes with core concepts and examples.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300">
              <span>View summaries</span>
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Practice Card */}
          <div
            onClick={() => navigate("/app/quiz")}
            className="group flex flex-col justify-between rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/60 p-6 shadow-card hover:border-emerald-500/50 hover:bg-base-850/80 transition-all cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm transition-transform group-hover:scale-105">
                <GraduationCap size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-100 group-hover:text-emerald-300 transition-colors">
                Practice
              </h3>
              <p className="mt-1.5 text-xs text-ink-400 leading-relaxed">
                Test your knowledge with exam-style questions (MCQs, short & long answers) and interactive scored quizzes.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              <span>Take a quiz</span>
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Continue Learning: Recent Documents Shelf */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">Continue Learning</h2>
            <p className="text-xs text-ink-400">Jump right back into your active study materials.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/documents")}
            className="flex items-center gap-1 text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors"
          >
            <span>View all library</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Loading Skeletons */}
        {documents === null && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {documents !== null && recent.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Your learning library is empty"
            description="Upload your first textbook, lecture notes, or syllabus PDF to start learning with your AI teacher."
            action={
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
              >
                <Upload size={14} />
                <span>Upload PDF</span>
              </button>
            }
          />
        )}

        {/* Horizontal Cards */}
        {recent.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((doc) => {
              const isReady = doc.status === "READY" || (doc.status as string) === "COMPLETED";
              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/app/workspace/${doc.id}`)}
                  className="group flex flex-col justify-between rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/80 p-4 shadow-card hover:border-accent-500/40 hover:bg-base-850 transition-all cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                        <FileText size={20} />
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="line-clamp-1 text-sm font-semibold text-ink-100 group-hover:text-accent-300 transition-colors" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <p className="text-xs text-ink-400">
                        {doc.page_count > 0 ? `${doc.page_count} pages` : "Processing"}
                      </p>

                      {/* Active Learning Step preview if available */}
                      {(() => {
                        try {
                          const raw = localStorage.getItem(`documind_recent_active_step_${doc.id}`);
                          if (!raw) return null;
                          const st = JSON.parse(raw);
                          return (
                            <div className="mt-1.5 flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 text-[10px] font-medium text-accent-300 border border-accent-500/20 truncate">
                              <Compass size={10} className="shrink-0 text-accent-400" />
                              <span className="truncate">Step {st.stepNumber}: {st.title}</span>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>


                  <div className="mt-5 pt-3 border-t border-base-750/50 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-ink-500">
                      <Clock size={11} />
                      Active
                    </span>

                    <button
                      type="button"
                      disabled={!isReady}
                      className="inline-flex items-center gap-1 rounded-lg bg-base-800 px-3 py-1.5 text-xs font-semibold text-ink-200 group-hover:bg-accent-600 group-hover:text-white transition-all disabled:opacity-40"
                    >
                      <span>Continue</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
