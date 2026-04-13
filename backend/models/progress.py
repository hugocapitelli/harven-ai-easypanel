from sqlalchemy import Column, String, Integer, Float, ForeignKey, UniqueConstraint, DateTime, func
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class CourseProgress(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "course_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course_progress"),
    )

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=False)
    progress_percent = Column(Float, nullable=True, default=0)
    completed_contents = Column(Integer, nullable=True, default=0)
    total_contents = Column(Integer, nullable=True, default=0)
    last_accessed = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=_utcnow(), onupdate=func.now(), nullable=True)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
