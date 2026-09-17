"""
Helper for generation tasks (summary/notes/questions/quiz) that need the
LLM to return strict JSON, which is then parsed into Pydantic models.
"""
import json
import logging
import re

from app.llm.groq_client import LLMServiceError, chat_completion

logger = logging.getLogger("documind")


def _extract_json_text(text: str) -> str:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, flags=re.IGNORECASE)
    if match:
        text = match.group(1).strip()

    start_brace = text.find("{")
    start_bracket = text.find("[")
    start_idx = -1
    end_idx = -1
    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        start_idx = start_brace
        end_idx = text.rfind("}")
    elif start_bracket != -1:
        start_idx = start_bracket
        end_idx = text.rfind("]")

    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx + 1]
    return text


def generate_json(system_prompt: str, user_prompt: str) -> dict:
    messages = [
        {"role": "system", "content": system_prompt + "\n\nRespond ONLY with valid JSON. No markdown, no commentary, no code fences."},
        {"role": "user", "content": user_prompt},
    ]
    raw = chat_completion(messages, temperature=0.3, max_tokens=2000)
    cleaned = _extract_json_text(raw)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("[AI] failed to parse JSON response: %s", cleaned[:500])
        raise LLMServiceError(
            "AI_INVALID_JSON",
            "The AI returned an unexpected response format. Please try again.",
            status_code=502,
        )

