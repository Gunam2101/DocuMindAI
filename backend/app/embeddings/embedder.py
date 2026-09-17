"""
Multilingual embedding service.

Uses a sentence-transformers model specifically trained for multilingual
semantic retrieval (default: intfloat/multilingual-e5-large), so that a
Tamil question can retrieve semantically-relevant English document chunks
and vice versa.

The model is loaded once (singleton) and reused across requests — never
reloaded per call. Embedding dimension is always read from the model
itself (`model.get_sentence_embedding_dimension()`), never hardcoded.
"""
import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("documind")


class EmbeddingService:
    def __init__(self, model_name: str, device: str = "cpu"):
        self.model_name = model_name
        logger.info("[DOC] Embedding model loading: loading %s on %s (first load downloads weights if not cached)...", model_name, device)
        self.model = SentenceTransformer(model_name, device=device)
        get_dim = getattr(self.model, "get_embedding_dimension", None) or self.model.get_sentence_embedding_dimension
        self.dimension = int(get_dim())
        logger.info("[DOC] Embedding model loaded successfully: %s (dim=%s)", self.model_name, self.dimension)

    def _prefix(self, texts: list[str], kind: str) -> list[str]:
        # E5-family models require "query:" / "passage:" prefixes for best results.
        if "e5" in self.model_name.lower():
            prefix = "query: " if kind == "query" else "passage: "
            return [f"{prefix}{t}" for t in texts]
        return texts

    def embed_passages(self, texts: list[str]):
        prepared = self._prefix(texts, "passage")
        return self.model.encode(prepared, normalize_embeddings=True, convert_to_numpy=True)

    def embed_query(self, text: str):
        prepared = self._prefix([text], "query")
        return self.model.encode(prepared, normalize_embeddings=True, convert_to_numpy=True)[0]


@lru_cache
def get_embedding_service() -> EmbeddingService:
    """Singleton so the model is only loaded into memory once per process."""
    return EmbeddingService(settings.EMBEDDING_MODEL, settings.EMBEDDING_DEVICE)
