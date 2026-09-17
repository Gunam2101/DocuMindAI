import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ENV"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["GROQ_API_KEY"] = "test-key"  # so config-check doesn't block tests

from app import database as db_module  # noqa: E402
from app.database import Base, get_db  # noqa: E402

TEST_DB_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    from app.models import user, document, chunk, conversation, message, generated  # noqa: F401
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    from app.main import app

    monkeypatch.setattr("app.database.SessionLocal", lambda: db_session)
    monkeypatch.setattr("app.documents.ingestion.SessionLocal", lambda: db_session)

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    resp = client.post("/api/auth/register", json={
        "name": "Test Student",
        "email": "student@example.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    return data


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


class _FakeEmbedder:
    """Deterministic, hash-based fake embedder so tests never need network
    access to download a real sentence-transformers model."""
    model_name = "fake-multilingual-embedder"
    dimension = 16

    def _vec(self, text: str):
        import hashlib
        import numpy as np
        h = hashlib.sha256(text.encode("utf-8")).digest()
        arr = np.frombuffer(h[: self.dimension * 4].ljust(self.dimension * 4, b"\0"), dtype=">f4" if False else "uint8")
        vec = np.array([b for b in h[: self.dimension]], dtype="float32")
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def embed_passages(self, texts):
        import numpy as np
        return np.array([self._vec(t) for t in texts])

    def embed_query(self, text):
        return self._vec(text)


@pytest.fixture(autouse=True)
def fake_embedder(monkeypatch):
    fake = _FakeEmbedder()
    monkeypatch.setattr("app.documents.ingestion.get_embedding_service", lambda: fake)
    monkeypatch.setattr("app.rag.retriever.get_embedding_service", lambda: fake)
    monkeypatch.setattr("app.embeddings.embedder.get_embedding_service", lambda: fake)
    return fake
