from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class MoodleRating(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "moodle_ratings"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=True)
    moodle_rating = Column(String(50), nullable=True)
    moodle_feedback = Column(Text, nullable=True)
    rated_at = Column(DateTime, server_default=_utcnow(), nullable=True)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
