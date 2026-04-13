from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "courses"

    discipline_id = Column(String(36), ForeignKey("disciplines.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    instructor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(20), nullable=True, default="draft")
    progress = Column(Float, nullable=True, default=0)
    total_modules = Column(Integer, nullable=True, default=0)
    image = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)

    # Relationships
    discipline = relationship("Discipline", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
