import React from "react";
import { Award } from "lucide-react";

interface LearningProgressProps {
  completedCount: number;
  totalCount: number;
  className?: string;
}

export default function LearningProgress({
  completedCount,
  totalCount,
  className = "",
}: LearningProgressProps) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isMastered = totalCount > 0 && completedCount === totalCount;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-ink-300">
          <Award size={13} className={isMastered ? "text-amber-400 animate-pulse" : "text-accent-400"} />
          <span>Mastery Progress</span>
        </div>
        <span className="font-semibold text-accent-300">
          {completedCount}/{totalCount} completed ({percent}%)
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800 border border-base-750/50">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isMastered
              ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow"
              : "bg-gradient-to-r from-accent-600 via-accent-500 to-accent-400"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
