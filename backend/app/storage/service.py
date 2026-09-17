"""
StorageService abstraction for DocuMind AI.

Supports:
- LocalStorageBackend (development & local testing)
- VercelBlobStorageBackend (production on Vercel)
- S3StorageBackend (production on AWS / Cloudflare R2 / MinIO)

Ensures that document files and uploads do not depend on a persistent local
filesystem in production serverless environments.
"""
import abc
import logging
import os
import tempfile
import uuid
from functools import lru_cache

import httpx

from app.config import get_settings

logger = logging.getLogger("documind")
settings = get_settings()


class StorageBackend(abc.ABC):
    @abc.abstractmethod
    def save_file(self, content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        """Saves file content and returns a stored key or path identifier."""
        pass

    @abc.abstractmethod
    def get_file(self, key_or_path: str) -> bytes:
        """Retrieves raw file bytes."""
        pass

    @abc.abstractmethod
    def delete_file(self, key_or_path: str) -> bool:
        """Deletes file if it exists; returns True if deleted."""
        pass

    @abc.abstractmethod
    def get_url(self, key_or_path: str) -> str | None:
        """Returns direct public/presigned URL if available, else None."""
        pass

    @abc.abstractmethod
    def get_local_path(self, key_or_path: str) -> str:
        """
        Returns a local filesystem path for libraries (e.g. PyMuPDF, tesseract)
        that require a physical file path. For remote storage, this downloads to a
        temp file.
        """
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str | None = None):
        self.base_dir = os.path.abspath(base_dir or settings.UPLOAD_DIR)
        try:
            os.makedirs(self.base_dir, exist_ok=True)
        except OSError:
            # Fallback to temp dir if base_dir is not writable (e.g. read-only serverless container)
            self.base_dir = os.path.join(tempfile.gettempdir(), "documind_uploads")
            os.makedirs(self.base_dir, exist_ok=True)

    def _safe_path(self, filename: str) -> tuple[str, str]:
        ext = os.path.splitext(filename)[1].lower()
        key = f"{uuid.uuid4()}{ext}"
        return key, os.path.join(self.base_dir, key)

    def save_file(self, content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        key, full_path = self._safe_path(filename)
        with open(full_path, "wb") as f:
            f.write(content)
        return full_path

    def get_file(self, key_or_path: str) -> bytes:
        path = key_or_path if os.path.isabs(key_or_path) else os.path.join(self.base_dir, key_or_path)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Stored file not found: {key_or_path}")
        with open(path, "rb") as f:
            return f.read()

    def delete_file(self, key_or_path: str) -> bool:
        path = key_or_path if os.path.isabs(key_or_path) else os.path.join(self.base_dir, key_or_path)
        try:
            if os.path.exists(path):
                os.remove(path)
                return True
        except OSError as e:
            logger.warning("[STORAGE] failed to delete local file %s: %s", path, e)
        return False

    def get_url(self, key_or_path: str) -> str | None:
        return None

    def get_local_path(self, key_or_path: str) -> str:
        return key_or_path if os.path.isabs(key_or_path) else os.path.join(self.base_dir, key_or_path)


class VercelBlobStorageBackend(StorageBackend):
    """
    Stores documents via Vercel Blob REST API when running on Vercel in production.
    Requires BLOB_READ_WRITE_TOKEN.
    """
    def __init__(self, token: str | None = None):
        self.token = token or settings.BLOB_READ_WRITE_TOKEN
        self.base_url = "https://blob.vercel-storage.com"
        self._temp_cache: dict[str, str] = {}

    def save_file(self, content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        if not self.token:
            logger.warning("[STORAGE] BLOB_READ_WRITE_TOKEN not set, falling back to local temp storage")
            fallback = LocalStorageBackend()
            return fallback.save_file(content, filename, content_type)

        ext = os.path.splitext(filename)[1].lower()
        pathname = f"documents/{uuid.uuid4()}{ext}"
        url = f"{self.base_url}/{pathname}"

        headers = {
            "Authorization": f"Bearer {self.token}",
            "x-content-type": content_type,
            "x-add-random-suffix": "false",
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.put(url, headers=headers, content=content)
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"Vercel Blob upload failed: {resp.status_code} {resp.text}")
            data = resp.json()
            return data.get("url") or url

    def get_file(self, key_or_path: str) -> bytes:
        if key_or_path.startswith("http://") or key_or_path.startswith("https://"):
            headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(key_or_path, headers=headers)
                if resp.status_code != 200:
                    raise FileNotFoundError(f"Blob not found at {key_or_path} (status {resp.status_code})")
                return resp.content
        fallback = LocalStorageBackend()
        return fallback.get_file(key_or_path)

    def delete_file(self, key_or_path: str) -> bool:
        if key_or_path.startswith("http://") or key_or_path.startswith("https://"):
            if not self.token:
                return False
            url = f"{self.base_url}/delete"
            headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json={"urls": [key_or_path]})
                return resp.status_code == 200
        fallback = LocalStorageBackend()
        return fallback.delete_file(key_or_path)

    def get_url(self, key_or_path: str) -> str | None:
        if key_or_path.startswith("http://") or key_or_path.startswith("https://"):
            return key_or_path
        return None

    def get_local_path(self, key_or_path: str) -> str:
        if os.path.exists(key_or_path):
            return key_or_path
        if key_or_path in self._temp_cache and os.path.exists(self._temp_cache[key_or_path]):
            return self._temp_cache[key_or_path]

        content = self.get_file(key_or_path)
        ext = os.path.splitext(key_or_path.split("?")[0])[1] or ".pdf"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp.write(content)
        tmp.close()
        self._temp_cache[key_or_path] = tmp.name
        return tmp.name


class S3StorageBackend(StorageBackend):
    """
    S3-compatible object storage backend (AWS S3, Cloudflare R2, MinIO).
    """
    def __init__(self):
        self.endpoint_url = settings.S3_ENDPOINT_URL or None
        self.bucket = settings.S3_BUCKET_NAME
        self.access_key = settings.S3_ACCESS_KEY_ID
        self.secret_key = settings.S3_SECRET_ACCESS_KEY
        self.region = settings.S3_REGION or "auto"
        self._temp_cache: dict[str, str] = {}

    def _get_s3_client(self):
        import boto3
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        )

    def save_file(self, content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        if not self.bucket:
            logger.warning("[STORAGE] S3 bucket not configured, falling back to local storage")
            return LocalStorageBackend().save_file(content, filename, content_type)

        ext = os.path.splitext(filename)[1].lower()
        key = f"documents/{uuid.uuid4()}{ext}"
        client = self._get_s3_client()
        client.put_object(Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)
        return key

    def get_file(self, key_or_path: str) -> bytes:
        if not self.bucket or os.path.exists(key_or_path):
            return LocalStorageBackend().get_file(key_or_path)

        client = self._get_s3_client()
        resp = client.get_object(Bucket=self.bucket, Key=key_or_path)
        return resp["Body"].read()

    def delete_file(self, key_or_path: str) -> bool:
        if not self.bucket or os.path.exists(key_or_path):
            return LocalStorageBackend().delete_file(key_or_path)

        client = self._get_s3_client()
        client.delete_object(Bucket=self.bucket, Key=key_or_path)
        return True

    def get_url(self, key_or_path: str) -> str | None:
        if not self.bucket or os.path.exists(key_or_path):
            return None
        client = self._get_s3_client()
        return client.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": key_or_path}, ExpiresIn=3600)

    def get_local_path(self, key_or_path: str) -> str:
        if os.path.exists(key_or_path):
            return key_or_path
        if key_or_path in self._temp_cache and os.path.exists(self._temp_cache[key_or_path]):
            return self._temp_cache[key_or_path]

        content = self.get_file(key_or_path)
        ext = os.path.splitext(key_or_path)[1] or ".pdf"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp.write(content)
        tmp.close()
        self._temp_cache[key_or_path] = tmp.name
        return tmp.name


@lru_cache
def get_storage_service() -> StorageBackend:
    backend_type = (settings.STORAGE_BACKEND or "local").lower()
    if backend_type == "vercel_blob" or (settings.BLOB_READ_WRITE_TOKEN and backend_type != "local"):
        return VercelBlobStorageBackend()
    if backend_type == "s3" and settings.S3_BUCKET_NAME:
        return S3StorageBackend()
    return LocalStorageBackend()
