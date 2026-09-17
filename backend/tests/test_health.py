def test_health_check_returns_status(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    assert "checks" in body
    assert body["checks"]["database"] == "ok"
