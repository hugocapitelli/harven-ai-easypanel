from sqlalchemy import Column, String, Integer, Date, ForeignKey, UniqueConstraint, text
from .base import Base, UUIDPrimaryKeyMixin


class TokenUsage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "token_usage"
    __table_args__ = (
        UniqueConstraint("user_id", "usage_date", name="uq_user_usage_date"),
    )

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    tokens_used = Column(Integer, nullable=True, default=0)
    usage_date = Column(Date, server_default=text("CURRENT_DATE"), nullable=False)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
