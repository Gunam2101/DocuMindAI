import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer

from app.database import Base


class GeneratedSummary(Base):
    __tablename__ = "generated_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    overview = Column(Text, nullable=False)
    main_topics = Column(JSON, default=list)
    key_concepts = Column(JSON, default=list)
    key_takeaways = Column(JSON, default=list)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GeneratedNote(Base):
    __tablename__ = "generated_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    topics = Column(JSON, default=list)  # [{title, definition, explanation, key_points:[], examples:[], source_page}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GeneratedQuestionSet(Base):
    __tablename__ = "generated_question_sets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    config = Column(JSON, default=dict)  # {num_questions, question_type, difficulty, marks}
    questions = Column(JSON, default=list)  # [{type, prompt, options?, answer, marks}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    questions = Column(JSON, default=list)  # [{id, prompt, options:[4], correct_index, explanation}]
    answers = Column(JSON, default=dict)  # {question_id: selected_index}
    score = Column(Integer, nullable=True)
    total = Column(Integer, nullable=True)
    completed = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GeneratedLearningPath(Base):
    __tablename__ = "generated_learning_paths"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    language = Column(String(32), default="auto")
    title = Column(String(255), nullable=False)
    steps = Column(JSON, default=list)  # [{id, step_number, title, description, source_pages, recommended_action}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
