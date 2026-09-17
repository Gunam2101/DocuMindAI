import React, { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3.5 rounded-2xl border border-dashed border-base-750 bg-gradient-to-b from-base-900/60 to-base-950/80 px-6 py-14 text-center transition-all ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600/10 text-accent-400 border border-accent-500/20 shadow-glow-sm">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-sm sm:text-base font-semibold text-ink-100">{title}</h3>
        <p className="text-xs sm:text-sm text-ink-400 leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="space-y-3.5 rounded-2xl border border-base-750/70 bg-base-900 p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 skeleton rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-2/3 h-4" />
          <SkeletonLine className="w-1/3 h-3" />
        </div>
      </div>
      <SkeletonLine className="w-full h-3" />
      <div className="flex gap-2 pt-2">
        <div className="h-8 flex-1 skeleton rounded-lg" />
        <div className="h-8 w-16 skeleton rounded-lg" />
      </div>
    </div>
  );
}
