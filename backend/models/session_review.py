from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class SessionReview(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "session_reviews"

    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    instructor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="pending_student")
    created_at = Column(DateTime, server_default=_utcnow(), nullable=False)
    updated_at = Column(DateTime, server_default=_utcnow(), onupdate=func.now(), nullable=True)

    # Relationships
    session = relationship("ChatSession", backref="review", uselist=False)
    instructor = relationship("User")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
