import { apiClient } from "./apiClient";
import type {
  Difficulty,
  GeneratedQuestion,
  LearningPath,
  NotesData,
  QuestionType,
  QuizQuestion,
  QuizResult,
  SummaryData,
} from "../types";

export async function getLearningPath(documentId: string, language: string = "auto"): Promise<LearningPath> {
  const { data } = await apiClient.post<LearningPath>(`/api/learning-path/${documentId}?language=${encodeURIComponent(language)}`);
  return data;
}

export async function generateSummary(documentId: string): Promise<SummaryData> {
  const { data } = await apiClient.post<SummaryData>(`/api/summary/${documentId}`);
  return data;
}

export async function generateNotes(documentId: string): Promise<NotesData> {
  const { data } = await apiClient.post<NotesData>(`/api/notes/${documentId}`);
  return data;
}

export interface QuestionGenParams {
  documentId: string;
  numQuestions: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  marks: number;
}

export async function generateQuestions(params: QuestionGenParams): Promise<GeneratedQuestion[]> {
  const { data } = await apiClient.post<{ questions: GeneratedQuestion[] }>("/api/questions", {
    document_id: params.documentId,
    num_questions: params.numQuestions,
    question_type: params.questionType,
    difficulty: params.difficulty,
    marks: params.marks,
  });
  return data.questions;
}

export interface QuizStart {
  quiz_id: string;
  questions: QuizQuestion[];
}

export async function startQuiz(documentId: string, numQuestions: number): Promise<QuizStart> {
  const { data } = await apiClient.post<QuizStart>("/api/quiz/start", {
    document_id: documentId,
    num_questions: numQuestions,
  });
  return data;
}

export async function submitQuiz(quizId: string, answers: Record<string, number>): Promise<QuizResult> {
  const { data } = await apiClient.post<QuizResult>("/api/quiz/submit", { quiz_id: quizId, answers });
  return data;
}
