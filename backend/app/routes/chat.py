import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.chat.service import handle_chat_turn
from app.config import get_settings
from app.database import get_db
from app.llm.groq_client import LLMServiceError
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ChatResponse, ConversationOut, MessageOut, SourceRef

router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
MAX_IMAGE_MB = 15


@router.post("", response_model=ChatResponse)
async def send_message(
    message: str = Form(""),
    conversation_id: str | None = Form(None),
    document_id: str | None = Form(None),
    language: str = Form("auto"),
    image: UploadFile | None = File(None),
    current_page: int | None = Form(None),
    selected_text: str | None = Form(None),
    learning_path_step_id: str | None = Form(None),
    learning_path_topic: str | None = Form(None),
    teaching_level: str = Form("beginner"),
    answer_mode: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not message.strip() and not image and not selected_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a question or attach an image.")

    image_path = None
    if image is not None:
        ext = os.path.splitext(image.filename or "")[1].lower()
        if ext not in ALLOWED_IMAGE_EXT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type. Use PNG, JPG, or WEBP.")
        contents = await image.read()
        if len(contents) / (1024 * 1024) > MAX_IMAGE_MB:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image is too large. Maximum size is {MAX_IMAGE_MB}MB.")

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        image_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        with open(image_path, "wb") as f:
            f.write(contents)

    try:
        answer, pages, convo_id, message_id = handle_chat_turn(
            db=db,
            user=current_user,
            conversation_id=conversation_id,
            document_id=document_id,
            message=message or (f"Explain this selected text: \"{selected_text}\"" if selected_text else "Explain this image."),
            requested_language=language,
            image_path=image_path,
            current_page=current_page,
            selected_text=selected_text,
            learning_path_step_id=learning_path_step_id,
            learning_path_topic=learning_path_topic,
            teaching_level=teaching_level,
            answer_mode=answer_mode,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


    return ChatResponse(
        answer=answer,
        sources=[SourceRef(page=p) for p in pages],
        conversation_id=convo_id,
        message_id=message_id,
    )


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convos = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [ConversationOut.model_validate(c) for c in convos]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convo = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [MessageOut.model_validate(m) for m in msgs]
