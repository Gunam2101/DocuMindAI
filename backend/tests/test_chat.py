import io

import fitz
import pytest

from app.llm.groq_client import LLMServiceError


def make_pdf_bytes(text="Artificial Intelligence is the simulation of human intelligence by machines. An intelligent agent perceives its environment through sensors and acts through actuators."):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _mock_chat_completion(monkeypatch, return_value="Mocked teacher-style answer."):
    monkeypatch.setattr("app.chat.service.chat_completion", lambda *a, **k: return_value)


def _upload_ready_document(client, auth_headers, fake_embedder):
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("ai.pdf", make_pdf_bytes(), "application/pdf")},
    )
    return resp.json()["id"]


def test_chat_without_document_uses_general_knowledge(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "What is photosynthesis?", "language": "auto"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Mocked teacher-style answer."
    assert data["sources"] == []
    assert data["conversation_id"]


def test_chat_response_never_returns_null_sources(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post("/api/chat", headers=auth_headers, data={"message": "Hello", "language": "auto"})
    assert resp.json()["sources"] == []  # never null


def test_chat_english_question(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "What is an intelligent agent?", "document_id": doc_id, "language": "auto"},
    )
    assert resp.status_code == 200
    convo_id = resp.json()["conversation_id"]
    msgs = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=auth_headers).json()
    user_msg = [m for m in msgs if m["role"] == "user"][0]
    assert user_msg["language"] == "en"


def test_chat_tamil_question_detected(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "இயற்கை மொழி செயலாக்கம் என்றால் என்ன?", "language": "auto"},
    )
    convo_id = resp.json()["conversation_id"]
    msgs = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=auth_headers).json()
    user_msg = [m for m in msgs if m["role"] == "user"][0]
    assert user_msg["language"] == "ta"


def test_chat_tanglish_question_detected_as_tamil(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Intelligent agent oda components explain pannu.", "language": "auto"},
    )
    convo_id = resp.json()["conversation_id"]
    msgs = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=auth_headers).json()
    user_msg = [m for m in msgs if m["role"] == "user"][0]
    assert user_msg["language"] == "ta"


def test_chat_hindi_question_detected(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "इंटेलिजेंट एजेंट क्या है?", "language": "auto"},
    )
    convo_id = resp.json()["conversation_id"]
    msgs = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=auth_headers).json()
    user_msg = [m for m in msgs if m["role"] == "user"][0]
    assert user_msg["language"] == "hi"


def test_chat_explicit_language_switch(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain this in Tamil", "language": "auto"},
    )
    convo_id = resp.json()["conversation_id"]
    msgs = client.get(f"/api/chat/conversations/{convo_id}/messages", headers=auth_headers).json()
    user_msg = [m for m in msgs if m["role"] == "user"][0]
    assert user_msg["language"] == "ta"


def test_chat_follow_up_uses_same_conversation(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    first = client.post("/api/chat", headers=auth_headers, data={"message": "What is an intelligent agent?", "language": "auto"}).json()
    second = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain the sensors part.", "conversation_id": first["conversation_id"], "language": "auto"},
    ).json()
    assert second["conversation_id"] == first["conversation_id"]

    msgs = client.get(f"/api/chat/conversations/{first['conversation_id']}/messages", headers=auth_headers).json()
    assert len(msgs) == 4  # 2 user + 2 assistant


def test_chat_retrieval_returns_source_pages(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    _mock_chat_completion(monkeypatch)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain the agent.", "document_id": doc_id, "language": "auto"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json()["sources"], list)


def test_chat_llm_rate_limit_returns_clean_error(client, auth_headers, monkeypatch):
    def _raise_rate_limit(*a, **k):
        raise LLMServiceError("LLM_RATE_LIMITED", "The AI is currently receiving too many requests. Please try again shortly.", 429)

    monkeypatch.setattr("app.chat.service.chat_completion", _raise_rate_limit)
    resp = client.post("/api/chat", headers=auth_headers, data={"message": "Hello", "language": "auto"})
    assert resp.status_code == 429
    body = resp.json()
    assert body["error_code"] == "HTTP_429"
    assert "too many requests" in body["detail"].lower()


def test_chat_llm_provider_failure_is_not_masked_as_not_found(client, auth_headers, monkeypatch):
    def _raise_failure(*a, **k):
        raise LLMServiceError("LLM_PROVIDER_FAILURE", "The AI service is temporarily unavailable. Please try again.", 503)

    monkeypatch.setattr("app.chat.service.chat_completion", _raise_failure)
    resp = client.post("/api/chat", headers=auth_headers, data={"message": "Hello", "language": "auto"})
    assert resp.status_code == 503
    assert "couldn't find this information" not in resp.json()["detail"].lower()


def test_chat_requires_message_or_image(client, auth_headers):
    resp = client.post("/api/chat", headers=auth_headers, data={"message": "", "language": "auto"})
    assert resp.status_code == 400


def test_chat_rejects_unsupported_image_type(client, auth_headers):
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain this", "language": "auto"},
        files={"image": ("doc.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert resp.status_code == 400


def test_chat_with_image_uses_vision_pipeline(client, auth_headers, monkeypatch):
    _mock_chat_completion(monkeypatch)
    monkeypatch.setattr("app.chat.service.analyze_image", lambda path, instr: "This diagram shows an intelligent agent architecture.")

    # minimal 1x1 PNG, generated on the fly to avoid hand-typed hex errors
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (1, 1), color=(255, 255, 255)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={"message": "Explain this diagram.", "language": "auto"},
        files={"image": ("diagram.png", png_bytes, "image/png")},
    )
    assert resp.status_code == 200


def test_chat_page_aware_prioritization(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    
    captured_messages = []
    def _capture_completion(messages, **kwargs):
        captured_messages.extend(messages)
        return "Page 1 explains intelligent agents and perception."
    
    monkeypatch.setattr("app.chat.service.chat_completion", _capture_completion)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={
            "message": "Explain this page.",
            "document_id": doc_id,
            "current_page": 1,
            "language": "auto",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert 1 in [s["page"] for s in data["sources"]]
    # Check that system or user prompt contains current page context
    user_prompt_str = " ".join(m["content"] for m in captured_messages)
    assert "Current Page 1 Content" in user_prompt_str or "Page 1" in user_prompt_str


def test_chat_selected_text_prioritization(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    
    captured_messages = []
    def _capture_completion(messages, **kwargs):
        captured_messages.extend(messages)
        return "The sensors allow the agent to perceive external signals."
    
    monkeypatch.setattr("app.chat.service.chat_completion", _capture_completion)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={
            "message": "Explain this simply.",
            "document_id": doc_id,
            "selected_text": "An intelligent agent perceives its environment through sensors",
            "current_page": 1,
        },
    )
    assert resp.status_code == 200
    user_prompt_str = " ".join(m["content"] for m in captured_messages)
    assert "Highlighted Document Text" in user_prompt_str
    assert "sensors" in user_prompt_str


def test_chat_learning_path_topic_and_teaching_modes(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    
    captured_messages = []
    def _capture_completion(messages, **kwargs):
        captured_messages.extend(messages)
        return "Here is a structured 5-marks explanation of Intelligent Agents."
    
    monkeypatch.setattr("app.chat.service.chat_completion", _capture_completion)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={
            "message": "Teach me this topic.",
            "document_id": doc_id,
            "learning_path_topic": "Intelligent Agents & Perception",
            "teaching_level": "advanced",
            "answer_mode": "5_marks",
        },
    )
    assert resp.status_code == 200
    all_content = " ".join(m["content"] for m in captured_messages)
    assert "TEACHING LEVEL: ADVANCED" in all_content
    assert "EXAM 5-MARKS" in all_content
    assert "Intelligent Agents & Perception" in all_content


def test_chat_multilingual_tanglish(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    
    captured_messages = []
    def _capture_completion(messages, **kwargs):
        captured_messages.extend(messages)
        return "Intelligent agent na enna-nu paatha, idhu sensors moolama environment-a perceive pannum."
    
    monkeypatch.setattr("app.chat.service.chat_completion", _capture_completion)
    resp = client.post(
        "/api/chat",
        headers=auth_headers,
        data={
            "message": "Indha concept-a simple-aa explain pannu",
            "document_id": doc_id,
            "language": "auto",
        },
    )
    assert resp.status_code == 200
    system_prompt = captured_messages[0]["content"]
    assert "Tamil" in system_prompt or "Tanglish" in system_prompt

