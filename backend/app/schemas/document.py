from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    page_count: int
    status: str
    failure_reason: Optional[str] = None
    detected_language: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentOut]
