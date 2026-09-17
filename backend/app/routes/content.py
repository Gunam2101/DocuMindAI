from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.llm.groq_client import LLMServiceError
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.learning_path.service import generate_learning_path
from app.notes.service import generate_notes
from app.questions.service import generate_questions
from app.quiz.service import start_quiz, submit_quiz
from app.schemas.content import (
    LearningPathOut,
    NotesOut,
    QuestionGenRequest,
    QuestionSetOut,
    QuizOut,
    QuizResultOut,
    QuizStartRequest,
    QuizSubmitRequest,
    SummaryOut,
)
from app.summaries.service import generate_summary

router = APIRouter(prefix="/api", tags=["content"])


def _get_ready_document(document_id: str, db: Session, user: User) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if document.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this document.")
    if document.status != DocumentStatus.READY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This document is still processing. Please wait until it's ready.")
    return document


@router.post("/summary/{document_id}", response_model=SummaryOut)
def get_summary(
    document_id: str,
    regenerate: bool = Query(False, description="Force regeneration bypassing cache"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_ready_document(document_id, db, current_user)
    try:
        return generate_summary(db, document, current_user.id, regenerate=regenerate)
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/notes/{document_id}", response_model=NotesOut)
def get_notes(
    document_id: str,
    regenerate: bool = Query(False, description="Force regeneration bypassing cache"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_ready_document(document_id, db, current_user)
    try:
        return generate_notes(db, document, current_user.id, regenerate=regenerate)
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/questions", response_model=QuestionSetOut)
def get_questions(req: QuestionGenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_ready_document(req.document_id, db, current_user)
    try:
        return generate_questions(db, document, current_user.id, req)
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/quiz/start", response_model=QuizOut)
def quiz_start(req: QuizStartRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_ready_document(req.document_id, db, current_user)
    try:
        return start_quiz(db, document, current_user.id, req.num_questions)
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/quiz/submit", response_model=QuizResultOut)
def quiz_submit(req: QuizSubmitRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return submit_quiz(db, current_user.id, req)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/learning-path/{document_id}", response_model=LearningPathOut)
def get_learning_path(
    document_id: str,
    language: str = "auto",
    regenerate: bool = Query(False, description="Force regeneration bypassing cache"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_ready_document(document_id, db, current_user)
    try:
        return generate_learning_path(
            db,
            document,
            current_user.id,
            requested_language=language,
            regenerate=regenerate,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

