"""
Splits page-aware extracted text into overlapping chunks suitable for
embedding + retrieval, while preserving the originating page number for
each chunk (needed for compact "Sources: p.12 p.13" citations later).
"""
from dataclasses import dataclass

from app.documents.pdf_processor import PageContent

CHUNK_SIZE = 800       # characters
CHUNK_OVERLAP = 150    # characters


@dataclass
class Chunk:
    page_number: int
    chunk_index: int
    text: str


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - overlap
    return chunks


def chunk_pages(pages: list[PageContent]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for page in pages:
        pieces = _split_text(page.text, CHUNK_SIZE, CHUNK_OVERLAP)
        for idx, piece in enumerate(pieces):
            if piece.strip():
                chunks.append(Chunk(page_number=page.page_number, chunk_index=idx, text=piece))
    return chunks
