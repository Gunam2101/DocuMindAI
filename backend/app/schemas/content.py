from typing import Optional, Literal

from pydantic import BaseModel


class SummaryOut(BaseModel):
    overview: str
    main_topics: list[str]
    key_concepts: list[str]
    key_takeaways: list[str]


class NoteTopic(BaseModel):
    title: str
    definition: str
    explanation: str
    key_points: list[str]
    examples: list[str]
    source_page: Optional[int] = None


class NotesOut(BaseModel):
    topics: list[NoteTopic]


class QuestionGenRequest(BaseModel):
    document_id: str
    num_questions: int = 5
    question_type: Literal["mcq", "short", "long", "mixed"] = "mixed"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    marks: int = 5


class GeneratedQuestion(BaseModel):
    type: Literal["mcq", "short", "long"]
    prompt: str
    options: Optional[list[str]] = None
    answer: str
    marks: int
    source_page: Optional[int] = None


class QuestionSetOut(BaseModel):
    questions: list[GeneratedQuestion]


class QuizStartRequest(BaseModel):
    document_id: str
    num_questions: int = 10


class QuizQuestionOut(BaseModel):
    id: str
    prompt: str
    options: list[str]


class QuizOut(BaseModel):
    quiz_id: str
    questions: list[QuizQuestionOut]


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: dict[str, int]  # question_id -> selected option index


class QuizResultQuestion(BaseModel):
    id: str
    prompt: str
    options: list[str]
    correct_index: int
    selected_index: Optional[int] = None
    is_correct: bool
    explanation: str


class QuizResultOut(BaseModel):
    score: int
    total: int
    accuracy: float
    review: list[QuizResultQuestion]


class LearningStepOut(BaseModel):
    id: str
    step_number: int
    title: str
    description: str
    source_pages: list[int] = []
    recommended_action: str = "ask_ai"  # "read" | "ask_ai" | "study_notes" | "questions" | "quiz"


class LearningPathOut(BaseModel):
    document_id: str
    title: str
    steps: list[LearningStepOut]
