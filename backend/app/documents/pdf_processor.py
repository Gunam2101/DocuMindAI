"""
PDF text extraction pipeline.

Handles: normal PDFs, scanned PDFs, mixed PDFs, multilingual PDFs
(preserving Unicode for Tamil/Hindi/Arabic/etc.), and PDFs containing
images or tables (extracted as rendered text via OCR where needed).

Pipeline per page:
  1. Try native text extraction via PyMuPDF.
  2. If the extracted text is suspiciously short/empty (a strong signal
     the page is scanned/image-only), rasterize the page and run OCR.
  3. Return page-aware text, preserving page numbers throughout.
"""
import io
import logging
import os
import shutil
from dataclasses import dataclass

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("documind")

# Auto-detect Tesseract binary path if default command isn't directly executable
_tesseract_cmd = settings.TESSERACT_CMD
if not shutil.which(_tesseract_cmd) and not os.path.isfile(_tesseract_cmd):
    windows_candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for candidate in windows_candidates:
        if os.path.isfile(candidate):
            _tesseract_cmd = candidate
            break

pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

# Below this many extracted characters, a page is considered "likely scanned".
OCR_TRIGGER_CHAR_THRESHOLD = 20


@dataclass
class PageContent:
    page_number: int  # 1-indexed
    text: str
    used_ocr: bool


def _ocr_page(page: "fitz.Page") -> str:
    pix = page.get_pixmap(dpi=200)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    # Try multilingual Indic + Arabic scripts first; fallback to eng if traineddata missing
    try:
        text = pytesseract.image_to_string(img, lang="eng+tam+hin+ara")
    except Exception as exc:
        logger.warning("[DOC] Multilingual OCR failed (%s); falling back to English", exc)
        text = pytesseract.image_to_string(img, lang="eng")
    return text.strip()


def extract_pdf_pages(file_path: str) -> list[PageContent]:
    """Extracts page-aware, Unicode-safe text from a PDF, using OCR only
    where native extraction fails."""
    pages: list[PageContent] = []

    with fitz.open(file_path) as doc:
        total_pages = doc.page_count
        logger.info("[DOC] PDF extraction started for %s (%s pages)", file_path, total_pages)
        for i, page in enumerate(doc):
            page_number = i + 1
            native_text = page.get_text("text").strip()

            used_ocr = False
            text = native_text
            if len(native_text) < OCR_TRIGGER_CHAR_THRESHOLD:
                try:
                    logger.info("[DOC] OCR started for page %s/%s", page_number, total_pages)
                    ocr_text = _ocr_page(page)
                    logger.info("[DOC] OCR completed for page %s/%s: %s chars extracted", page_number, total_pages, len(ocr_text))
                    if len(ocr_text) > len(native_text):
                        text = ocr_text
                        used_ocr = True
                except Exception as exc:  # OCR is best-effort; log and continue
                    logger.warning("[DOC] OCR failed for page %s: %s", page_number, exc)

            pages.append(PageContent(page_number=page_number, text=text, used_ocr=used_ocr))

        logger.info("[DOC] PDF extraction completed: %s pages (OCR used on %s pages)", total_pages, sum(1 for p in pages if p.used_ocr))

    return pages


def get_page_count(file_path: str) -> int:
    with fitz.open(file_path) as doc:
        return doc.page_count
