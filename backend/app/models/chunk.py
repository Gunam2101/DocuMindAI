import uuid

from sqlalchemy import Column, String, Integer, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentChunk(Base):
    """
    A single chunk of extracted text from a document page.
    faiss_row maps this chunk to its row index inside the document's FAISS index,
    so retrieval results (row indices) can be mapped back to text + page number.
    """
    __tablename__ = "document_chunks"
    __table_args__ = (
        Index("ix_document_chunks_doc_page", "document_id", "page_number"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)

    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    faiss_row = Column(Integer, nullable=False)

    content = Column(Text, nullable=False)
    language = Column(String(32), nullable=True)

    document = relationship("Document", back_populates="chunks")
