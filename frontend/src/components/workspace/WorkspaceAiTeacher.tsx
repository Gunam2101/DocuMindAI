import React, { useState, useRef, useEffect } from "react";
import {
  SendHorizontal,
  ImagePlus,
  X,
  Sparkles,
  RotateCcw,
  BookOpen,
  HelpCircle,
  FileQuestion,
  Lightbulb,
  Compass,
  MessageSquare,
  ChevronDown,
  Award,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import type {
  Document,
  ChatMessage,
  LearningPath,
  LearningStep,
  LearningStepAction,
} from "../../types";
import * as chatService from "../../services/chatService";
import type { TeachingLevel, AnswerMode } from "../../services/chatService";
import { getErrorMessage } from "../../services/apiClient";
import AIResponseRenderer from "../AIResponseRenderer";
import DocuMindLogo from "../DocuMindLogo";
import LearningPathTimeline from "../learning/LearningPathTimeline";

interface WorkspaceAiTeacherProps {
  document: Document;
  currentPage: number;
  initialPrompt?: string;
  onPageClick?: (page: number) => void;
  className?: string;
  // Learning Path integration
  learningPath?: LearningPath | null;
  activeStepId?: string | null;
  activeTopic?: string | null;
  selectedText?: string | null;
  completedStepIds?: string[];
  isLoadingPath?: boolean;
  onSelectStep?: (step: LearningStep) => void;
  onToggleCompleteStep?: (stepId: string) => void;
  onRegeneratePath?: () => void;
  onActionTrigger?: (action: LearningStepAction, step: LearningStep) => void;
  onClearSelectedText?: () => void;
  onClearActiveTopic?: () => void;
  onNextStep?: () => void;
  initialTab?: "chat" | "path";
}

const LANGUAGES = [
  { code: "auto", label: "Auto (Detect)" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "ta", label: "Tanglish (Tamil/English)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
];

const TEACHING_LEVELS: { id: TeachingLevel; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "Intuitive analogies & everyday examples" },
  { id: "intermediate", label: "Intermediate", desc: "Standard academic & technical terminology" },
  { id: "advanced", label: "Advanced", desc: "Deep mechanisms, edge cases & rigor" },
];

const ANSWER_MODES: { id: AnswerMode; label: string; desc: string }[] = [
  { id: "auto", label: "Auto Mode", desc: "Adaptive explanation length" },
  { id: "quick", label: "Quick", desc: "1-3 direct sentences" },
  { id: "2_marks", label: "2 Marks", desc: "Definition + 1-2 points" },
  { id: "5_marks", label: "5 Marks", desc: "Definition, explanation, points & example" },
  { id: "10_marks", label: "10 Marks", desc: "Comprehensive structured essay" },
  { id: "detailed", label: "Detailed", desc: "In-depth teaching tutorial" },
];

export default function WorkspaceAiTeacher({
  document: doc,
  currentPage,
  initialPrompt,
  onPageClick,
  className = "",
  learningPath,
  activeStepId = null,
  activeTopic = null,
  selectedText = null,
  completedStepIds = [],
  isLoadingPath = false,
  onSelectStep,
  onToggleCompleteStep,
  onRegeneratePath,
  onActionTrigger,
  onClearSelectedText,
  onClearActiveTopic,
  onNextStep,
  initialTab = "chat",
}: WorkspaceAiTeacherProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "path">(initialTab);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("auto");
  const [teachingLevel, setTeachingLevel] = useState<TeachingLevel>("beginner");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("auto");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageContextActive, setPageContextActive] = useState(true);

  // Local active topic state if passed from timeline
  const [currentTopic, setCurrentTopic] = useState<string | null>(activeTopic);
  const [currentSelectedText, setCurrentSelectedText] = useState<string | null>(selectedText);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTopic !== undefined) {
      setCurrentTopic(activeTopic);
    }
  }, [activeTopic]);

  useEffect(() => {
    if (selectedText !== undefined) {
      setCurrentSelectedText(selectedText);
    }
  }, [selectedText]);

  // Sync initial tab when changed externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current && activeTab === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, activeTab]);

  // Handle external prompt trigger
  useEffect(() => {
    if (initialPrompt) {
      setActiveTab("chat");
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if ((!query && !image && !currentSelectedText) || sending) return;

    setError(null);

    const localUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query || (currentSelectedText ? `Explain: "${currentSelectedText}"` : "Explain this image."),
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
        message: query || (currentSelectedText ? `Explain this highlighted text: "${currentSelectedText}"` : "Explain this image."),
        conversationId: conversationId || undefined,
        documentId: doc.id,
        language,
        image: sentImage,
        currentPage: pageContextActive ? currentPage : undefined,
        selectedText: currentSelectedText || undefined,
        learningPathStepId: activeStepId || undefined,
        learningPathTopic: currentTopic || undefined,
        teachingLevel,
        answerMode,
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
      setError(getErrorMessage(err, "AI Teacher is temporarily unavailable. Please try again."));
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

  function resetConversation() {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }

  // Hook for "Teach Me" from learning path
  function handleTeachMeStep(step: LearningStep) {
    setActiveTab("chat");
    setCurrentTopic(step.title);
    if (step.source_pages && step.source_pages.length > 0 && onPageClick) {
      onPageClick(step.source_pages[0]);
    }
    const prompt = `Teach me about "${step.title}" from this document. Please guide me step-by-step: 1. Simple explanation, 2. Why it matters, 3. How it works, 4. Concrete example, 5. Key takeaway.`;
    handleSend(prompt);
  }

  return (
    <div className={`flex flex-col h-full bg-base-900/95 border-l border-base-750/70 overflow-hidden ${className}`}>
      {/* 1. Header & Controls Strip */}
      <div className="flex flex-col border-b border-base-750/60 bg-base-900 px-3 py-2.5 shrink-0 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocuMindLogo variant="icon" size="xs" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-300">
                DocuMind AI Teacher
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
                <span className={`h-1.5 w-1.5 rounded-full ${sending ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                <span>{sending ? "Teaching..." : "Ready to explain"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetConversation}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-ink-200 transition-colors focus-ring"
            title="Clear chat history"
            aria-label="Clear chat"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Tab Switcher: [ AI Teacher ] | [ Learning Path ] */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-base-950/80 p-1 border border-base-750/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all focus-ring ${
              activeTab === "chat"
                ? "bg-accent-600/30 text-accent-200 border border-accent-500/40 shadow-glow-sm"
                : "text-ink-400 hover:text-ink-200"
            }`}
          >
            <MessageSquare size={13} />
            <span>AI Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("path")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all focus-ring ${
              activeTab === "path"
                ? "bg-accent-600/30 text-accent-200 border border-accent-500/40 shadow-glow-sm"
                : "text-ink-400 hover:text-ink-200"
            }`}
          >
            <Compass size={13} />
            <span>Learning Path</span>
            {learningPath?.steps?.length ? (
              <span className="ml-1 rounded-full bg-accent-500/20 px-1.5 py-0.2 text-[10px] font-mono text-accent-300">
                {completedStepIds.length}/{learningPath.steps.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Adaptive Controls: [ Teaching Level ] & [ Answer Mode ] */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {/* Level Selector */}
            <div className="relative">
              <select
                value={teachingLevel}
                onChange={(e) => setTeachingLevel(e.target.value as TeachingLevel)}
                aria-label="Teaching level"
                className="w-full appearance-none rounded-lg border border-base-750 bg-base-950/90 py-1 pl-2 pr-6 text-[11px] font-semibold text-accent-300 focus-ring"
              >
                {TEACHING_LEVELS.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    🎓 {lvl.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400" />
            </div>

            {/* Answer Mode Selector */}
            <div className="relative">
              <select
                value={answerMode}
                onChange={(e) => setAnswerMode(e.target.value as AnswerMode)}
                aria-label="Answer mode"
                className="w-full appearance-none rounded-lg border border-base-750 bg-base-950/90 py-1 pl-2 pr-6 text-[11px] font-semibold text-ink-200 focus-ring"
              >
                {ANSWER_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    📝 {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400" />
            </div>
          </div>
        )}
      </div>

      {/* 2. TAB: Learning Path View */}
      {activeTab === "path" && (
        <div className="flex-1 overflow-hidden">
          <LearningPathTimeline
            path={learningPath || null}
            activeStepId={activeStepId}
            completedStepIds={completedStepIds}
            onSelectStep={(step) => {
              if (onSelectStep) onSelectStep(step);
              setCurrentTopic(step.title);
              if (step.source_pages && step.source_pages.length > 0 && onPageClick) {
                onPageClick(step.source_pages[0]);
              }
            }}
            onTeachMe={handleTeachMeStep}
            onToggleComplete={(stepId) => {
              if (onToggleCompleteStep) onToggleCompleteStep(stepId);
            }}
            onOpenPage={onPageClick}
            onActionTrigger={onActionTrigger}
            isLoading={isLoadingPath}
            onRegenerate={onRegeneratePath}
          />
        </div>
      )}

      {/* 3. TAB: AI Teacher Chat View */}
      {activeTab === "chat" && (
        <>
          {/* Active Simultaneous Contexts Strip */}
          <div className="border-b border-base-750/50 bg-base-950/70 px-3 py-2 shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-ink-400 font-medium">Context:</span>

              {/* Page Pill */}
              <button
                type="button"
                onClick={() => setPageContextActive(!pageContextActive)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold transition-colors ${
                  pageContextActive
                    ? "bg-accent-600/20 text-accent-300 border border-accent-500/40"
                    : "bg-base-800 text-ink-400 border border-base-750"
                }`}
                title="Toggle page context"
              >
                <span>📄 Page {currentPage}</span>
                <span className="text-[10px] opacity-70">({pageContextActive ? "Active" : "Off"})</span>
              </button>

              {/* Active Learning Path Topic Pill */}
              {currentTopic && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-semibold text-amber-300">
                  <span>🎯 {currentTopic}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTopic(null);
                      if (onClearActiveTopic) onClearActiveTopic();
                    }}
                    className="hover:text-white"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Selected Text Pill */}
              {currentSelectedText && (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 font-semibold text-sky-300">
                  <span className="truncate max-w-[130px]">✦ "{currentSelectedText}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSelectedText(null);
                      if (onClearSelectedText) onClearSelectedText();
                    }}
                    className="hover:text-white"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => handleSend(`Explain the core concept of page ${currentPage} simply.`)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/80 px-2 py-1 text-[10px] font-medium text-ink-300 hover:text-white hover:bg-base-750 border border-base-750 transition-colors"
              >
                <Lightbulb size={11} className="text-amber-400" />
                <span>Explain Page</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend(`Summarize the key takeaways from page ${currentPage}.`)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/80 px-2 py-1 text-[10px] font-medium text-ink-300 hover:text-white hover:bg-base-750 border border-base-750 transition-colors"
              >
                <BookOpen size={11} className="text-sky-400" />
                <span>Key Points</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend(`Test me with a quick conceptual question from page ${currentPage}.`)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/80 px-2 py-1 text-[10px] font-medium text-ink-300 hover:text-white hover:bg-base-750 border border-base-750 transition-colors"
              >
                <FileQuestion size={11} className="text-emerald-400" />
                <span>Test Me</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 text-ink-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600/10 border border-accent-500/30 text-accent-400 shadow-glow">
                  <Sparkles size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wider">
                    Your Personal Document Teacher
                  </h3>
                  <p className="text-xs text-ink-400 max-w-xs leading-relaxed">
                    Ask questions in any language (English, Tamil, Tanglish, Hindi, Telugu),
                    select text in the PDF to explain, or click <strong>Teach Me</strong> on any topic.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, msgIdx) => {
              const isUser = msg.role === "user";
              const isLastAssistant = !isUser && msgIdx === messages.length - 1;

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}>
                  <div
                    className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all shadow-sm ${
                      isUser
                        ? "bg-accent-600 text-white rounded-br-xs shadow-glow-sm"
                        : "bg-base-850/90 text-ink-100 border border-base-750/70 rounded-bl-xs w-full"
                    }`}
                  >
                    {msg.imagePreviewUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-white/20">
                        <img src={msg.imagePreviewUrl} alt="Attached diagram" className="max-h-40 w-full object-cover" />
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <AIResponseRenderer content={msg.content} />
                    )}

                    {/* Sources / Citations */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-base-750/60 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-ink-400 font-medium">Referenced:</span>
                        {msg.sources.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onPageClick && onPageClick(src.page)}
                            className="inline-flex items-center gap-1 rounded bg-base-800 px-1.5 py-0.5 text-[10px] font-mono text-accent-300 border border-base-750 hover:border-accent-500/50 hover:text-accent-200 transition-colors"
                            title={`Jump to page ${src.page}`}
                          >
                            <span>p.{src.page}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contextual Follow-Up Intelligence (Shown below the latest assistant reply) */}
                  {isLastAssistant && !sending && (
                    <div className="w-full pt-1 space-y-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                          type="button"
                          onClick={() => handleSend("Please explain this simpler with an intuitive everyday analogy.")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/90 border border-base-750 px-2 py-1 text-[11px] font-semibold text-ink-300 hover:text-white hover:bg-base-750 transition-colors"
                        >
                          <Lightbulb size={11} className="text-amber-400" />
                          <span>Explain Simpler</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSend("Can you give a clear, real-world example of this concept?")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/90 border border-base-750 px-2 py-1 text-[11px] font-semibold text-ink-300 hover:text-white hover:bg-base-750 transition-colors"
                        >
                          <Sparkles size={11} className="text-accent-400" />
                          <span>Give Example</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSend("Why is this concept important, and what core problem does it solve?")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/90 border border-base-750 px-2 py-1 text-[11px] font-semibold text-ink-300 hover:text-white hover:bg-base-750 transition-colors"
                        >
                          <HelpCircle size={11} className="text-sky-400" />
                          <span>Why?</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSend("Can you explain the deeper mechanisms and technical details behind this?")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-base-800/90 border border-base-750 px-2 py-1 text-[11px] font-semibold text-ink-300 hover:text-white hover:bg-base-750 transition-colors"
                        >
                          <SlidersHorizontal size={11} className="text-violet-400" />
                          <span>Go Deeper</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSend("Test me with one quick check question about the concept we just discussed to test my understanding.")}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                        >
                          <FileQuestion size={11} className="text-emerald-400" />
                          <span>Test Me</span>
                        </button>
                      </div>

                      {/* Next Step / Topic Completion Card if studying a topic */}
                      {currentTopic && onNextStep && (
                        <div className="flex items-center justify-between rounded-xl bg-accent-950/40 border border-accent-500/30 p-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-ink-200">
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                            <span>Done with <strong>{currentTopic}</strong>?</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeStepId && onToggleCompleteStep) {
                                onToggleCompleteStep(activeStepId);
                              }
                              onNextStep();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent-500 transition-colors shadow-glow-sm"
                          >
                            <span>Next Topic</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking indicator */}
            {sending && (
              <div className="flex items-center gap-2 rounded-2xl bg-base-850/80 border border-base-750/60 p-3 max-w-[75%]">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px] text-ink-400 font-medium">DocuMind AI Teacher is formulating response...</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Attached Image Preview */}
          {imagePreview && (
            <div className="relative mx-3 mb-1 flex items-center gap-2 rounded-xl border border-base-750 bg-base-850 p-2">
              <img src={imagePreview} alt="Attached" className="h-12 w-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-100 truncate">{image?.name}</p>
                <p className="text-[10px] text-ink-400">Diagram analysis active</p>
              </div>
              <button
                type="button"
                onClick={clearImage}
                className="rounded-lg p-1 text-ink-400 hover:text-white hover:bg-base-750"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-base-750/60 bg-base-900 shrink-0">
            <div className="relative rounded-2xl border border-base-750 bg-base-950/80 focus-within:border-accent-500/70 focus-within:ring-1 focus-within:ring-accent-500/30 transition-all p-2 space-y-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentSelectedText
                    ? `Ask about highlighted text...`
                    : currentTopic
                    ? `Ask about ${currentTopic}...`
                    : pageContextActive
                    ? `Ask anything about page ${currentPage}...`
                    : "Ask your AI teacher..."
                }
                rows={2}
                className="w-full resize-none bg-transparent text-xs text-ink-100 placeholder:text-ink-500 focus:outline-hidden"
              />

              <div className="flex items-center justify-between pt-1 border-t border-base-800">
                {/* Options: Language + Image attachment */}
                <div className="flex items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelected}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg border border-base-750 bg-base-850 px-2 py-1 text-[10px] font-medium text-ink-300 hover:text-white hover:border-accent-500/40 transition-colors focus-ring"
                    title="Attach diagram or screenshot"
                  >
                    <ImagePlus size={12} />
                    <span className="hidden sm:inline">Image</span>
                  </button>

                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    aria-label="Answer language"
                    className="rounded-lg border border-base-750 bg-base-850 px-1.5 py-1 text-[10px] font-medium text-ink-300 focus-ring"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !image && !currentSelectedText) || sending}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm hover:from-accent-500 hover:to-accent-600 disabled:opacity-40 transition-all focus-ring"
                >
                  <span>Ask</span>
                  <SendHorizontal size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
