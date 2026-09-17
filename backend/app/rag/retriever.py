"""
Retrieval-Augmented Generation retriever.

Given a document and a natural-language query (in any supported language),
embeds the query with the same multilingual model used at ingestion time,
searches the document's FAISS index, and maps the returned row indices
back to their DocumentChunk rows (which carry page numbers and raw text).

If the on-disk index's dimension doesn't match the currently active
embedding model (e.g. the model was changed in config), the index is
safely rebuilt from the document's existing chunks rather than searched
against an incompatible space.
"""
from dataclasses import dataclass

import numpy as np
from sqlalchemy.orm import Session

from app.embeddings.embedder import get_embedding_service
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.vector_store.faiss_store import build_index, load_index, search

TOP_K = 5


@dataclass
class RetrievedChunk:
    page_number: int
    text: str
    score: float


def _rebuild_index_from_chunks(db: Session, document: Document) -> tuple:
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.faiss_row)
        .all()
    )
    if not chunks:
        return None, []

    embedder = get_embedding_service()
    vectors = embedder.embed_passages([c.content for c in chunks])
    path = build_index(document.id, vectors)

    document.embedding_model = embedder.model_name
    document.embedding_dim = embedder.dimension
    document.faiss_index_path = path
    db.commit()

    index = load_index(path, embedder.dimension)
    return index, chunks


def retrieve(db: Session, document: Document, query: str, top_k: int = TOP_K, user_id: str | None = None) -> list[RetrievedChunk]:
    if user_id is not None and document.user_id != user_id:
        raise PermissionError("Access denied: document does not belong to this user.")

    embedder = get_embedding_service()

    index = load_index(document.faiss_index_path, embedder.dimension)
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.faiss_row)
        .all()
    )

    if index is None:
        # Missing or dimension-mismatched index -> safe rebuild, never search
        # an incompatible index and never fall back to random vectors.
        index, chunks = _rebuild_index_from_chunks(db, document)

    if index is None or not chunks:
        return []

    query_vec = embedder.embed_query(query)
    scores, rows = search(index, query_vec, top_k=min(top_k, len(chunks)))

    row_to_chunk = {c.faiss_row: c for c in chunks}
    results: list[RetrievedChunk] = []
    for score, row in zip(scores, rows):
        if row == -1:
            continue
        chunk = row_to_chunk.get(int(row))
        if chunk:
            results.append(RetrievedChunk(page_number=chunk.page_number, text=chunk.content, score=float(score)))

    return results


def unique_pages(chunks: list[RetrievedChunk]) -> list[int]:
    seen = []
    for c in chunks:
        if c.page_number not in seen:
            seen.append(c.page_number)
    return sorted(seen)
