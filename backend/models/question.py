from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class Question(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "questions"

    content_id = Column(String(36), ForeignKey("contents.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=True)
    status = Column(String(20), nullable=True, default="active")
    extra_metadata = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, server_default=_utcnow(), nullable=False)

    # Relationships
    content = relationship("Content", back_populates="questions")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            # Use c.key (Python attr name) to get value, c.name for dict key
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result
