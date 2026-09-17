import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, FileText, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import type { Document, LearningPath, LearningStep, LearningStepAction } from "../types";
import * as documentService from "../services/documentService";
import * as contentService from "../services/contentService";
import { getErrorMessage } from "../services/apiClient";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import WorkspacePageNavigator from "../components/workspace/WorkspacePageNavigator";
import WorkspacePdfViewer from "../components/workspace/WorkspacePdfViewer";
import WorkspaceAiTeacher from "../components/workspace/WorkspaceAiTeacher";
import WorkspaceActionBar, { type WorkspaceMode } from "../components/workspace/WorkspaceActionBar";
import WorkspacePathView from "../components/workspace/modes/WorkspacePathView";
import WorkspaceSummaryView from "../components/workspace/modes/WorkspaceSummaryView";
import WorkspaceNotesView from "../components/workspace/modes/WorkspaceNotesView";
import WorkspaceQuestionsView from "../components/workspace/modes/WorkspaceQuestionsView";
import WorkspaceQuizView from "../components/workspace/modes/WorkspaceQuizView";
import ErrorState from "../components/ErrorState";

export default function WorkspacePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active workspace states
  const initialMode = (searchParams.get("mode") as WorkspaceMode) || "pdf";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [activeMode, setActiveMode] = useState<WorkspaceMode>(initialMode);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [zoom, setZoom] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Layout panels toggle (Responsive defaults)
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "path">("chat");

  // External prompt passed from actions to AI Teacher
  const [externalAiPrompt, setExternalAiPrompt] = useState<string | undefined>(undefined);

  // Learning Path state
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);


  // Fetch document details
  async function loadDocument() {
    if (!documentId) return;
    try {
      const doc = await documentService.getDocument(documentId);
      setDocument(doc);
      // Touch document to update last_activity_at
      documentService.touchDocument(documentId).catch(() => {});
    } catch (err) {
      setError(getErrorMessage(err, "Could not load document details."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Polling if document is in processing or uploading state
  useEffect(() => {
    if (!document) return;
    const isProcessing =
      document.status === "PROCESSING" ||
      document.status === "UPLOADED" ||
      (document.status as string) === "UPLOADING";

    if (!isProcessing) return;

    const interval = setInterval(async () => {
      try {
        const updated = await documentService.getDocument(document.id);
        setDocument(updated);
      } catch {
        // ignore polling network blips
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [document?.id, document?.status]);

  // Load and cache Learning Path
  async function loadLearningPath(forceRefresh = false) {
    if (!documentId || !document || document.status !== "READY") return;

    const cacheKey = `documind_path_${documentId}`;
    const progressKey = `documind_path_progress_${documentId}`;

    // Load progress
    try {
      const savedProgress = localStorage.getItem(progressKey);
      if (savedProgress) {
        setCompletedStepIds(JSON.parse(savedProgress));
      }
    } catch {
      // ignore json parse errors
    }

    // Check cached path
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as LearningPath;
          setLearningPath(parsed);
          if (parsed.steps?.length && !activeStepId) {
            setActiveStepId(parsed.steps[0].id);
          }
          return;
        }
      } catch {
        // fallback to fetch
      }
    }

    setIsLoadingPath(true);
    try {
      const res = await contentService.getLearningPath(documentId);
      setLearningPath(res);
      localStorage.setItem(cacheKey, JSON.stringify(res));
      if (res.steps?.length && !activeStepId) {
        setActiveStepId(res.steps[0].id);
      }
    } catch {
      // Fallback handled smoothly inside service or component
    } finally {
      setIsLoadingPath(false);
    }
  }

  // Load learning path when document becomes READY
  useEffect(() => {
    if (document?.status === "READY") {
      loadLearningPath();
    }
  }, [document?.id, document?.status]);

  // Sync mode changes to URL
  function handleSelectMode(mode: WorkspaceMode) {
    setActiveMode(mode);
    setSearchParams(
      (prev) => {
        prev.set("mode", mode);
        return prev;
      },
      { replace: true }
    );
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    setSearchParams(
      (prev) => {
        prev.set("page", String(page));
        return prev;
      },
      { replace: true }
    );
  }

  function handleAskAboutPage() {
    setIsAiOpen(true);
    setRightPanelTab("chat");
    const prompt = `Explain the main concepts and takeaways from page ${currentPage} of ${document?.filename || "this document"}.`;
    setExternalAiPrompt(prompt);
  }

  function handleExplainSelectedText(text: string) {
    setIsAiOpen(true);
    setRightPanelTab("chat");
    setSelectedText(text);
    const prompt = `Explain this highlighted text from page ${currentPage} simply: "${text}"`;
    setExternalAiPrompt(prompt);
  }

  function handleCitationPageClick(page: number) {
    setCurrentPage(page);
    setActiveMode("pdf");
  }

  // Toggle step completion and save to localStorage
  function handleToggleCompleteStep(stepId: string) {
    setCompletedStepIds((prev) => {
      const next = prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId];
      if (documentId) {
        localStorage.setItem(`documind_path_progress_${documentId}`, JSON.stringify(next));
      }
      return next;
    });
  }

  // "Teach Me" action handler
  function handleTeachMeStep(step: LearningStep) {
    setActiveStepId(step.id);
    setActiveTopic(step.title);
    if (step.source_pages && step.source_pages.length > 0) {
      setCurrentPage(step.source_pages[0]);
    }
    // Record recent active step for homepage
    if (documentId) {
      localStorage.setItem(
        `documind_recent_active_step_${documentId}`,
        JSON.stringify({ stepNumber: step.step_number, title: step.title })
      );
    }

    setIsAiOpen(true);
    setRightPanelTab("chat");
    const prompt = `Teach me about "${step.title}" from this document. Please guide me step-by-step: 1. Simple explanation, 2. Why it matters, 3. How it works, 4. Concrete example, 5. Key takeaway.`;
    setExternalAiPrompt(prompt);
  }

  function handleNextTopic() {
    if (!learningPath || !learningPath.steps) return;
    const currentIdx = learningPath.steps.findIndex((s) => s.id === activeStepId);
    const nextStep = learningPath.steps[currentIdx + 1];
    if (nextStep) {
      handleTeachMeStep(nextStep);
    }
  }


  // Action trigger from step card (e.g. go to quiz or notes)
  function handleActionTrigger(action: LearningStepAction, step: LearningStep) {
    setActiveStepId(step.id);
    if (step.source_pages && step.source_pages.length > 0) {
      setCurrentPage(step.source_pages[0]);
    }

    if (action === "read") {
      setActiveMode("pdf");
    } else if (action === "study_notes") {
      setActiveMode("notes");
    } else if (action === "questions") {
      setActiveMode("questions");
    } else if (action === "quiz") {
      setActiveMode("quiz");
    } else if (action === "ask_ai") {
      handleTeachMeStep(step);
    }
  }

  async function handleDeleteDocument() {
    if (!document) return;
    try {
      await documentService.deleteDocument(document.id);
      navigate("/app/documents");
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete this document."));
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-base-950 text-ink-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shadow-glow" />
        <p className="text-xs font-semibold tracking-wide uppercase text-accent-300">
          Opening PDF Learning Workspace...
        </p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-base-950">
        <div className="max-w-md w-full space-y-4">
          <ErrorState message={error || "Document not found."} onRetry={loadDocument} />
          <button
            type="button"
            onClick={() => navigate("/app/documents")}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-base-750 bg-base-900 py-2.5 text-xs font-semibold text-ink-200 hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>Return to Documents</span>
          </button>
        </div>
      </div>
    );
  }

  const isProcessing =
    document.status === "PROCESSING" ||
    document.status === "UPLOADED" ||
    (document.status as string) === "UPLOADING";

  const isFailed = document.status === "FAILED";

  return (
    <div className="flex h-screen w-full flex-col bg-base-950 text-ink-100 overflow-hidden select-none font-sans">
      {/* 1. Top Contextual Document Bar */}
      <WorkspaceHeader
        document={document}
        currentPage={currentPage}
        totalPages={document.page_count || 1}
        isNavOpen={isNavOpen}
        isAiOpen={isAiOpen}
        onToggleNav={() => setIsNavOpen(!isNavOpen)}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        onAskAboutPage={handleAskAboutPage}
        onDeleteDocument={handleDeleteDocument}
      />

      {/* 2. Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: PDF Page Navigator (Visible in PDF mode when toggled) */}
        {isNavOpen && activeMode === "pdf" && !isProcessing && (
          <aside className="w-44 sm:w-48 md:w-52 h-full shrink-0 z-10 transition-all duration-200">
            <WorkspacePageNavigator
              currentPage={currentPage}
              totalPages={document.page_count || 1}
              onSelectPage={handlePageChange}
            />
          </aside>
        )}

        {/* Center: Main Learning Canvas (PDF or Learning Tool) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-base-950 relative">
          {/* A. If Ingesting / Processing State */}
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-600/10 border border-accent-500/40 shadow-glow">
                <Sparkles size={28} className="text-accent-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-base sm:text-lg font-bold text-ink-50">
                  Analyzing Your Document
                </h2>
                <p className="text-xs text-ink-400 leading-relaxed">
                  Extracting content, building knowledge index, and preparing your AI Teacher. This takes a few moments.
                </p>
              </div>

              {/* Progress Stage Indicator */}
              <div className="w-full max-w-xs space-y-2 rounded-2xl border border-base-750 bg-base-900/80 p-4 text-xs text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Document securely stored</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300 font-medium animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Text extraction & AI indexing</span>
                </div>
                <div className="flex items-center gap-2 text-ink-500">
                  <span className="h-2 w-2 rounded-full bg-base-700" />
                  <span>Personal AI Teacher & Learning Path ready</span>
                </div>
              </div>
            </div>
          )}

          {/* B. If Failed Processing State */}
          {isFailed && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1 max-w-sm">
                <h2 className="text-base font-bold text-ink-50">Document Processing Failed</h2>
                <p className="text-xs text-ink-400">
                  {document.failure_reason || "The document could not be processed. Please check if it is password protected."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/app/documents")}
                className="rounded-xl bg-base-850 border border-base-750 px-4 py-2 text-xs font-semibold text-ink-200 hover:text-white"
              >
                Back to Documents
              </button>
            </div>
          )}

          {/* C. Active View Modes (When Ready) */}
          {!isProcessing && !isFailed && (
            <>
              {activeMode === "pdf" && (
                <WorkspacePdfViewer
                  document={document}
                  currentPage={currentPage}
                  zoom={zoom}
                  searchQuery={searchQuery}
                  onPageChange={handlePageChange}
                  onZoomChange={setZoom}
                  onSearchSubmit={setSearchQuery}
                  onAskAboutPage={handleAskAboutPage}
                  onExplainText={handleExplainSelectedText}
                />
              )}

              {activeMode === "path" && (
                <WorkspacePathView
                  document={document}
                  path={learningPath}
                  activeStepId={activeStepId}
                  completedStepIds={completedStepIds}
                  isLoading={isLoadingPath}
                  onBackToPdf={() => setActiveMode("pdf")}
                  onSelectStep={(step) => {
                    setActiveStepId(step.id);
                    if (step.source_pages && step.source_pages.length > 0) {
                      setCurrentPage(step.source_pages[0]);
                    }
                  }}
                  onTeachMe={handleTeachMeStep}
                  onToggleComplete={handleToggleCompleteStep}
                  onOpenPage={(p) => {
                    setCurrentPage(p);
                    setActiveMode("pdf");
                  }}
                  onActionTrigger={handleActionTrigger}
                  onRegenerate={() => loadLearningPath(true)}
                />
              )}

              {activeMode === "summary" && (
                <WorkspaceSummaryView
                  document={document}
                  onBackToPdf={() => setActiveMode("pdf")}
                  onAskAi={(prompt) => {
                    setIsAiOpen(true);
                    setRightPanelTab("chat");
                    setExternalAiPrompt(prompt);
                  }}
                />
              )}

              {activeMode === "notes" && (
                <WorkspaceNotesView
                  document={document}
                  onBackToPdf={() => setActiveMode("pdf")}
                  onAskAi={(prompt) => {
                    setIsAiOpen(true);
                    setRightPanelTab("chat");
                    setExternalAiPrompt(prompt);
                  }}
                />
              )}

              {activeMode === "questions" && (
                <WorkspaceQuestionsView
                  document={document}
                  onBackToPdf={() => setActiveMode("pdf")}
                  onAskAi={(prompt) => {
                    setIsAiOpen(true);
                    setRightPanelTab("chat");
                    setExternalAiPrompt(prompt);
                  }}
                />
              )}

              {activeMode === "quiz" && (
                <WorkspaceQuizView
                  document={document}
                  onBackToPdf={() => setActiveMode("pdf")}
                  onAskAi={(prompt) => {
                    setIsAiOpen(true);
                    setRightPanelTab("chat");
                    setExternalAiPrompt(prompt);
                  }}
                />
              )}
            </>
          )}

          {/* Docked Bottom Learning Action Pathways Bar */}
          {!isProcessing && !isFailed && (
            <WorkspaceActionBar
              activeMode={activeMode}
              onSelectMode={handleSelectMode}
            />
          )}
        </main>

        {/* Right: Persistent AI Teacher & Learning Path Panel */}
        {isAiOpen && !isProcessing && (
          <aside className="w-full sm:w-80 md:w-96 lg:w-[400px] xl:w-[420px] h-full shrink-0 z-20 transition-all duration-200">
            <WorkspaceAiTeacher
              document={document}
              currentPage={currentPage}
              initialPrompt={externalAiPrompt}
              onPageClick={handleCitationPageClick}
              learningPath={learningPath}
              activeStepId={activeStepId}
              activeTopic={activeTopic}
              selectedText={selectedText}
              completedStepIds={completedStepIds}
              isLoadingPath={isLoadingPath}
              onSelectStep={(step) => {
                setActiveStepId(step.id);
                setActiveTopic(step.title);
                if (step.source_pages && step.source_pages.length > 0) {
                  setCurrentPage(step.source_pages[0]);
                }
              }}
              onToggleCompleteStep={handleToggleCompleteStep}
              onRegeneratePath={() => loadLearningPath(true)}
              onActionTrigger={handleActionTrigger}
              onClearSelectedText={() => setSelectedText(null)}
              onClearActiveTopic={() => setActiveTopic(null)}
              onNextStep={handleNextTopic}
              initialTab={rightPanelTab}
            />

          </aside>
        )}
      </div>
    </div>
  );
}
