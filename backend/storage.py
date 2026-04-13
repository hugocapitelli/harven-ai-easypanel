"""
Harven.AI Storage — Local Filesystem Only

All file storage uses local filesystem (/app/uploads/ in Docker, ./uploads/ in dev).
No cloud storage dependencies.

All consumers use storage_from("container") — same API as before.
"""

import os
import logging
import shutil

logger = logging.getLogger("harven.storage")


class LocalStorageBucket:
    """Local filesystem storage with supabase-compatible API."""

    def __init__(self, container: str, base_path: str = None):
        self.container = container
        self.base_path = base_path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "uploads"
        )
        self.container_path = os.path.join(self.base_path, container)
        os.makedirs(self.container_path, exist_ok=True)

    def upload(self, file_path, content, opts=None):
        """Save file to local filesystem."""
        full_path = os.path.join(self.container_path, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        if isinstance(content, (bytes, bytearray)):
            with open(full_path, "wb") as f:
                f.write(content)
        elif isinstance(content, str):
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
        else:
            # File-like object
            with open(full_path, "wb") as f:
                if hasattr(content, "read"):
                    shutil.copyfileobj(content, f)
                else:
                    f.write(bytes(content))

        url = f"/uploads/{self.container}/{file_path}"
        logger.debug(f"[Storage] Uploaded: {url}")
        return url

    def get_public_url(self, file_path):
        """Return local URL path."""
        return f"/uploads/{self.container}/{file_path}"

    def create_signed_url(self, file_path, expires_in=3600):
        """Local files don't need signing — return direct URL."""
        url = f"/uploads/{self.container}/{file_path}"
        return {"signedURL": url}

    def remove(self, file_paths):
        """Delete files from local filesystem."""
        for fp in file_paths:
            full = os.path.join(self.container_path, fp)
            try:
                if os.path.exists(full):
                    os.remove(full)
                    logger.debug(f"[Storage] Deleted: {fp}")
            except Exception as e:
                logger.warning(f"[Storage] Failed to delete {fp}: {e}")


# Keep blob_storage as None for backward compat with imports
blob_storage = None

print("✓ Storage: Local filesystem (./uploads/)")


def storage_from(container: str):
    """
    Storage bucket accessor. Returns LocalStorageBucket.
    Compatible with supabase storage.from_("bucket") pattern.
    """
    return LocalStorageBucket(container)
