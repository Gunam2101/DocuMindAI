"""
Orchestrates the full document processing pipeline:

PDF -> extract/OCR -> chunk -> multilingual embed -> FAISS index -> READY

Runs as a FastAPI BackgroundTask so upload returns immediately with
status=UPLOADED/PROCESSING, and the frontend polls for READY/FAILED.
"""
import logging
from collections import Counter

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.documents.chunker import chunk_pages
from app.documents.pdf_processor import extract_pdf_pages, get_page_count
from app.embeddings.embedder import get_embedding_service
from app.models.chunk import DocumentChunk
from app.models.document import Document, DocumentStatus
from app.storage.service import get_storage_service
from app.utils.language import detect_message_language
from app.vector_store.faiss_store import build_index

logger = logging.getLogger("documind")


def _majority_language(texts: list[str]) -> str | None:
    sample = " ".join(texts)[:2000]
    if not sample.strip():
        return None
    return detect_message_language(sample)


def process_document(document_id: str) -> None:
    db: Session = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error("[DOC] Document %s not found in database for processing", document_id)
            return

        document.status = DocumentStatus.PROCESSING
        db.commit()

        storage = get_storage_service()
        local_path = storage.get_local_path(document.stored_path)

        # Stage 1: PDF Extraction & OCR
        logger.info("[DOC] PDF extraction started: doc_id=%s file=%s", document_id, local_path)
        pages = extract_pdf_pages(local_path)
        document.page_count = get_page_count(local_path)
        document.used_ocr = sum(1 for p in pages if p.used_ocr)
        logger.info("[DOC] PDF extraction completed: doc_id=%s pages=%s (OCR used on %s pages)", document_id, document.page_count, document.used_ocr)

        # Stage 2: Chunking
        logger.info("[DOC] Chunking started: doc_id=%s", document_id)
        chunks = chunk_pages(pages)
        if not chunks:
            document.status = DocumentStatus.FAILED
            document.failure_reason = "No extractable text was found in this document, even after OCR."
            db.commit()
            logger.warning("[DOC] Chunking completed: doc_id=%s found 0 chunks; marked FAILED", document_id)
            return
        logger.info("[DOC] Chunking completed: doc_id=%s chunks=%s", document_id, len(chunks))

        document.detected_language = _majority_language([c.text for c in chunks[:20]])

        # Stage 3: Embedding
        logger.info("[DOC] Embedding model loading: initializing embedding service for doc_id=%s", document_id)
        embedder = get_embedding_service()
        logger.info("[DOC] Embedding started: doc_id=%s chunks=%s model=%s", document_id, len(chunks), embedder.model_name)
        vectors = embedder.embed_passages([c.text for c in chunks])
        logger.info("[DOC] Embedding completed: doc_id=%s shape=%s", document_id, getattr(vectors, "shape", len(vectors)))

        # Stage 4: FAISS Indexing
        logger.info("[DOC] FAISS indexing started: doc_id=%s", document_id)
        index_path = build_index(document_id, vectors)
        logger.info("[DOC] FAISS indexing completed: doc_id=%s path=%s", document_id, index_path)

        # Stage 5: Database Metadata Update
        logger.info("[DOC] Database update started: doc_id=%s", document_id)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
        for row, chunk in enumerate(chunks):
            db.add(DocumentChunk(
                document_id=document_id,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                faiss_row=row,
                content=chunk.text,
                language=document.detected_language,
            ))

        document.embedding_model = embedder.model_name
        document.embedding_dim = embedder.dimension
        document.faiss_index_path = index_path
        document.status = DocumentStatus.READY
        document.failure_reason = None
        db.commit()
        logger.info("[DOC] Database update completed: doc_id=%s", document_id)
        logger.info("[DOC] Processing completed: doc_id=%s is READY (%s pages, %s chunks)", document_id, document.page_count, len(chunks))

    except Exception as exc:
        logger.exception("[DOC] Processing failed for document %s: %s", document_id, exc)
        try:
            db.rollback()
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                document.status = DocumentStatus.FAILED
                error_msg = str(exc).strip()
                document.failure_reason = f"Processing error: {error_msg}" if error_msg else "We couldn't process this document. It may be corrupted or in an unsupported format."
                db.commit()
                logger.info("[DOC] Document %s status updated to FAILED: %s", document_id, document.failure_reason)
        except Exception as rollback_exc:
            logger.exception("[DOC] Error updating document %s to FAILED: %s", document_id, rollback_exc)
    finally:
        db.close()
