import React from "react";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  BookOpen,
  NotebookPen,
  ListChecks,
  GraduationCap,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Flame,
} from "lucide-react";
import type { Document, LearningPath, LearningStep, LearningStepAction } from "../../../types";
import LearningProgress from "../../learning/LearningProgress";

interface WorkspacePathViewProps {
  document: Document;
  path: LearningPath | null;
  activeStepId: string | null;
  completedStepIds: string[];
  isLoading: boolean;
  onBackToPdf: () => void;
  onSelectStep: (step: LearningStep) => void;
  onTeachMe: (step: LearningStep) => void;
  onToggleComplete: (stepId: string) => void;
  onOpenPage: (page: number) => void;
  onActionTrigger: (action: LearningStepAction, step: LearningStep) => void;
  onRegenerate: () => void;
}

const ACTION_CONFIG: Record<
  LearningStepAction,
  { label: string; icon: React.ElementType; color: string; buttonLabel: string }
> = {
  read: {
    label: "Read Section",
    icon: BookOpen,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    buttonLabel: "Read in PDF",
  },
  ask_ai: {
    label: "Concept Explanation",
    icon: Sparkles,
    color: "text-accent-300 bg-accent-600/15 border-accent-500/30",
    buttonLabel: "Teach Me Topic",
  },
  study_notes: {
    label: "Structured Notes",
    icon: NotebookPen,
    color: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    buttonLabel: "View Notes",
  },
  questions: {
    label: "Review Questions",
    icon: ListChecks,
    color: "text-violet-300 bg-violet-500/10 border-violet-500/30",
    buttonLabel: "Solve Questions",
  },
  quiz: {
    label: "Mastery Assessment",
    icon: GraduationCap,
    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    buttonLabel: "Take Quiz",
  },
};

export default function WorkspacePathView({
  document: doc,
  path,
  activeStepId,
  completedStepIds,
  isLoading,
  onBackToPdf,
  onSelectStep,
  onTeachMe,
  onToggleComplete,
  onOpenPage,
  onActionTrigger,
  onRegenerate,
}: WorkspacePathViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600/15 border border-accent-500/40 shadow-glow">
          <Compass size={28} className="text-accent-400 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-ink-50">Synthesizing Document Learning Path</h2>
          <p className="text-xs text-ink-400 max-w-sm">
            DocuMind AI is mapping concepts, cross-referencing pages, and structuring your pedagogical journey.
          </p>
        </div>
      </div>
    );
  }

  const steps = path?.steps || [];
  const completedCount = completedStepIds.length;
  const totalCount = steps.length;
  const nextIncompleteStep = steps.find((s) => !completedStepIds.includes(s.id)) || steps[0];

  return (
    <div className="flex flex-col h-full bg-base-950 text-ink-100 overflow-y-auto font-sans">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between border-b border-base-750/70 bg-base-900/80 px-6 py-3 shrink-0 backdrop-blur-md sticky top-0 z-20">
        <button
          type="button"
          onClick={onBackToPdf}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-300 hover:text-white transition-colors focus-ring"
        >
          <ArrowLeft size={14} />
          <span>Back to PDF Reader</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-850 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:text-white transition-all focus-ring"
          >
            <RotateCcw size={13} />
            <span>Regenerate Path</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-8">
        {/* Hero Roadmap Card */}
        <div className="relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-br from-accent-950/40 via-base-900 to-base-900 p-6 sm:p-8 shadow-glow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 border border-accent-500/30 px-3 py-1 text-xs font-semibold text-accent-300">
                <Compass size={13} />
                <span>Intelligent Learning Sequence</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-50">
                {path?.title || `Learning Roadmap for ${doc.filename.replace(".pdf", "")}`}
              </h1>
              <p className="text-xs sm:text-sm text-ink-300 max-w-xl leading-relaxed">
                Step through this structured curriculum derived directly from your document.
                Each topic is calibrated with page references and direct AI tutoring.
              </p>
            </div>

            {/* Quick Next Action Card */}
            {nextIncompleteStep && (
              <div className="rounded-2xl border border-accent-500/40 bg-base-900/90 p-4 shrink-0 sm:max-w-xs w-full shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-400">
                    Recommended Next
                  </span>
                  <span className="text-[11px] font-mono text-ink-400">
                    Step {nextIncompleteStep.step_number} of {totalCount}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-100 line-clamp-1">
                    {nextIncompleteStep.title}
                  </h4>
                  <p className="text-[11px] text-ink-400 line-clamp-2 mt-0.5">
                    {nextIncompleteStep.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTeachMe(nextIncompleteStep)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
                >
                  <Sparkles size={13} />
                  <span>Teach Me This Topic</span>
                </button>
              </div>
            )}
          </div>

          {/* Mastery Progress Bar */}
          <div className="mt-6 pt-6 border-t border-base-750/60">
            <LearningProgress completedCount={completedCount} totalCount={totalCount} />
          </div>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-300 flex items-center gap-2">
              <Flame size={16} className="text-accent-400" />
              <span>Curriculum Steps</span>
            </h2>
            <span className="text-xs text-ink-400">
              {completedCount} of {totalCount} completed
            </span>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isCompleted = completedStepIds.includes(step.id);
              const isActive = activeStepId === step.id;
              const actionConf = ACTION_CONFIG[step.recommended_action] || ACTION_CONFIG.ask_ai;
              const ActionIcon = actionConf.icon;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? "bg-accent-600/10 border-accent-500/50 shadow-glow-sm"
                      : isCompleted
                      ? "bg-base-900/60 border-emerald-500/30"
                      : "bg-base-900/80 border-base-750/70 hover:border-base-700"
                  }`}
                >
                  {/* Left: Step indicator & details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(step.id)}
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all ${
                        isCompleted
                          ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                          : "bg-base-800 border-base-700 text-ink-400 hover:text-accent-300 hover:border-accent-500/40"
                      }`}
                      title={isCompleted ? "Mark incomplete" : "Mark completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <span className="text-xs font-bold">{step.step_number}</span>
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-accent-400 uppercase tracking-wider">
                          Step {step.step_number}
                        </span>
                        <span className="text-ink-600">•</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${actionConf.color}`}
                        >
                          <ActionIcon size={11} />
                          <span>{actionConf.label}</span>
                        </span>

                        {step.source_pages && step.source_pages.length > 0 && (
                          <div className="flex items-center gap-1 ml-auto sm:ml-0">
                            {step.source_pages.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => onOpenPage(p)}
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono bg-base-800 text-ink-300 border border-base-750 hover:text-accent-300 hover:border-accent-500/40"
                              >
                                <span>p.{p}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <h3
                        onClick={() => onSelectStep(step)}
                        className={`text-sm sm:text-base font-semibold cursor-pointer ${
                          isCompleted ? "text-ink-200 line-through opacity-80" : "text-ink-50"
                        }`}
                      >
                        {step.title}
                      </h3>

                      <p className="text-xs text-ink-400 leading-relaxed max-w-2xl">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-base-800">
                    {step.recommended_action !== "ask_ai" && (
                      <button
                        type="button"
                        onClick={() => onActionTrigger(step.recommended_action, step)}
                        className="flex items-center gap-1.5 rounded-xl border border-base-750 bg-base-800 px-3 py-2 text-xs font-semibold text-ink-200 hover:bg-base-750 hover:text-white transition-all"
                      >
                        <ActionIcon size={13} />
                        <span>{actionConf.buttonLabel}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onTeachMe(step)}
                      className="flex items-center gap-1.5 rounded-xl bg-accent-600/20 border border-accent-500/40 px-3.5 py-2 text-xs font-semibold text-accent-300 hover:bg-accent-600/30 hover:border-accent-400 shadow-glow-sm transition-all"
                    >
                      <Sparkles size={13} className="text-accent-400" />
                      <span>Teach Me</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
