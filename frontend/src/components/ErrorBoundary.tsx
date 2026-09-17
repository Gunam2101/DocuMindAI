import React, { Component, type ErrorInfo, type ReactNode } from "react";
import DocuMindLogo from "./DocuMindLogo";
import { RefreshCw, LogIn, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DocuMind ErrorBoundary caught exception]:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/app/home";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-base-950 px-4 text-ink-100 font-sans">
          <div className="w-full max-w-md rounded-2xl border border-base-750 bg-base-900/90 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <DocuMindLogo variant="full" size="md" showSubtitle />
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-ink-50">Something went wrong.</h2>
              <p className="text-xs sm:text-sm text-ink-400 leading-relaxed">
                DocuMind encountered an unexpected display error. Reloading will restore your session.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-5 py-2.5 text-xs font-semibold text-white shadow-glow hover:from-accent-500 hover:to-accent-600 transition-all focus-ring"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-base-750 bg-base-850 px-4 py-2.5 text-xs font-medium text-ink-300 hover:border-base-700 hover:text-ink-100 transition-colors focus-ring"
              >
                <LogIn size={14} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
