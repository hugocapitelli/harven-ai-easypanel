from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class UserActivity(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "user_activities"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=True)
    target_type = Column(String(50), nullable=True)
    target_id = Column(String(36), nullable=True)
    target_title = Column(String(255), nullable=True)
    extra_metadata = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, server_default=_utcnow(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="activities")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result


class UserStats(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "user_stats"

    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    courses_completed = Column(Integer, nullable=True, default=0)
    courses_in_progress = Column(Integer, nullable=True, default=0)
    hours_studied = Column(Float, nullable=True, default=0)
    average_score = Column(Float, nullable=True, default=0)
    certificates = Column(Integer, nullable=True, default=0)
    total_activities = Column(Integer, nullable=True, default=0)
    streak_days = Column(Integer, nullable=True, default=0)
    last_activity = Column(DateTime, nullable=True)

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result


class UserAchievement(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "user_achievements"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    achievement_id = Column(String(100), nullable=True)
    title = Column(String(255), nullable=True)
    description = Column(String(500), nullable=True)
    icon = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    points = Column(Integer, nullable=True, default=0)
    rarity = Column(String(50), nullable=True)
    unlocked_at = Column(DateTime, server_default=_utcnow(), nullable=True)

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result


class Certificate(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "certificates"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=True)
    course_title = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)
    issued_at = Column(DateTime, server_default=_utcnow(), nullable=True)
    certificate_number = Column(String(100), nullable=True)

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result
