from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SourceRef(BaseModel):
    page: int


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    document_id: Optional[str] = None
    message: str
    language: str = "auto"  # auto | en | ta | hi | ...
    image_path: Optional[str] = None  # set internally after image upload


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceRef] = []
    conversation_id: str
    message_id: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    sources: list[dict] = []
    language: Optional[str] = None
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    document_id: Optional[str] = None
    updated_at: datetime


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
