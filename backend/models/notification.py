from sqlalchemy import Column, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, UUIDPrimaryKeyMixin, _utcnow


class Notification(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "notifications"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    type = Column(String(50), nullable=True)
    link = Column(String(500), nullable=True)
    read = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime, server_default=_utcnow(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
