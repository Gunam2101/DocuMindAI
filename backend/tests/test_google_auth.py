import pytest
from app.auth.google import GoogleAuthError
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.user import User
from app.vector_store.faiss_store import build_index


def test_google_auth_missing_credential(client):
    resp = client.post("/api/auth/google", json={})
    assert resp.status_code == 422


def test_google_auth_empty_credential(client):
    resp = client.post("/api/auth/google", json={"credential": ""})
    assert resp.status_code in (400, 422)


def test_google_auth_invalid_token(client, monkeypatch):
    def _mock_verify(cred, client_id):
        raise GoogleAuthError(detail="Google sign-in could not be verified.", error_code="GOOGLE_TOKEN_INVALID", status_code=401)

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp = client.post("/api/auth/google", json={"credential": "invalid.jwt.token"})
    assert resp.status_code == 401
    assert "could not be verified" in resp.json()["detail"]


def test_google_auth_expired_token(client, monkeypatch):
    def _mock_verify(cred, client_id):
        raise GoogleAuthError(detail="Google sign-in session expired. Please try again.", error_code="GOOGLE_TOKEN_EXPIRED", status_code=401)

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp = client.post("/api/auth/google", json={"credential": "expired.jwt.token"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"]


def test_google_auth_wrong_audience(client, monkeypatch):
    def _mock_verify(cred, client_id):
        raise GoogleAuthError(detail="Google sign-in could not be verified.", error_code="GOOGLE_AUDIENCE_MISMATCH", status_code=401)

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp = client.post("/api/auth/google", json={"credential": "wrong.audience.token"})
    assert resp.status_code == 401


def test_google_auth_new_user_creation_and_jwt(client, monkeypatch):
    def _mock_verify(cred, client_id):
        return {
            "sub": "google_sub_123456",
            "email": "newlearner@gmail.com",
            "name": "New Learner",
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp = client.post("/api/auth/google", json={"credential": "valid.new.token"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newlearner@gmail.com"
    assert data["user"]["name"] == "New Learner"

    # Verify that the generated DocuMind JWT works against protected endpoints
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newlearner@gmail.com"


def test_google_auth_existing_google_user_login(client, monkeypatch):
    # First time: user is created
    def _mock_verify(cred, client_id):
        return {
            "sub": "google_sub_repeat_999",
            "email": "repeatuser@gmail.com",
            "name": "Repeat Learner",
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp1 = client.post("/api/auth/google", json={"credential": "valid.token.1"})
    assert resp1.status_code == 200
    user_id = resp1.json()["user"]["id"]

    # Second time: same google_sub -> returns existing user without duplicates
    resp2 = client.post("/api/auth/google", json={"credential": "valid.token.2"})
    assert resp2.status_code == 200
    assert resp2.json()["user"]["id"] == user_id
    assert resp2.json()["user"]["email"] == "repeatuser@gmail.com"


def test_google_auth_existing_local_email_conflict_link_required(client, monkeypatch):
    # 1. User registers via normal email and password
    reg_resp = client.post("/api/auth/register", json={
        "name": "Local Student",
        "email": "student@college.edu",
        "password": "Password1234!",
    })
    assert reg_resp.status_code == 201

    # 2. Someone attempts Google login with the exact same email
    def _mock_verify(cred, client_id):
        return {
            "sub": "google_sub_different_888",
            "email": "student@college.edu",
            "name": "Google Student",
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify)
    resp = client.post("/api/auth/google", json={"credential": "conflict.token"})
    assert resp.status_code == 409
    data = resp.json()
    assert "GOOGLE_ACCOUNT_LINK_REQUIRED" in data.get("error_code", "")
    assert "already has a DocuMind account" in data["detail"]


def test_unauthorized_api_remains_protected(client):
    resp = client.get("/api/documents")
    assert resp.status_code == 401


def test_google_user_document_ownership_and_isolation(client, monkeypatch, fake_embedder):
    # Create Google User 1
    def _mock_verify_user1(cred, client_id):
        return {
            "sub": "google_user_1",
            "email": "guser1@gmail.com",
            "name": "Google User One",
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify_user1)
    auth_resp1 = client.post("/api/auth/google", json={"credential": "token1"})
    token1 = auth_resp1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # User 1 uploads document
    upload_resp = client.post(
        "/api/documents",
        headers=headers1,
        files={"file": ("quantum_computing.pdf", b"%PDF-1.4 sample bytes", "application/pdf")},
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # Google User 1 can access their document
    get_resp = client.get(f"/api/documents/{doc_id}", headers=headers1)
    assert get_resp.status_code == 200
    assert get_resp.json()["filename"] == "quantum_computing.pdf"

    # Create Google User 2
    def _mock_verify_user2(cred, client_id):
        return {
            "sub": "google_user_2",
            "email": "guser2@gmail.com",
            "name": "Google User Two",
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr("app.routes.auth.verify_google_credential", _mock_verify_user2)
    auth_resp2 = client.post("/api/auth/google", json={"credential": "token2"})
    token2 = auth_resp2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Google User 2 CANNOT access Google User 1's document -> 403 Forbidden
    cross_resp = client.get(f"/api/documents/{doc_id}", headers=headers2)
    assert cross_resp.status_code == 403
