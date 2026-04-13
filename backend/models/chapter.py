from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin


class Chapter(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "chapters"

    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    order = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    course = relationship("Course", back_populates="chapters")
    contents = relationship("Content", back_populates="chapter", cascade="all, delete-orphan")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
