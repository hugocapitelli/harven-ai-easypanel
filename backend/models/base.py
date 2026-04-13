from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase
import uuid


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)


class UUIDPrimaryKeyMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
