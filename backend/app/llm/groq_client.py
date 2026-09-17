"""
Server-side Groq LLM integration. Model/provider are configurable via
environment variables (GROQ_MODEL, GROQ_BASE_URL) so the provider can be
swapped without code changes.

Raises LLMServiceError with a specific error_code so routes can translate
failures into clean, user-facing messages (spec section 34) instead of ever
silently returning "I couldn't find this information in your documents."
for what is actually a provider/infra failure.
"""
import logging
import time
import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("documind")

MAX_RATE_LIMIT_RETRIES = 3
DEFAULT_RETRY_DELAY = 3.0



class LLMServiceError(Exception):
    def __init__(self, error_code: str, message: str, status_code: int = 503):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def chat_completion(messages: list[dict], temperature: float = 0.4, max_tokens: int = 1200) -> str:
    if not settings.GROQ_API_KEY:
        logger.error("[AI] Request failed: GROQ_API_KEY is not configured on the server")
        raise LLMServiceError(
            "AI_NOT_CONFIGURED",
            "The AI service is not configured on the server yet. Please configure GROQ_API_KEY.",
            status_code=503,
        )

    logger.info("[AI] Request started")
    logger.info("[AI] Provider: Groq")
    logger.info("[AI] Model: %s", settings.GROQ_MODEL)
    logger.info("[AI] Context messages: %s", len(messages))
    logger.info("[AI] Sending completion request")

    url = f"{settings.GROQ_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    attempt = 0
    while attempt <= MAX_RATE_LIMIT_RETRIES:
        try:
            response = httpx.post(url, headers=headers, json=body, timeout=45.0)
        except httpx.TimeoutException as exc:
            logger.error("[AI] Request failed")
            logger.error("[AI] Provider: Groq")
            logger.error("[AI] Error type: TimeoutException")
            logger.error("[AI] Safe error: The AI service took too long to respond (45s).")
            raise LLMServiceError(
                "AI_TIMEOUT",
                "The AI service took too long to respond. Please try again.",
                status_code=504,
            ) from exc
        except httpx.RequestError as exc:
            logger.error("[AI] Request failed")
            logger.error("[AI] Provider: Groq")
            logger.error("[AI] Error type: RequestError (%s)", type(exc).__name__)
            logger.error("[AI] Safe error: Failed to connect to AI provider endpoint.")
            raise LLMServiceError(
                "AI_UNAVAILABLE",
                "The AI service is currently unavailable or unreachable. Please check network connectivity.",
                status_code=503,
            ) from exc

        if response.status_code == 200:
            try:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if content is None:
                    content = ""
                logger.info("[AI] Completion received")
                logger.info("[AI] Response parsed")
                logger.info("[AI] Request completed")
                return content
            except (KeyError, IndexError, TypeError, ValueError) as exc:
                logger.error("[AI] Request failed")
                logger.error("[AI] Provider: Groq")
                logger.error("[AI] Error type: ResponseParsingError (%s)", exc)
                logger.error("[AI] Safe error: Unexpected payload structure from AI provider.")
                raise LLMServiceError(
                    "AI_RESPONSE_PARSE_ERROR",
                    "The AI service returned an unexpected response format.",
                    status_code=502,
                ) from exc

        # Handle 429 rate limit with automatic retry
        if response.status_code == 429:
            attempt += 1
            if attempt <= MAX_RATE_LIMIT_RETRIES:
                retry_header = response.headers.get("retry-after")
                try:
                    delay = float(retry_header) if retry_header else DEFAULT_RETRY_DELAY * attempt
                except (ValueError, TypeError):
                    delay = DEFAULT_RETRY_DELAY * attempt
                delay = min(max(delay, 2.0), 10.0)
                logger.warning("[AI] Rate limited by Groq. Retrying attempt %s/%s after %.1fs...", attempt, MAX_RATE_LIMIT_RETRIES, delay)
                time.sleep(delay)
                continue


        # Non-retryable or exhausted attempts: extract safe error summary
        status_code = response.status_code
        error_msg = ""
        error_code_provider = ""
        try:
            err_json = response.json()
            error_obj = err_json.get("error", {})
            if isinstance(error_obj, dict):
                error_msg = error_obj.get("message", "")
                error_code_provider = error_obj.get("code", "") or error_obj.get("type", "")
            elif isinstance(error_obj, str):
                error_msg = error_obj
        except Exception:
            error_msg = response.text[:200]

        logger.error("[AI] Request failed")
        logger.error("[AI] Provider: Groq")
        logger.error("[AI] HTTP status: %s", status_code)
        logger.error("[AI] Error type: ProviderError (%s)", error_code_provider or "none")
        logger.error("[AI] Safe error: %s", error_msg or f"HTTP {status_code}")

        if status_code == 404:
            raise LLMServiceError(
                "AI_MODEL_NOT_FOUND",
                f"The configured AI model '{settings.GROQ_MODEL}' was not found by the provider. Please check GROQ_MODEL in configuration.",
                status_code=502,
            )
        if status_code in (401, 403):
            raise LLMServiceError(
                "AI_AUTH_FAILED",
                "AI provider authentication failed. Please verify GROQ_API_KEY in server configuration.",
                status_code=502,
            )
        if status_code == 429:
            raise LLMServiceError(
                "AI_RATE_LIMIT",
                "The AI service is currently receiving too many requests. Please wait a moment and try again.",
                status_code=429,
            )
        if status_code == 400:
            clean_msg = error_msg if error_msg else "Invalid request parameters sent to AI service."
            raise LLMServiceError(
                "AI_BAD_REQUEST",
                f"The AI service could not process this request: {clean_msg}",
                status_code=400,
            )
        if status_code in (500, 502, 503):
            raise LLMServiceError(
                "AI_PROVIDER_FAILURE",
                "The AI provider is temporarily unavailable. Please try again shortly.",
                status_code=503,
            )

        raise LLMServiceError(
            "AI_UNEXPECTED_ERROR",
            f"AI service returned unexpected status ({status_code}): {error_msg or 'Unknown provider error'}",
            status_code=502,
        )

