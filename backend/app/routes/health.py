import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
def health_check(check_llm_live: bool = Query(False, description="Optionally perform a live ping to the AI provider endpoint"), db: Session = Depends(get_db)):
    checks = {
        "api": "ok",
        "database": "unknown",
        "storage": "unknown",
        "embedding_model": "unknown",
        "vector_store": "unknown",
        "llm": "unknown",
    }

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    try:
        from app.storage.service import get_storage_service
        storage = get_storage_service()
        backend_name = storage.__class__.__name__
        checks["storage"] = f"ok ({backend_name})"
    except Exception as exc:
        checks["storage"] = f"error ({exc})"

    try:
        from app.embeddings.embedder import get_embedding_service
        if hasattr(get_embedding_service, "cache_info") and get_embedding_service.cache_info().currsize > 0:
            svc = get_embedding_service()
            checks["embedding_model"] = f"ok ({svc.model_name}, dim={svc.dimension})"
        else:
            checks["embedding_model"] = f"configured ({settings.EMBEDDING_MODEL})"
    except Exception:
        checks["embedding_model"] = "error"

    checks["vector_store"] = f"{settings.VECTOR_STORE} configured"

    llm_status: dict = {
        "configured": bool(settings.GROQ_API_KEY),
        "provider": "groq",
        "model": settings.GROQ_MODEL,
        "reachable": None,
    }
    if check_llm_live and settings.GROQ_API_KEY:
        try:
            res = httpx.get(
                f"{settings.GROQ_BASE_URL}/models",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                timeout=5.0,
            )
            llm_status["reachable"] = (res.status_code == 200)
        except Exception:
            llm_status["reachable"] = False

    checks["llm"] = llm_status

    llm_ok = llm_status["configured"] and (llm_status["reachable"] is not False)
    db_ok = checks["database"] == "ok"
    overall = "ok" if (db_ok and llm_ok) else "degraded"

    return {"status": overall, "checks": checks}

