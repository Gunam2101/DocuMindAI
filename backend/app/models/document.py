import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentStatus:
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"  # alias for backward compatibility
    PROCESSING = "PROCESSING"
    READY = "READY"
    COMPLETED = "READY"  # alias for completed/ready status
    FAILED = "FAILED"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    filename = Column(String(512), nullable=False)
    stored_path = Column(String(1024), nullable=False)
    page_count = Column(Integer, default=0)
    status = Column(String(32), default=DocumentStatus.UPLOADED)
    failure_reason = Column(Text, nullable=True)

    detected_language = Column(String(32), nullable=True)
    used_ocr = Column(Integer, default=0)  # boolean-ish flag (0/1) count of OCR'd pages

    embedding_model = Column(String(255), nullable=True)
    embedding_dim = Column(Integer, nullable=True)
    faiss_index_path = Column(String(1024), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_activity_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
