import pytest
from app.models.document import Document, DocumentStatus
from app.models.generated import GeneratedSummary, GeneratedNote, GeneratedLearningPath
from app.models.chunk import DocumentChunk
from app.vector_store.faiss_store import build_index


def _upload_ready_document(client, auth_headers, fake_embedder):
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("cybersecurity_handbook.pdf", b"%PDF-1.4 test bytes", "application/pdf")},
    )
    assert resp.status_code == 201
    doc_id = resp.json()["id"]

    from app.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        doc.status = DocumentStatus.READY
        doc.page_count = 2

        # Add chunks for page 1 and page 2
        chunk1 = DocumentChunk(
            document_id=doc_id,
            page_number=1,
            chunk_index=0,
            faiss_row=0,
            content="Zero Trust Architecture requires continuous verification of every user and device.",
            language="en",
        )
        chunk2 = DocumentChunk(
            document_id=doc_id,
            page_number=2,
            chunk_index=1,
            faiss_row=1,
            content="Multi-Factor Authentication (MFA) mitigates credential theft by requiring independent factors.",
            language="en",
        )
        db.add_all([chunk1, chunk2])
        db.commit()

        vectors = fake_embedder.embed_passages([chunk1.content, chunk2.content])
        idx_path = build_index(doc_id, vectors)
        doc.faiss_index_path = idx_path
        doc.embedding_model = fake_embedder.model_name
        doc.embedding_dim = fake_embedder.dimension
        db.commit()
    finally:
        db.close()

    return doc_id


def test_health_endpoint_includes_storage(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "storage" in data["checks"]
    assert "ok" in data["checks"]["storage"]


def test_summary_caching_and_regeneration(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)

    call_count = {"llm": 0}
    def _mock_generate_json(sys_prompt, user_prompt):
        call_count["llm"] += 1
        # Check that user_prompt has untrusted content boundary
        assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT START]" in user_prompt
        assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT END]" in user_prompt
        return {
            "overview": "Overview of Zero Trust and MFA.",
            "main_topics": ["Zero Trust", "MFA"],
            "key_concepts": ["Continuous Verification", "Authentication"],
            "key_takeaways": ["Always verify", "Use multiple factors"],
        }

    monkeypatch.setattr("app.summaries.service.generate_json", _mock_generate_json)

    # First call: generates and caches in DB
    resp1 = client.post(f"/api/summary/{doc_id}", headers=auth_headers)
    assert resp1.status_code == 200
    assert call_count["llm"] == 1

    # Second call without regenerate: must hit cache, LLM count remains 1
    resp2 = client.post(f"/api/summary/{doc_id}", headers=auth_headers)
    assert resp2.status_code == 200
    assert call_count["llm"] == 1
    assert resp2.json()["overview"] == "Overview of Zero Trust and MFA."

    # Third call with regenerate=true: must re-invoke LLM
    resp3 = client.post(f"/api/summary/{doc_id}?regenerate=true", headers=auth_headers)
    assert resp3.status_code == 200
    assert call_count["llm"] == 2


def test_notes_caching_and_regeneration(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)

    call_count = {"llm": 0}
    def _mock_generate_json(sys_prompt, user_prompt):
        call_count["llm"] += 1
        assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT START]" in user_prompt
        return {
            "topics": [
                {
                    "title": "Zero Trust Security",
                    "definition": "A security model centered on the belief that organizations should not trust anything.",
                    "explanation": "Every request is fully authenticated and authorized before granting access.",
                    "key_points": ["Verify explicitly", "Least privilege"],
                    "examples": ["Context-aware access policies"],
                    "source_page": 1,
                }
            ]
        }

    monkeypatch.setattr("app.notes.service.generate_json", _mock_generate_json)

    # First call: generates and caches
    resp1 = client.post(f"/api/notes/{doc_id}", headers=auth_headers)
    assert resp1.status_code == 200
    assert call_count["llm"] == 1

    # Second call: must hit cache
    resp2 = client.post(f"/api/notes/{doc_id}", headers=auth_headers)
    assert resp2.status_code == 200
    assert call_count["llm"] == 1

    # Third call with regenerate=true: must bypass cache
    resp3 = client.post(f"/api/notes/{doc_id}?regenerate=true", headers=auth_headers)
    assert resp3.status_code == 200
    assert call_count["llm"] == 2


def test_learning_path_caching(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)

    call_count = {"llm": 0}
    def _mock_generate_json(sys_prompt, user_prompt):
        call_count["llm"] += 1
        assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT START]" in user_prompt
        return {
            "title": "Mastering Zero Trust Architecture",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Foundations of Zero Trust",
                    "description": "Understand core tenets of continuous verification.",
                    "source_pages": [1],
                    "recommended_action": "read",
                },
                {
                    "step_number": 2,
                    "title": "Multi-Factor Authentication",
                    "description": "Explore MFA mechanics and policies.",
                    "source_pages": [2],
                    "recommended_action": "study_notes",
                },
                {
                    "step_number": 3,
                    "title": "Security Assessment Quiz",
                    "description": "Validate your cybersecurity knowledge.",
                    "source_pages": [1, 2],
                    "recommended_action": "quiz",
                },
            ],
        }

    monkeypatch.setattr("app.learning_path.service.generate_json", _mock_generate_json)

    # First call: creates and caches
    resp1 = client.post(f"/api/learning-path/{doc_id}", headers=auth_headers)
    assert resp1.status_code == 200
    assert call_count["llm"] == 1

    # Second call: hits cache
    resp2 = client.post(f"/api/learning-path/{doc_id}", headers=auth_headers)
    assert resp2.status_code == 200
    assert call_count["llm"] == 1
    assert resp2.json()["title"] == "Mastering Zero Trust Architecture"


def test_multi_tenant_isolation_cross_user(client, auth_headers, monkeypatch, fake_embedder):
    # User 1 uploads document
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)

    # Create User 2
    reg_resp = client.post(
        "/api/auth/register",
        json={"email": "attacker@example.com", "password": "SecurePass123!", "name": "Attacker"},
    )
    assert reg_resp.status_code == 201
    user2_token = reg_resp.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # User 2 tries to access User 1's document -> 403 Forbidden
    resp = client.get(f"/api/documents/{doc_id}", headers=user2_headers)
    assert resp.status_code == 403

    # User 2 tries to view User 1's PDF -> 403 Forbidden
    resp = client.get(f"/api/documents/{doc_id}/view", headers=user2_headers)
    assert resp.status_code == 403

    # User 2 tries to delete User 1's document -> 403 Forbidden
    resp = client.delete(f"/api/documents/{doc_id}", headers=user2_headers)
    assert resp.status_code == 403

    # User 2 tries to trigger summary on User 1's document -> 403 Forbidden
    resp = client.post(f"/api/summary/{doc_id}", headers=user2_headers)
    assert resp.status_code == 403

    # User 2 tries to chat about User 1's document -> 403 Forbidden
    resp = client.post(
        "/api/chat",
        headers=user2_headers,
        data={"message": "What is in this document?", "document_id": doc_id},
    )
    assert resp.status_code == 403


def test_prompt_injection_boundary_in_chat(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)

    captured_messages = []
    def _mock_chat(messages, **kwargs):
        captured_messages.extend(messages)
        return "Zero Trust requires continuous verification."

    monkeypatch.setattr("app.chat.service.chat_completion", _mock_chat)

    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain Zero Trust.", "document_id": doc_id, "current_page": 1},
    )
    assert resp.status_code == 200

    system_prompt = captured_messages[0]["content"]
    user_turn = captured_messages[1]["content"]

    # Verify security prompt injection defense in system prompt
    assert "SECURITY & UNTRUSTED CONTENT DEFENSE" in system_prompt
    assert "passive educational subject matter" in system_prompt

    # Verify untrusted content delimiters in user turn
    assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT START]" in user_turn
    assert "[DOCUMENT CONTEXT — UNTRUSTED CONTENT END]" in user_turn


def test_production_local_storage_validation_fails():
    from app.config import Settings
    from pydantic import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        Settings(ENV="production", STORAGE_BACKEND="local")
    assert "STORAGE_BACKEND cannot be 'local' when ENV='production'" in str(exc_info.value)


def test_production_vercel_blob_validation_success():
    from app.config import Settings
    s = Settings(ENV="production", STORAGE_BACKEND="vercel_blob", BLOB_READ_WRITE_TOKEN="mock_safe_token")
    assert s.ENV == "production"
    assert s.STORAGE_BACKEND == "vercel_blob"
    assert s.BLOB_READ_WRITE_TOKEN == "mock_safe_token"


def test_development_local_storage_validation_success():
    from app.config import Settings
    s = Settings(ENV="development", STORAGE_BACKEND="local")
    assert s.ENV == "development"
    assert s.STORAGE_BACKEND == "local"


def test_storage_abstraction_used_by_view_and_download(client, auth_headers, monkeypatch):
    from app.storage.service import StorageBackend

    view_calls = []
    class MockStorage(StorageBackend):
        def save_file(self, content, filename, content_type="application/pdf"):
            return "mock://custom/path.pdf"
        def get_file(self, key_or_path):
            view_calls.append(key_or_path)
            return b"%PDF-1.4 Mock Storage Stream"
        def delete_file(self, key_or_path):
            return True
        def get_url(self, key_or_path):
            return None
        def get_local_path(self, key_or_path):
            return key_or_path

    monkeypatch.setattr("app.routes.documents.get_storage_service", lambda: MockStorage())

    from app.database import SessionLocal
    from app.models.document import Document, DocumentStatus
    from app.models.user import User
    db = SessionLocal()
    try:
        user = db.query(User).first()
        doc = Document(
            user_id=user.id,
            filename="abstraction_test.pdf",
            stored_path="mock://custom/path.pdf",
            status=DocumentStatus.READY,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id
    finally:
        db.close()

    resp_view = client.get(f"/api/documents/{doc_id}/view", headers=auth_headers)
    assert resp_view.status_code == 200
    assert resp_view.content == b"%PDF-1.4 Mock Storage Stream"
    assert "mock://custom/path.pdf" in view_calls

    resp_dl = client.get(f"/api/documents/{doc_id}/download", headers=auth_headers)
    assert resp_dl.status_code == 200
    assert resp_dl.content == b"%PDF-1.4 Mock Storage Stream"
    assert len(view_calls) == 2

