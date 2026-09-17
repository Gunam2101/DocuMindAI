import io

import fitz


def make_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Artificial Intelligence is the simulation of human intelligence by machines.")
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _upload_ready_document(client, auth_headers, fake_embedder):
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("ai.pdf", make_pdf_bytes(), "application/pdf")},
    )
    return resp.json()["id"]


def test_summary_generation(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.summaries.service.generate_json", lambda sp, up: {
        "overview": "This document introduces AI fundamentals.",
        "main_topics": ["Introduction to AI"],
        "key_concepts": ["Simulation of intelligence"],
        "key_takeaways": ["AI mimics human cognition"],
    })
    resp = client.post(f"/api/summary/{doc_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["overview"]
    assert len(data["main_topics"]) >= 1


def test_summary_requires_ready_document(client, db_session, auth_headers):
    resp = client.post("/api/documents", headers=auth_headers, files={"file": ("a.pdf", make_pdf_bytes(), "application/pdf")})
    doc_id = resp.json()["id"]
    from app.models.document import Document, DocumentStatus
    doc = db_session.query(Document).filter(Document.id == doc_id).first()
    doc.status = DocumentStatus.PROCESSING
    db_session.commit()

    summary_resp = client.post(f"/api/summary/{doc_id}", headers=auth_headers)
    assert summary_resp.status_code == 400
    assert "still processing" in summary_resp.json()["detail"]


def test_notes_generation(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.notes.service.generate_json", lambda sp, up: {
        "topics": [{
            "title": "Intelligent Agents",
            "definition": "An entity that perceives and acts.",
            "explanation": "It uses sensors and actuators.",
            "key_points": ["Perceives environment", "Acts rationally"],
            "examples": ["A thermostat"],
            "source_page": 1,
        }]
    })
    resp = client.post(f"/api/notes/{doc_id}", headers=auth_headers)
    assert resp.status_code == 200
    topics = resp.json()["topics"]
    assert topics[0]["title"] == "Intelligent Agents"


def test_question_generator_mcq(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.questions.service.generate_json", lambda sp, up: {
        "questions": [{
            "type": "mcq",
            "prompt": "What is an intelligent agent?",
            "options": ["A physical robot", "An entity that perceives and acts", "A programming language", "A database"],
            "answer": "An entity that perceives and acts",
            "marks": 2,
            "source_page": 1,
        }]
    })
    resp = client.post("/api/questions", headers=auth_headers, json={
        "document_id": doc_id, "num_questions": 1, "question_type": "mcq", "difficulty": "easy", "marks": 2,
    })
    assert resp.status_code == 200
    q = resp.json()["questions"][0]
    assert q["type"] == "mcq"
    assert len(q["options"]) == 4


def test_question_generator_rejects_missing_document(client, auth_headers):
    resp = client.post("/api/questions", headers=auth_headers, json={
        "document_id": "does-not-exist", "num_questions": 3, "question_type": "mixed", "difficulty": "medium", "marks": 5,
    })
    assert resp.status_code == 404


def test_quiz_start_and_submit_flow(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.quiz.service.generate_json", lambda sp, up: {
        "questions": [
            {"prompt": "What perceives the environment?", "options": ["Actuator", "Sensor", "Database", "API"], "correct_index": 1, "explanation": "Sensors perceive the environment."},
            {"prompt": "What acts on the environment?", "options": ["Sensor", "Actuator", "Cache", "Index"], "correct_index": 1, "explanation": "Actuators perform actions."},
        ]
    })

    start = client.post("/api/quiz/start", headers=auth_headers, json={"document_id": doc_id, "num_questions": 2})
    assert start.status_code == 200
    quiz = start.json()
    assert len(quiz["questions"]) == 2

    answers = {quiz["questions"][0]["id"]: 1, quiz["questions"][1]["id"]: 1}
    submit = client.post("/api/quiz/submit", headers=auth_headers, json={"quiz_id": quiz["quiz_id"], "answers": answers})
    assert submit.status_code == 200
    result = submit.json()
    assert result["score"] == 2
    assert result["total"] == 2
    assert result["accuracy"] == 100.0
    assert all(r["is_correct"] for r in result["review"])


def test_quiz_submit_partial_score(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.quiz.service.generate_json", lambda sp, up: {
        "questions": [
            {"prompt": "Q1", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "A is correct."},
            {"prompt": "Q2", "options": ["A", "B", "C", "D"], "correct_index": 2, "explanation": "C is correct."},
        ]
    })
    start = client.post("/api/quiz/start", headers=auth_headers, json={"document_id": doc_id, "num_questions": 2}).json()
    answers = {start["questions"][0]["id"]: 0, start["questions"][1]["id"]: 0}  # second is wrong
    result = client.post("/api/quiz/submit", headers=auth_headers, json={"quiz_id": start["quiz_id"], "answers": answers}).json()
    assert result["score"] == 1
    assert result["accuracy"] == 50.0


def test_learning_path_generation(client, auth_headers, monkeypatch, fake_embedder):
    doc_id = _upload_ready_document(client, auth_headers, fake_embedder)
    monkeypatch.setattr("app.learning_path.service.generate_json", lambda sp, up: {
        "title": "Mastering Artificial Intelligence",
        "steps": [
            {
                "step_number": 1,
                "title": "AI Fundamentals",
                "description": "Foundational definitions and concepts.",
                "source_pages": [1],
                "recommended_action": "read",
            },
            {
                "step_number": 2,
                "title": "Intelligent Agents & Models",
                "description": "Architectural principles.",
                "source_pages": [1],
                "recommended_action": "study_notes",
            },
            {
                "step_number": 3,
                "title": "Real-world Applications",
                "description": "Application cases.",
                "source_pages": [1],
                "recommended_action": "ask_ai",
            },
            {
                "step_number": 4,
                "title": "Comprehensive Mastery Quiz",
                "description": "Assess learning.",
                "source_pages": [1],
                "recommended_action": "quiz",
            },
        ],
    })
    resp = client.post(f"/api/learning-path/{doc_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Mastering Artificial Intelligence"
    assert len(data["steps"]) == 4
    assert data["steps"][0]["recommended_action"] == "read"
    assert data["steps"][-1]["recommended_action"] == "quiz"

