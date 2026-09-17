from sqlalchemy.orm import Session

from app.models.chunk import DocumentChunk
from app.models.document import Document

MAX_CONTEXT_CHARS = 12000


def get_full_context(db: Session, document: Document, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """
    Builds a representative, page-ordered slice of the document's chunks for
    tasks (summary/notes/questions) that need broad coverage rather than a
    single similarity-search query. Capped to keep prompts within budget.
    """
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.page_number, DocumentChunk.chunk_index)
        .all()
    )

    parts = []
    total = 0
    for c in chunks:
        piece = f"[Page {c.page_number}]\n{c.content}\n"
        if total + len(piece) > max_chars:
            break
        parts.append(piece)
        total += len(piece)

    return "\n".join(parts)
