from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class Content(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "contents"

    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=True)
    content_url = Column(String(500), nullable=True)
    text_content = Column(Text, nullable=True)
    text_url = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)
    duration = Column(Integer, nullable=True)
    order = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime, server_default=_utcnow(), nullable=False)

    # Relationships
    chapter = relationship("Chapter", back_populates="contents")
    questions = relationship("Question", back_populates="content", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="content")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
