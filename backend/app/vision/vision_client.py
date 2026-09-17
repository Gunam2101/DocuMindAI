"""
Vision-capable model integration for image understanding (diagrams,
charts, tables, handwritten notes, scanned pages, etc).

Images are always sent to a vision-capable model/API — never to a
text-only LLM. Provider/model are configurable via environment variables
(VISION_PROVIDER, VISION_MODEL, VISION_API_KEY).
"""
import base64
import logging

import httpx

from app.config import get_settings
from app.llm.groq_client import LLMServiceError

settings = get_settings()
logger = logging.getLogger("documind")


def _encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_image(image_path: str, instruction: str) -> str:
    """
    Sends the image + instruction to the configured vision model and
    returns the raw visual-understanding response (used as context for
    the teacher-style LLM answer, not returned directly to the user).
    """
    api_key = settings.VISION_API_KEY or settings.GROQ_API_KEY
    if not api_key:
        raise LLMServiceError("VISION_NOT_CONFIGURED", "Image understanding is not configured on the server.", 401)

    if settings.VISION_PROVIDER != "groq":
        raise LLMServiceError(
            "VISION_PROVIDER_UNSUPPORTED",
            f"Vision provider '{settings.VISION_PROVIDER}' is not implemented. Configure VISION_PROVIDER=groq.",
            500,
        )

    b64_image = _encode_image(image_path)
    url = f"{settings.GROQ_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": settings.VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                ],
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1000,
    }

    try:
        response = httpx.post(url, headers=headers, json=body, timeout=45.0)
    except httpx.TimeoutException:
        raise LLMServiceError("VISION_TIMEOUT", "Image processing took too long. Please try again.", 504)
    except httpx.RequestError:
        raise LLMServiceError("VISION_UNAVAILABLE", "Image processing failed. Please try again.", 503)

    if response.status_code == 200:
        data = response.json()
        return data["choices"][0]["message"]["content"]

    if response.status_code == 429:
        raise LLMServiceError("VISION_RATE_LIMITED", "Image analysis is receiving too many requests. Please try again shortly.", 429)
    if response.status_code in (401, 403):
        raise LLMServiceError("VISION_CONFIGURATION_ERROR", "Image understanding is not configured correctly on the server.", 401)

    logger.error("[VISION] provider error %s: %s", response.status_code, response.text)
    raise LLMServiceError("VISION_PROCESSING_FAILED", "We couldn't process this image. Please try a different one.", 500)
