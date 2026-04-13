from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    ra = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    title = Column(String(255), nullable=True)
    bio = Column(String(2000), nullable=True)
    password_hash = Column(String(255), nullable=True)
    moodle_user_id = Column(String(100), nullable=True)
    jacad_ra = Column(String(50), nullable=True)

    # Relationships
    taught_disciplines = relationship("DisciplineTeacher", back_populates="teacher")
    enrolled_disciplines = relationship("DisciplineStudent", back_populates="student")
    activities = relationship("UserActivity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        result.pop("password_hash", None)
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
