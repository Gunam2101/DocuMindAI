"""
Language detection utilities.

Priority order used by chat (spec section 12):
  1. Explicit language request in the message ("explain in Tamil")
  2. Current message language (script/langdetect based)
  3. Recent conversation language
  4. Document language as context/fallback

Tanglish (Tamil words typed in Latin script mixed with English) cannot be
reliably separated from English by script alone, so we treat it as a
"latin-script but Tamil-intent" signal via keyword heuristics and let the
LLM prompt handle the actual mixed-language understanding.
"""
import re

from langdetect import detect, DetectorFactory, LangDetectException

DetectorFactory.seed = 0  # deterministic results

LANGUAGE_NAMES = {
    "en": "English", "ta": "Tamil", "hi": "Hindi", "te": "Telugu", "ml": "Malayalam",
    "kn": "Kannada", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati", "pa": "Punjabi",
    "ur": "Urdu", "ar": "Arabic", "fr": "French", "de": "German", "es": "Spanish",
    "zh-cn": "Chinese", "ja": "Japanese", "ko": "Korean",
}

_EXPLICIT_REQUEST_RE = re.compile(
    r"\bin\s+(tamil|hindi|telugu|malayalam|kannada|bengali|marathi|gujarati|punjabi|"
    r"urdu|arabic|french|german|spanish|chinese|japanese|korean|english)\b",
    re.IGNORECASE,
)

# Common Tanglish (romanized Tamil) markers
_TANGLISH_MARKERS = {
    "pannu", "pannunga", "panrom", "epdi", "eppadi", "enna", "na", "nu", "oda",
    "irukku", "illa", "illai", "venum", "solu", "sollunga", "unga", "neenga",
    "aachu", "theriyuma", "puriyala", "puriyidha", "paaru",
}


def detect_explicit_language_request(message: str) -> str | None:
    match = _EXPLICIT_REQUEST_RE.search(message)
    if match:
        lang_name = match.group(1).lower()
        for code, name in LANGUAGE_NAMES.items():
            if name.lower() == lang_name:
                return code
    return None


def looks_tanglish(message: str) -> bool:
    tokens = set(re.findall(r"\b[a-zA-Z]+\b", message.lower()))
    return bool(tokens & _TANGLISH_MARKERS)


def detect_message_language(message: str) -> str:
    """Best-effort detection of the current message's language."""
    explicit = detect_explicit_language_request(message)
    if explicit:
        return explicit

    # Script-based quick checks for Indic & Arabic scripts (robust for short queries)
    if re.search(r"[\u0B80-\u0BFF]", message):
        return "ta"  # Tamil
    if re.search(r"[\u0C00-\u0C7F]", message):
        return "te"  # Telugu
    if re.search(r"[\u0C80-\u0CFF]", message):
        return "kn"  # Kannada
    if re.search(r"[\u0D00-\u0D7F]", message):
        return "ml"  # Malayalam
    if re.search(r"[\u0980-\u09FF]", message):
        return "bn"  # Bengali
    if re.search(r"[\u0A80-\u0AFF]", message):
        return "gu"  # Gujarati
    if re.search(r"[\u0A00-\u0A7F]", message):
        return "pa"  # Punjabi
    if re.search(r"[\u0900-\u097F]", message):
        return "hi"  # Devanagari (Hindi/Marathi)
    if re.search(r"[\u0600-\u06FF]", message):
        return "ar"  # Arabic/Urdu

    if looks_tanglish(message):
        return "ta"  # Tanglish → treat as Tamil intent, Latin script

    try:
        code = detect(message)
        return code if code in LANGUAGE_NAMES or code == "en" else "en"
    except LangDetectException:
        return "en"


def resolve_response_language(
    message: str,
    conversation_recent_language: str | None,
    document_language: str | None,
    requested_language: str = "auto",
) -> str:
    """
    Implements the full priority order for choosing the response language:
      1. Explicit language request in message ("explain in Tamil")
      2. Requested language dropdown (if set and not 'auto')
      3. Message language detected from script / Tanglish / langdetect
      4. Short follow-up (<= 4 words) inheriting recent conversation language
      5. English default / document language context
    """
    explicit = detect_explicit_language_request(message)
    if explicit:
        return explicit

    if requested_language and requested_language != "auto":
        return requested_language

    detected = detect_message_language(message)
    if detected != "en":
        return detected

    # If message is a short English follow-up (e.g. "why?", "explain more", "give example"),
    # inherit the conversation's active language.
    if len(message.split()) <= 4 and conversation_recent_language and conversation_recent_language != "en":
        return conversation_recent_language

    return "en"


def language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, code.title() if code else "English")
