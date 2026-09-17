import pytest

from app.database import normalize_database_url
from app.models.document import Document
from app.rag.retriever import retrieve
from app.storage.service import LocalStorageBackend
from app.utils.language import (
    detect_explicit_language_request,
    detect_message_language,
    looks_tanglish,
    resolve_response_language,
)


def test_database_url_normalization():
    # Supabase / Render / Heroku postgres://
    assert normalize_database_url("postgres://user:pass@host:5432/db") == "postgresql+psycopg://user:pass@host:5432/db"

    # Raw postgresql:// without dialect
    assert normalize_database_url("postgresql://user:pass@host:5432/db") == "postgresql+psycopg://user:pass@host:5432/db"

    # Legacy psycopg2 format
    assert normalize_database_url("postgresql+psycopg2://user:pass@host:5432/db") == "postgresql+psycopg://user:pass@host:5432/db"

    # Already normalized psycopg v3
    assert normalize_database_url("postgresql+psycopg://user:pass@host:5432/db") == "postgresql+psycopg://user:pass@host:5432/db"

    # SQLite preserved
    assert normalize_database_url("sqlite:///./test.db") == "sqlite:///./test.db"


def test_multilingual_script_detection():
    # Tamil Unicode
    assert detect_message_language("செயற்கை நுண்ணறிவு என்றால் என்ன?") == "ta"

    # Hindi Unicode
    assert detect_message_language("कृत्रिम बुद्धिमत्ता क्या है?") == "hi"

    # Telugu Unicode
    assert detect_message_language("కృత్రిమ మేధస్సు అంటే ఏమిటి?") == "te"

    # Malayalam Unicode
    assert detect_message_language("കൃത്രിമ ബുദ്ധി എന്താണ്?") == "ml"

    # Bengali Unicode
    assert detect_message_language("কৃত্রিম বুদ্ধিমত্তা কি?") == "bn"

    # Arabic / Urdu Unicode
    assert detect_message_language("ما هو الذكاء الاصطناعي؟") == "ar"


def test_tanglish_detection():
    # User requirement: "Intelligent agent na enna?" -> natural Tamil/Tanglish
    msg = "Intelligent agent na enna?"
    assert looks_tanglish(msg) is True
    assert detect_message_language(msg) == "ta"


def test_explicit_language_request_priority():
    # Explicit message request overrides auto
    assert detect_explicit_language_request("Explain this in Tamil please") == "ta"
    assert detect_explicit_language_request("Can you describe in Hindi") == "hi"

    # resolve_response_language priority check:
    # Explicit request in message wins over selected language
    assert resolve_response_language(
        message="Please explain in Tamil",
        conversation_recent_language="en",
        document_language="en",
        requested_language="auto",
    ) == "ta"

    # English question on Tamil document returns English answer
    assert resolve_response_language(
        message="What are the key architectural layers of this model?",
        conversation_recent_language=None,
        document_language="ta",
        requested_language="auto",
    ) == "en"


def test_rag_security_user_id_isolation(db_session):
    doc = Document(
        id="doc-owner-123",
        user_id="user-owner-1",
        filename="test.pdf",
        stored_path="test.pdf",
        status="READY",
    )
    db_session.add(doc)
    db_session.commit()

    # Access by different user must raise PermissionError
    with pytest.raises(PermissionError, match="Access denied"):
        retrieve(db_session, doc, "test query", user_id="user-attacker-2")


def test_storage_service_local_backend(tmp_path):
    storage = LocalStorageBackend(base_dir=str(tmp_path))
    content = b"Mock PDF document content"

    path = storage.save_file(content, "sample.pdf")
    assert storage.get_file(path) == content

    assert storage.delete_file(path) is True
    with pytest.raises(FileNotFoundError):
        storage.get_file(path)
