from sqlalchemy import Column, String, Integer, Text, DateTime, func
from .base import Base, UUIDPrimaryKeyMixin


class IntegrationLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "integration_logs"

    system = Column(String(50), nullable=False)
    operation = Column(String(100), nullable=True)
    direction = Column(String(20), nullable=True)
    status = Column(String(20), nullable=True)
    records_processed = Column(Integer, nullable=True, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
