from sqlalchemy import Column, String, DateTime, func, text
from sqlalchemy.orm import DeclarativeBase
import os
import uuid

# Detect database dialect from DATABASE_URL
_db_url = os.getenv("DATABASE_URL", "")
_is_postgres = _db_url.startswith("postgresql")


def _genuuid():
    """Return the appropriate UUID generation for the current DB."""
    if _is_postgres:
        return text("gen_random_uuid()::varchar")
    # SQLite: generate in Python
    return None


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)


class UUIDPrimaryKeyMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=_genuuid())
