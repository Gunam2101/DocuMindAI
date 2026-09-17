def test_register_creates_user_and_returns_token(client):
    resp = client.post("/api/auth/register", json={
        "name": "Ada",
        "email": "ada@example.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["access_token"]
    assert data["user"]["email"] == "ada@example.com"


def test_register_duplicate_email_fails(client):
    payload = {"name": "Ada", "email": "dup@example.com", "password": "SecurePass123"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "error_code" in resp.json()


def test_login_success(client, registered_user):
    resp = client.post("/api/auth/login", json={
        "email": "student@example.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_fails(client, registered_user):
    resp = client.post("/api/auth/login", json={
        "email": "student@example.com",
        "password": "WrongPassword",
    })
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    resp = client.get("/api/documents")
    assert resp.status_code == 401


def test_protected_route_works_with_token(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "student@example.com"


def test_protected_route_rejects_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_openapi_defines_http_bearer_security_scheme(client):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()

    # Must define HTTPBearer with type=http, scheme=bearer
    security_schemes = schema.get("components", {}).get("securitySchemes", {})
    assert "HTTPBearer" in security_schemes
    assert security_schemes["HTTPBearer"]["type"] == "http"
    assert security_schemes["HTTPBearer"]["scheme"] == "bearer"

    # Must NOT define OAuth2PasswordBearer or password flow
    assert "OAuth2PasswordBearer" not in security_schemes

    # Protected endpoint must declare HTTPBearer security
    doc_upload_security = schema["paths"]["/api/documents"]["post"].get("security", [])
    assert any("HTTPBearer" in s for s in doc_upload_security)


def test_pdf_upload_requires_authentication(client):
    pdf_bytes = b"%PDF-1.4 test empty"
    resp = client.post(
        "/api/documents",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_pdf_upload_rejects_invalid_token(client):
    pdf_bytes = b"%PDF-1.4 test empty"
    resp = client.post(
        "/api/documents",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        headers={"Authorization": "Bearer bad-token-xyz"},
    )
    assert resp.status_code == 401


def test_pdf_upload_succeeds_with_valid_token(client, auth_headers):
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    resp = client.post(
        "/api/documents",
        files={"file": ("lecture.pdf", pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"]
    assert data["filename"] == "lecture.pdf"
    assert data["status"].lower() in ("uploading", "processing", "ready")

