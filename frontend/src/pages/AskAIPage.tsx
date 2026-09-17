import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ImagePlus,
  SendHorizontal,
  Sparkles,
  X,
  MessageSquare,
  BookOpen,
  FileText,
  SlidersHorizontal,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Info,
} from "lucide-react";
import * as chatService from "../services/chatService";
import * as documentService from "../services/documentService";
import { useDocuments } from "../components/DocumentSelector";
import DocumentSelector from "../components/DocumentSelector";
import { EmptyState } from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import AIResponseRenderer from "../components/AIResponseRenderer";
import PdfViewerModal from "../components/PdfViewerModal";
import StatusBadge from "../components/StatusBadge";
import DocuMindLogo from "../components/DocuMindLogo";
import { getErrorMessage } from "../services/apiClient";
import type { ChatMessage, Document } from "../types";

const LANGUAGES = [
  { code: "auto", label: "Auto (Detect)" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "zh-cn", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
];

export default function AskAIPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { documents, error: docsError, reload } = useDocuments();

  const [documentId, setDocumentId] = useState<string | null>(searchParams.get("document"));
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("auto");
  const [style, setStyle] = useState<"detailed" | "concise">("detailed");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // PDF Viewer Modal for clicking citations
  const [viewerModal, setViewerModal] = useState<{ doc: Document; page: number } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents?.find((d) => d.id === documentId) || null;

  useEffect(() => {
    if (documentId) {
      documentService.touchDocument(documentId).catch(() => {});
      setSearchParams({ document: documentId }, { replace: true });
    }
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Rotate thinking messages during inference
  useEffect(() => {
    if (!sending) return;
    const steps = [
      "Thinking...",
      "Retrieving relevant content from document...",
      "Synthesizing concept and explanation...",
      "Preparing your answer...",
    ];
    setThinkingStep(0);
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [sending]);

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && !image) || sending) return;

    setError(null);
    const localUserMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed || "Explain this image.",
      sources: [],
      created_at: new Date().toISOString(),
      imagePreviewUrl: imagePreview || undefined,
    };
    setMessages((prev) => [...prev, localUserMsg]);
    setInput("");
    const sentImage = image;
    clearImage();
    setSending(true);

    try {
      const res = await chatService.sendMessage({
        message: trimmed || "Explain this image.",
        conversationId: conversationId || undefined,
        documentId: documentId || undefined,
        language,
        image: sentImage,
      });
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id,
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, "The AI couldn't answer right now. Please try again."));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSourcePageClick(page: number) {
    if (selectedDoc) {
      setViewerModal({ doc: selectedDoc, page });
    }
  }

  const thinkingSteps = [
    "Thinking...",
    "Retrieving relevant content from document...",
    "Synthesizing concept & explanation...",
    "Preparing your answer...",
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Context & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-750/70 bg-base-900/90 px-4 sm:px-6 py-2.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="text-xs font-semibold text-ink-400">Context:</span>
          <DocumentSelector
            documents={documents || []}
            selectedId={documentId}
            onSelect={(id) => {
              setDocumentId(id);
              setConversationId(null);
              setMessages([]);
            }}
          />
          {selectedDoc && (
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <span>{selectedDoc.page_count} pages</span>
              <StatusBadge status={selectedDoc.status} />
            </div>
          )}
        </div>

        {/* Quick configuration selectors */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Language selection"
              className="rounded-xl border border-base-750 bg-base-850 px-2.5 py-1 text-xs font-medium text-ink-200 focus-ring hover:border-accent-500/40"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Style Selector */}
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as "detailed" | "concise")}
            aria-label="Response style"
            className="hidden sm:block rounded-xl border border-base-750 bg-base-850 px-2.5 py-1 text-xs font-medium text-ink-200 focus-ring hover:border-accent-500/40"
          >
            <option value="detailed">Detailed Teacher</option>
            <option value="concise">Concise Bulleted</option>
          </select>

          {/* Toggle side panel button */}
          {selectedDoc && (
            <button
              type="button"
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="hidden lg:flex items-center gap-1 rounded-xl border border-base-750 bg-base-850 px-2.5 py-1 text-xs font-medium text-ink-300 hover:text-ink-100 hover:border-accent-500/40 transition-colors focus-ring"
              title="Toggle document context panel"
            >
              {sidePanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              <span>{sidePanelOpen ? "Hide Info" : "Doc Info"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Chat Stream + Context Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Stream Column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {docsError && <ErrorState message={docsError} onRetry={reload} />}

              {/* Empty State */}
              {messages.length === 0 && !docsError && (
                <div className="my-8">
                  <EmptyState
                    icon={MessageSquare}
                    title="Your Personal AI Teacher is Ready"
                    description={
                      documentId
                        ? "Ask about this document in any language — English, Tamil, Hindi, or Tanglish. You can also upload textbook diagrams, equations, or handwritten notes."
                        : "Select a document above to ground your answers in specific course materials, or ask any general study question directly."
                    }
                    action={
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {[
                          "Explain the main concept simply",
                          "What are the 3 most important takeaways?",
                          "Give me a real-world example",
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setInput(prompt);
                            }}
                            className="rounded-xl border border-base-750 bg-base-850/80 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-500/50 hover:bg-base-800 hover:text-accent-300 transition-all"
                          >
                            "{prompt}"
                          </button>
                        ))}
                      </div>
                    }
                  />
                </div>
              )}

              {/* Message List */}
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] space-y-2">
                        {msg.imagePreviewUrl && (
                          <img
                            src={msg.imagePreviewUrl}
                            alt="Attached study material"
                            className="ml-auto max-h-52 rounded-2xl border border-base-750 shadow-md object-cover"
                          />
                        )}
                        <div className="rounded-2xl rounded-br-md bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-3 text-sm text-white shadow-glow-sm">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <DocuMindLogo variant="icon" size="sm" className="mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink-200">DocuMind AI</span>
                          <span className="rounded bg-accent-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-accent-300">
                            Teacher
                          </span>
                        </div>
                        <AIResponseRenderer
                          content={msg.content}
                          sources={msg.sources}
                          onPageClick={handleSourcePageClick}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking State */}
              {sending && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <DocuMindLogo variant="icon" size="sm" className="mt-1 shrink-0" />
                  <div className="flex-1 rounded-2xl border border-base-750 bg-base-900/60 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-accent-400 animate-ping" />
                      <span className="text-xs font-semibold text-accent-300">
                        {thinkingSteps[thinkingStep]}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
                      <div className="h-full w-3/4 animate-pulse-soft rounded-full bg-gradient-to-r from-accent-500 to-sky-400" />
                    </div>
                  </div>
                </div>
              )}

              {error && <ErrorState message={error} onRetry={() => setError(null)} />}
            </div>
          </div>

          {/* Floating / Docked Composer */}
          <div className="border-t border-base-750/70 bg-base-900/80 px-4 sm:px-6 py-4 backdrop-blur-md">
            <div className="mx-auto max-w-3xl space-y-2">
              {/* Image Preview Pill */}
              {imagePreview && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-base-750 bg-base-850 p-1.5 animate-fade-in">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <span className="text-xs font-medium text-ink-300">Image attached</span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="rounded-lg p-1 text-ink-500 hover:text-ink-100 focus-ring"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input Capsule */}
              <div className="flex items-end gap-2 rounded-2xl border border-base-750 bg-base-950/90 p-2.5 shadow-card transition-all focus-within:border-accent-500/70 focus-within:shadow-glow">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-xl p-2.5 text-ink-400 hover:bg-base-850 hover:text-accent-300 transition-colors focus-ring"
                  title="Attach diagram, handwritten note, or image"
                  aria-label="Attach study image"
                >
                  <ImagePlus size={19} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    selectedDoc
                      ? `Ask anything about ${selectedDoc.filename}...`
                      : "Ask your AI teacher anything..."
                  }
                  className="max-h-36 flex-1 resize-none bg-transparent py-2 text-xs sm:text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && !image)}
                  className="rounded-xl bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-2.5 text-white shadow-glow hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all focus-ring"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <SendHorizontal size={17} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-500 px-1">
                <span>Press <kbd className="font-mono rounded border border-base-750 px-1">Enter</kbd> to send, <kbd className="font-mono rounded border border-base-750 px-1">Shift+Enter</kbd> for new line</span>
                {selectedDoc && (
                  <span className="hidden sm:inline text-accent-400">
                    Source: {selectedDoc.filename}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Document Context & Jump Panel */}
        {selectedDoc && sidePanelOpen && (
          <aside className="hidden lg:flex w-72 flex-col border-l border-base-750/70 bg-base-900/60 p-4 space-y-5 animate-fade-in overflow-y-auto">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Document Context
                </h3>
                <button
                  type="button"
                  onClick={() => setSidePanelOpen(false)}
                  className="rounded p-1 text-ink-400 hover:text-ink-100"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-base-750 bg-base-850 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-accent-400" />
                  <p className="line-clamp-1 text-xs font-semibold text-ink-100" title={selectedDoc.filename}>
                    {selectedDoc.filename}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-400">
                  <span>{selectedDoc.page_count} pages</span>
                  <StatusBadge status={selectedDoc.status} />
                </div>
                <button
                  type="button"
                  onClick={() => setViewerModal({ doc: selectedDoc, page: 1 })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-base-700 bg-base-800 py-1.5 text-xs font-medium text-ink-200 hover:text-white transition-colors"
                >
                  <Eye size={13} />
                  <span>Preview PDF</span>
                </button>
              </div>
            </div>

            {/* Quick study shortcuts */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Quick Study Modes
              </h4>
              <button
                type="button"
                onClick={() => navigate(`/app/summary?document=${selectedDoc.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-base-750 bg-base-850/60 p-2.5 text-left text-xs font-medium text-ink-300 hover:border-sky-500/40 hover:text-sky-300 transition-all"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-sky-400" />
                  <span>Read Summary</span>
                </div>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/app/notes?document=${selectedDoc.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-base-750 bg-base-850/60 p-2.5 text-left text-xs font-medium text-ink-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-all"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-emerald-400" />
                  <span>Study Notes</span>
                </div>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/app/quiz?document=${selectedDoc.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-base-750 bg-base-850/60 p-2.5 text-left text-xs font-medium text-ink-300 hover:border-amber-500/40 hover:text-amber-300 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Practice Quiz</span>
                </div>
                <span>→</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* PDF Citation Viewer Modal */}
      {viewerModal && (
        <PdfViewerModal
          document={viewerModal.doc}
          initialPage={viewerModal.page}
          onClose={() => setViewerModal(null)}
        />
      )}
    </div>
  );
}
