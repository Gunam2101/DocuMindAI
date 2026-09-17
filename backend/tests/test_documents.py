import io
import time

import fitz
import pytest


def make_pdf_bytes(text="Artificial Intelligence is the simulation of human intelligence by machines.", pages=2) -> bytes:
    doc = fitz.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_text((72, 72), text)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_upload_rejects_non_pdf(client, auth_headers):
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("notes.txt", b"just some text", "text/plain")},
    )
    assert resp.status_code == 400


def test_upload_rejects_empty_file(client, auth_headers):
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert resp.status_code == 400


def test_upload_requires_auth(client):
    resp = client.post("/api/documents", files={"file": ("a.pdf", make_pdf_bytes(), "application/pdf")})
    assert resp.status_code == 401


def test_upload_and_processing_reaches_ready(client, auth_headers, fake_embedder):
    pdf_bytes = make_pdf_bytes()
    resp = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("ai_basics.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 201
    doc = resp.json()
    assert doc["status"] in ("UPLOADING", "UPLOADED", "PROCESSING", "READY")

    # Background task runs within the TestClient's request lifecycle.
    for _ in range(5):
        check = client.get(f"/api/documents/{doc['id']}", headers=auth_headers)
        if check.json()["status"] in ("READY", "FAILED"):
            break
        time.sleep(0.2)

    final = client.get(f"/api/documents/{doc['id']}", headers=auth_headers).json()
    assert final["status"] == "READY"
    assert final["page_count"] == 2


def test_list_documents_only_shows_own(client, auth_headers, fake_embedder):
    client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("a.pdf", make_pdf_bytes(), "application/pdf")},
    )

    other = client.post("/api/auth/register", json={
        "name": "Other Student", "email": "other@example.com", "password": "SecurePass123",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    my_docs = client.get("/api/documents", headers=auth_headers).json()["documents"]
    other_docs = client.get("/api/documents", headers=other_headers).json()["documents"]

    assert len(my_docs) == 1
    assert len(other_docs) == 0


def test_cannot_access_another_users_document(client, auth_headers, fake_embedder):
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("a.pdf", make_pdf_bytes(), "application/pdf")},
    ).json()

    other = client.post("/api/auth/register", json={
        "name": "Other Student", "email": "other2@example.com", "password": "SecurePass123",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    resp = client.get(f"/api/documents/{doc['id']}", headers=other_headers)
    assert resp.status_code == 403


def test_delete_document(client, auth_headers, fake_embedder):
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("a.pdf", make_pdf_bytes(), "application/pdf")},
    ).json()

    resp = client.delete(f"/api/documents/{doc['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp2 = client.get(f"/api/documents/{doc['id']}", headers=auth_headers)
    assert resp2.status_code == 404


def test_view_document_serves_real_pdf(client, auth_headers, fake_embedder):
    pdf_content = make_pdf_bytes("Hello DocuMind AI PDF Viewer")
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("view_test.pdf", pdf_content, "application/pdf")},
    ).json()

    resp = client.get(f"/api/documents/{doc['id']}/view", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "application/pdf"
    assert "inline" in resp.headers["Content-Disposition"]
    assert resp.content == pdf_content


def test_download_document_serves_real_pdf(client, auth_headers, fake_embedder):
    pdf_content = make_pdf_bytes("Hello DocuMind AI PDF Download")
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("download_test.pdf", pdf_content, "application/pdf")},
    ).json()

    resp = client.get(f"/api/documents/{doc['id']}/download", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "application/pdf"
    assert "attachment" in resp.headers["Content-Disposition"]
    assert resp.content == pdf_content


def test_view_and_download_enforce_user_isolation(client, auth_headers, fake_embedder):
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("secret.pdf", make_pdf_bytes(), "application/pdf")},
    ).json()

    other = client.post("/api/auth/register", json={
        "name": "User B", "email": "userb_view@example.com", "password": "SecurePass123",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    view_resp = client.get(f"/api/documents/{doc['id']}/view", headers=other_headers)
    assert view_resp.status_code == 403

    download_resp = client.get(f"/api/documents/{doc['id']}/download", headers=other_headers)
    assert download_resp.status_code == 403


def test_document_status_diagnostic_endpoint(client, auth_headers, fake_embedder):
    doc = client.post(
        "/api/documents",
        headers=auth_headers,
        files={"file": ("status_test.pdf", make_pdf_bytes("Doc status test content"), "application/pdf")},
    ).json()

    resp = client.get(f"/api/documents/{doc['id']}/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == doc["id"]
    assert "status" in data
    assert "page_count" in data
    assert "chunks_count" in data
