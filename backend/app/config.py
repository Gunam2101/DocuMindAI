"""
Central configuration for DocuMind AI backend.
All secrets/config come from environment variables — nothing is hardcoded.
"""
import os
from pathlib import Path
from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Disable broken hf_xet CAS transport on Windows before huggingface_hub is imported
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

# Ensure .env is resolved whether started from backend/ or project root
_ENV_FILE_CANDIDATES = [
    Path(".env"),
    Path(__file__).resolve().parent.parent / ".env",
]
_ENV_FILE = next((str(p) for p in _ENV_FILE_CANDIDATES if p.is_file()), ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    # --- App ---
    APP_NAME: str = "DocuMind AI"
    ENV: str = "development"
    DEBUG: bool = True

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg://documind:documind@localhost:5432/documind"

    # --- Auth ---
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    GOOGLE_CLIENT_ID: str = ""

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # --- LLM (Groq) ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # --- Vision ---
    VISION_PROVIDER: str = "groq"  # groq | openai | anthropic
    VISION_MODEL: str = "llama-3.2-90b-vision-preview"
    VISION_API_KEY: str = ""  # falls back to GROQ_API_KEY if empty and provider=groq

    # --- Embeddings ---
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"

    # --- Vector store ---
    VECTOR_STORE: str = "faiss"
    FAISS_INDEX_DIR: str = "./storage/faiss"

    # --- Storage & Object Store ---
    STORAGE_BACKEND: str = "local"  # local | vercel_blob | s3
    BLOB_READ_WRITE_TOKEN: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "auto"

    # --- Serverless / Background Processing ---
    SYNC_DOCUMENT_PROCESSING: bool = False

    # --- OCR ---
    TESSERACT_CMD: str = "tesseract"

    # --- Uploads ---
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_UPLOAD_MB: int = 50

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_storage(self) -> "Settings":
        if self.ENV.lower() == "production":
            backend = (self.STORAGE_BACKEND or "").strip().lower()
            if backend == "local":
                raise ValueError(
                    "Production configuration error: STORAGE_BACKEND cannot be 'local' when ENV='production'. "
                    "Production requires durable cloud storage such as 'vercel_blob' or 's3'."
                )
            if backend == "vercel_blob" and not self.BLOB_READ_WRITE_TOKEN:
                raise ValueError(
                    "Production configuration error: BLOB_READ_WRITE_TOKEN must be configured when STORAGE_BACKEND='vercel_blob'."
                )
            if backend == "s3" and not self.S3_BUCKET_NAME:
                raise ValueError(
                    "Production configuration error: S3_BUCKET_NAME must be configured when STORAGE_BACKEND='s3'."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
