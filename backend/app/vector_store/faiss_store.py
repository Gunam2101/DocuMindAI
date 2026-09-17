"""
Per-document FAISS index management.

Each document gets its own FAISS index file on disk (IndexFlatIP, since
embeddings are normalized -> inner product == cosine similarity).

Critical safety rules implemented here (per spec section 15):
  - Never hardcode the embedding dimension; it's always read from the
    active embedding model.
  - If an existing index's dimension doesn't match the current embedding
    model's dimension, the mismatch is detected and the index is safely
    rebuilt from source chunks rather than searched.
  - Never fall back to random embeddings.
"""
import os

import faiss
import numpy as np

from app.config import get_settings

settings = get_settings()


def _index_path(document_id: str) -> str:
    os.makedirs(settings.FAISS_INDEX_DIR, exist_ok=True)
    return os.path.join(settings.FAISS_INDEX_DIR, f"{document_id}.index")


def build_index(document_id: str, embeddings: np.ndarray) -> str:
    """Builds a fresh FAISS index for a document and persists it to disk."""
    if embeddings.ndim != 2 or embeddings.shape[0] == 0:
        raise ValueError("Cannot build a FAISS index from empty embeddings.")

    dimension = embeddings.shape[1]  # derived from the actual embedding vectors
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype("float32"))

    path = _index_path(document_id)
    faiss.write_index(index, path)
    return path


def load_index(path: str, expected_dimension: int):
    """
    Loads an index from disk, verifying its dimension matches the currently
    active embedding model. Returns None if the index is missing or
    incompatible (mismatch), signalling the caller to rebuild.
    """
    if not path or not os.path.exists(path):
        return None

    index = faiss.read_index(path)
    if index.d != expected_dimension:
        # Dimension mismatch (e.g. embedding model was changed) — do NOT search
        # an incompatible index. Caller must rebuild.
        return None

    return index


def search(index, query_embedding: np.ndarray, top_k: int = 5):
    """Returns (scores, row_indices) for the top_k nearest chunks."""
    query = query_embedding.reshape(1, -1).astype("float32")
    scores, rows = index.search(query, top_k)
    return scores[0], rows[0]
