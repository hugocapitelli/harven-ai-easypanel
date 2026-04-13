from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Discipline(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "disciplines"

    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(String(2000), nullable=True)
    image_url = Column(String(500), nullable=True)
    department = Column(String(255), nullable=True)
    jacad_codigo = Column(String(100), nullable=True)

    # Relationships
    teachers = relationship("DisciplineTeacher", back_populates="discipline")
    students = relationship("DisciplineStudent", back_populates="discipline")
    courses = relationship("Course", back_populates="discipline")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        # Frontend expects 'title' — alias from 'name' for compatibility
        result["title"] = result.get("name", "")
        return result


class DisciplineTeacher(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "discipline_teachers"
    __table_args__ = (
        UniqueConstraint("discipline_id", "teacher_id", name="uq_discipline_teacher"),
    )

    discipline_id = Column(String(36), ForeignKey("disciplines.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    discipline = relationship("Discipline", back_populates="teachers")
    teacher = relationship("User", back_populates="taught_disciplines")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result


class DisciplineStudent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "discipline_students"
    __table_args__ = (
        UniqueConstraint("discipline_id", "student_id", name="uq_discipline_student"),
    )

    discipline_id = Column(String(36), ForeignKey("disciplines.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    discipline = relationship("Discipline", back_populates="students")
    student = relationship("User", back_populates="enrolled_disciplines")

    def to_dict(self):
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[c.name] = val
        return result
