export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
  theme: "dark" | "light";
  response_style: "concise" | "detailed";
}

export type DocumentStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

export interface Document {
  id: string;
  filename: string;
  page_count: number;
  status: DocumentStatus;
  failure_reason?: string | null;
  detected_language?: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface SourceRef {
  page: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceRef[];
  language?: string;
  created_at: string;
  pending?: boolean;
  imagePreviewUrl?: string;
}

export interface Conversation {
  id: string;
  title: string;
  document_id?: string | null;
  updated_at: string;
}

export interface SummaryData {
  overview: string;
  main_topics: string[];
  key_concepts: string[];
  key_takeaways: string[];
}

export interface NoteTopic {
  title: string;
  definition: string;
  explanation: string;
  key_points: string[];
  examples: string[];
  source_page?: number | null;
}

export interface NotesData {
  topics: NoteTopic[];
}

export type QuestionType = "mcq" | "short" | "long" | "mixed";
export type Difficulty = "easy" | "medium" | "hard";

export interface GeneratedQuestion {
  type: "mcq" | "short" | "long";
  prompt: string;
  options?: string[] | null;
  answer: string;
  marks: number;
  source_page?: number | null;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface QuizResultQuestion extends QuizQuestion {
  correct_index: number;
  selected_index?: number | null;
  is_correct: boolean;
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  accuracy: number;
  review: QuizResultQuestion[];
}

export type LearningStepAction = 'read' | 'ask_ai' | 'study_notes' | 'questions' | 'quiz';

export interface LearningStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  source_pages: number[];
  recommended_action: LearningStepAction;
}

export interface LearningPath {
  document_id: string;
  title: string;
  steps: LearningStep[];
}

export interface ApiError {
  detail: string;
  error_code: string;
}

