import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-base-700/60 bg-base-900 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle size={20} />
      </div>
      <p className="max-w-sm text-sm text-ink-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 flex items-center gap-2 rounded-lg bg-base-800 px-4 py-2 text-sm font-medium text-ink-100 transition-colors hover:bg-base-700 focus-ring"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
