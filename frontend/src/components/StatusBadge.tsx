import React from "react";
import type { DocumentStatus } from "../types";

const STYLES: Record<DocumentStatus, { badge: string; dot: string; label: string }> = {
  READY: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    label: "Ready",
  },
  PROCESSING: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400 animate-ping",
    label: "Processing",
  },
  UPLOADED: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dot: "bg-sky-400",
    label: "Uploaded",
  },
  FAILED: {
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
    label: "Failed",
  },
};

export default function StatusBadge({ status }: { status: DocumentStatus | string }) {
  const normalizedKey =
    status === "COMPLETED"
      ? "READY"
      : status === "UPLOADING"
      ? "PROCESSING"
      : (status as DocumentStatus);

  const conf = STYLES[normalizedKey] || {
    badge: "bg-base-800 text-ink-400 border-base-700",
    dot: "bg-ink-500",
    label: status,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${conf.badge}`}>
      <span className="relative flex h-1.5 w-1.5">
        {normalizedKey === "PROCESSING" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      </span>
      {conf.label}
    </span>
  );
}
