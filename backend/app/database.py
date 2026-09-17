from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

def normalize_database_url(url: str) -> str:
    """
    Safely normalizes PostgreSQL connection URLs to explicitly use psycopg v3
    dialect ('postgresql+psycopg://'), while preserving SQLite and other formats.
    """
    if not url:
        return url
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        return "postgresql+psycopg://" + trimmed[len("postgres://"):]
    if trimmed.startswith("postgresql+psycopg2://"):
        return "postgresql+psycopg://" + trimmed[len("postgresql+psycopg2://"):]
    if trimmed.startswith("postgresql://") and not trimmed.startswith("postgresql+"):
        return "postgresql+psycopg://" + trimmed[len("postgresql://"):]
    return trimmed


normalized_url = normalize_database_url(settings.DATABASE_URL)
engine_kwargs = {"pool_pre_ping": True, "future": True}
# SQLite does not support standard connection pooling arguments
if normalized_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production connection pool parameters for PostgreSQL
    engine_kwargs["connect_args"] = {"connect_timeout": 5}
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 1800
    engine_kwargs["pool_timeout"] = 30

engine = create_engine(normalized_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session, always closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Environment-aware schema initialization.
    In development and testing: automatic creation is permitted.
    In production: schema must be managed via Alembic migrations or pre-provisioned DDL.
    """
    if settings.ENV in ("development", "test"):
        from app.models import user, document, chunk, conversation, message, generated  # noqa: F401
        try:
            Base.metadata.create_all(bind=engine)
            import logging
            logging.getLogger("documind").info("[DB] Database tables initialized successfully")
        except Exception as exc:
            import logging
            logging.getLogger("documind").warning("[DB] Database connection/init failed: %s", exc)
    else:
        # Production: do not run create_all on every serverless startup
        pass
