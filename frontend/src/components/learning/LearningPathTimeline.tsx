import React from "react";
import {
  Sparkles,
  BookOpen,
  NotebookPen,
  ListChecks,
  GraduationCap,
  CheckCircle2,
  Circle,
  RotateCcw,
  Flame,
} from "lucide-react";
import type { LearningPath, LearningStep, LearningStepAction } from "../../types";
import LearningProgress from "./LearningProgress";

interface LearningPathTimelineProps {
  path: LearningPath | null;
  activeStepId: string | null;
  completedStepIds: string[];
  onSelectStep: (step: LearningStep) => void;
  onTeachMe: (step: LearningStep) => void;
  onToggleComplete: (stepId: string) => void;
  onOpenPage?: (page: number) => void;
  onActionTrigger?: (action: LearningStepAction, step: LearningStep) => void;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

const ACTION_CONFIG: Record<
  LearningStepAction,
  { label: string; icon: React.ElementType; color: string }
> = {
  read: {
    label: "Read in PDF",
    icon: BookOpen,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  },
  ask_ai: {
    label: "Teach Me",
    icon: Sparkles,
    color: "text-accent-300 bg-accent-600/15 border-accent-500/30",
  },
  study_notes: {
    label: "Study Notes",
    icon: NotebookPen,
    color: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  },
  questions: {
    label: "Exam Questions",
    icon: ListChecks,
    color: "text-violet-300 bg-violet-500/10 border-violet-500/30",
  },
  quiz: {
    label: "Practice Quiz",
    icon: GraduationCap,
    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  },
};

export default function LearningPathTimeline({
  path,
  activeStepId,
  completedStepIds,
  onSelectStep,
  onTeachMe,
  onToggleComplete,
  onOpenPage,
  onActionTrigger,
  isLoading = false,
  onRegenerate,
}: LearningPathTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600/10 border border-accent-500/30 shadow-glow">
          <Sparkles size={24} className="text-accent-400 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-accent-300 uppercase tracking-wider">
            Curating Learning Path
          </p>
          <p className="text-xs text-ink-400">
            Analyzing document structure to sequence topics logically...
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2 pt-2">
          <div className="h-12 w-full animate-pulse rounded-xl bg-base-800/60 border border-base-750/40" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-base-800/40 border border-base-750/40" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-base-800/20 border border-base-750/40" />
        </div>
      </div>
    );
  }

  if (!path || !path.steps || path.steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="h-10 w-10 rounded-xl bg-base-800 border border-base-750 flex items-center justify-center text-ink-400">
          <BookOpen size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-ink-200">No Learning Path generated yet</p>
          <p className="text-[11px] text-ink-400">
            Generate a sequenced path from your document to guide your study.
          </p>
        </div>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-500 transition-all"
          >
            <Sparkles size={13} />
            <span>Generate Learning Path</span>
          </button>
        )}
      </div>
    );
  }

  const completedCount = completedStepIds.length;
  const totalCount = path.steps.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="p-3.5 border-b border-base-750/60 bg-base-900/60 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame size={15} className="text-accent-400 shrink-0" />
            <h3 className="text-xs font-bold text-ink-100 truncate">
              {path.title || "Document Learning Path"}
            </h3>
          </div>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Regenerate learning path"
              className="p-1 rounded-lg text-ink-400 hover:text-ink-200 hover:bg-base-800 transition-colors focus-ring"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <LearningProgress
          completedCount={completedCount}
          totalCount={totalCount}
        />
      </div>

      {/* Timeline Steps List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {path.steps.map((step, idx) => {
          const isCompleted = completedStepIds.includes(step.id);
          const isActive = activeStepId === step.id;
          const actionConf = ACTION_CONFIG[step.recommended_action] || ACTION_CONFIG.ask_ai;
          const ActionIcon = actionConf.icon;
          const isLast = idx === path.steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-3 group">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-[-14px] w-0.5 transition-colors ${
                    isCompleted ? "bg-emerald-500/40" : "bg-base-750"
                  }`}
                />
              )}

              {/* Step indicator circle / checkbox */}
              <button
                type="button"
                onClick={() => onToggleComplete(step.id)}
                title={isCompleted ? "Mark as incomplete" : "Mark as completed"}
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-glow-sm"
                    : isActive
                    ? "bg-accent-600/30 border-accent-400 text-accent-300 ring-2 ring-accent-500/30"
                    : "bg-base-850 border-base-700 text-ink-400 hover:border-accent-500/50 hover:text-accent-300"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <span className="text-[11px] font-bold">{step.step_number}</span>
                )}
              </button>

              {/* Step card */}
              <div
                onClick={() => onSelectStep(step)}
                className={`flex-1 rounded-xl p-3 border transition-all cursor-pointer ${
                  isActive
                    ? "bg-accent-600/10 border-accent-500/50 shadow-glow-sm"
                    : isCompleted
                    ? "bg-base-900/50 border-emerald-500/20 opacity-80 hover:opacity-100"
                    : "bg-base-900/80 border-base-750/70 hover:border-base-700 hover:bg-base-850/80"
                }`}
              >
                {/* Title and Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-xs font-semibold leading-snug ${
                    isActive ? "text-accent-200" : "text-ink-100"
                  }`}>
                    {step.title}
                  </h4>

                  {/* Recommended action badge */}
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${actionConf.color}`}
                  >
                    <ActionIcon size={10} />
                    <span>{actionConf.label}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-ink-400 mt-1 leading-relaxed line-clamp-2">
                  {step.description}
                </p>

                {/* Footer: Page Links & Teach Me CTA */}
                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-base-800/60">
                  {/* Page badges */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {step.source_pages && step.source_pages.length > 0 ? (
                      step.source_pages.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPage) onOpenPage(p);
                          }}
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono bg-base-800 text-ink-300 border border-base-750 hover:border-accent-500/40 hover:text-accent-300 transition-colors"
                          title={`Go to page ${p}`}
                        >
                          <span>p.{p}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-ink-500">General</span>
                    )}
                  </div>

                  {/* Teach Me Button */}
                  <div className="flex items-center gap-1.5">
                    {onActionTrigger && step.recommended_action !== "ask_ai" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionTrigger(step.recommended_action, step);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold bg-base-800 text-ink-200 hover:bg-base-750 hover:text-white border border-base-700 transition-colors"
                      >
                        <ActionIcon size={11} />
                        <span>Open</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTeachMe(step);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold bg-accent-600/20 text-accent-300 border border-accent-500/40 hover:bg-accent-600/30 hover:border-accent-400 transition-colors shadow-glow-sm"
                    >
                      <Sparkles size={11} className="text-accent-400" />
                      <span>Teach Me</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
