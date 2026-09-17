import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.routes import auth, chat, content, documents, health, settings as settings_routes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("documind")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Production startup validation for storage backend
    if settings.ENV.lower() == "production" and (settings.STORAGE_BACKEND or "").strip().lower() == "local":
        raise RuntimeError(
            "Production configuration error: STORAGE_BACKEND cannot be 'local' when ENV='production'. "
            "Production requires durable cloud storage such as 'vercel_blob' or 's3'."
        )

    init_db()
    # Recover any orphaned documents left in PROCESSING or UPLOADING if previous server terminated
    try:
        from app.database import SessionLocal
        from app.models.document import Document, DocumentStatus
        db = SessionLocal()
        try:
            orphaned = db.query(Document).filter(
                Document.status.in_([DocumentStatus.PROCESSING, DocumentStatus.UPLOADING])
            ).all()
            if orphaned:
                for doc in orphaned:
                    doc.status = DocumentStatus.FAILED
                    doc.failure_reason = "Processing was interrupted due to a server restart. Please re-upload this document."
                db.commit()
                logger.info("[STARTUP] Recovered %s orphaned document(s) and marked FAILED", len(orphaned))
        finally:
            db.close()
    except Exception as exc:
        logger.warning("[STARTUP] Error during orphaned document recovery: %s", exc)

    # Safe AI service startup diagnostics (never logs secrets)
    logger.info("[AI] Provider: Groq")
    logger.info("[AI] API key: %s", "configured" if settings.GROQ_API_KEY else "missing")
    logger.info("[AI] Model: %s", settings.GROQ_MODEL)
    logger.info("[AI] AI service initialization: OK")

    logger.info("[APP] DocuMind AI backend started")
    yield
    logger.info("[APP] DocuMind AI backend shutting down")


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensures every error returns the {detail, error_code} contract, never a raw traceback."""
    error_code = getattr(exc, "error_code", None) or f"HTTP_{exc.status_code}"
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "error_code": error_code})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic validation errors into the standard {detail, error_code} contract."""
    errors = exc.errors()
    msg_parts = []
    for err in errors[:3]:  # Top errors for clarity
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        msg_parts.append(f"{loc}: {msg}" if loc else msg)
    detail = "; ".join(msg_parts) if msg_parts else "Invalid request payload."
    return JSONResponse(
        status_code=422,
        content={"detail": detail, "error_code": "VALIDATION_ERROR"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("[APP] unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong while processing your request.", "error_code": "INTERNAL_ERROR"},
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(content.router)
app.include_router(settings_routes.router)
