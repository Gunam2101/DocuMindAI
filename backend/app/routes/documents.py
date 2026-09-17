import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.config import get_settings
from app.database import get_db
from app.documents.ingestion import process_document
from app.models.chunk import DocumentChunk
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentOut
from app.storage.service import get_storage_service

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger("documind")
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf"}


def _safe_filename(original: str) -> str:
    base = os.path.basename(original)
    ext = os.path.splitext(base)[1].lower()
    return f"{uuid.uuid4()}{ext}"


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported right now.",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    logger.info("[DOC] Upload started: user=%s filename=%s size_mb=%.2f", current_user.id, file.filename, size_mb)
    if size_mb > settings.MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File is too large. Maximum size is {settings.MAX_UPLOAD_MB}MB.",
        )
    if size_mb == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    storage = get_storage_service()
    original_filename = file.filename or "document.pdf"
    stored_path = storage.save_file(contents, original_filename, content_type="application/pdf")

    document = Document(
        user_id=current_user.id,
        filename=original_filename,
        stored_path=stored_path,
        status=DocumentStatus.UPLOADING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info("[DOC] File saved: doc_id=%s user=%s filename=%s stored=%s", document.id, current_user.id, document.filename, stored_path)

    # In serverless environments where background tasks are terminated on response exit,
    # SYNC_DOCUMENT_PROCESSING=True allows running pipeline synchronously.
    if settings.SYNC_DOCUMENT_PROCESSING:
        process_document(document.id)
        db.refresh(document)
    else:
        background_tasks.add_task(process_document, document.id)

    return DocumentOut.model_validate(document)


@router.get("", response_model=DocumentListResponse)
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.last_activity_at.desc())
        .all()
    )
    return DocumentListResponse(documents=[DocumentOut.model_validate(d) for d in docs])


def _get_owned_document(document_id: str, db: Session, current_user: User) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this document.")
    return document


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_owned_document(document_id, db, current_user)
    return DocumentOut.model_validate(document)


@router.get("/{document_id}/status")
def get_document_status(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Safe diagnostic endpoint returning ingestion details without exposing sensitive info."""
    document = _get_owned_document(document_id, db, current_user)
    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).count()
    return {
        "id": document.id,
        "filename": document.filename,
        "status": document.status,
        "page_count": document.page_count,
        "chunks_count": chunks_count,
        "embedding_model": document.embedding_model,
        "embedding_dim": document.embedding_dim,
        "used_ocr": document.used_ocr,
        "detected_language": document.detected_language,
        "failure_reason": document.failure_reason,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
    }


@router.get("/{document_id}/view")
def view_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Serves the actual stored PDF file inline for viewing, enforcing user ownership."""
    document = _get_owned_document(document_id, db, current_user)
    storage = get_storage_service()
    try:
        content = storage.get_file(document.stored_path)
    except Exception as exc:
        logger.error("[STORAGE] error retrieving document %s: %s", document_id, exc)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored document file could not be found.")

    safe_name = document.filename.replace('"', '\\"')
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{safe_name}"',
            "Content-Type": "application/pdf",
        },
    )


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Serves the actual stored PDF file as an attachment for download, enforcing user ownership."""
    document = _get_owned_document(document_id, db, current_user)
    storage = get_storage_service()
    try:
        content = storage.get_file(document.stored_path)
    except Exception as exc:
        logger.error("[STORAGE] error downloading document %s: %s", document_id, exc)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored document file could not be found.")

    safe_name = document.filename.replace('"', '\\"')
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Type": "application/pdf",
        },
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_owned_document(document_id, db, current_user)
    storage = get_storage_service()

    try:
        if document.stored_path:
            storage.delete_file(document.stored_path)
        if document.faiss_index_path and os.path.exists(document.faiss_index_path):
            os.remove(document.faiss_index_path)
    except OSError:
        logger.warning("[DOCUMENTS] could not remove files for document %s", document_id)

    db.delete(document)
    db.commit()
    return None


@router.post("/{document_id}/touch", response_model=DocumentOut)
def touch_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Updates last_activity_at — called when a user opens/continues a document."""
    document = _get_owned_document(document_id, db, current_user)
    document.last_activity_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(document)
    return DocumentOut.model_validate(document)
