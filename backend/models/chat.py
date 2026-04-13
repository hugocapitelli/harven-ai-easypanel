from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin


class ChatSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "chat_sessions"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content_id = Column(String(36), ForeignKey("contents.id"), nullable=True)
    chapter_id = Column(String(36), nullable=True)
    course_id = Column(String(36), nullable=True)
    status = Column(String(20), nullable=True, default="active")
    total_messages = Column(Integer, nullable=True, default=0)
    performance_score = Column(Float, nullable=True)
    started_at = Column(DateTime, server_default=func.now(), nullable=True)
    moodle_user_id = Column(String(100), nullable=True)
    moodle_activity_id = Column(String(100), nullable=True)
    synced_to_moodle = Column(Boolean, nullable=True, default=False)
    moodle_exported_at = Column(DateTime, nullable=True)
    moodle_portfolio_id = Column(String(255), nullable=True)
    moodle_rating = Column(String(50), nullable=True)
    discipline_id = Column(String(36), nullable=True)
    discipline_name = Column(String(255), nullable=True)
    content_title = Column(String(500), nullable=True)
    ai_summary = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    moodle_export_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    content = relationship("Content", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result


class ChatMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "chat_messages"

    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    agent_type = Column(String(50), nullable=True)
    extra_metadata = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result
