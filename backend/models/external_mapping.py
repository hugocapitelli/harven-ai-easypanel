from sqlalchemy import Column, String, DateTime, func
from .base import Base, UUIDPrimaryKeyMixin


class ExternalMapping(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "external_mappings"

    entity_type = Column(String(50), nullable=False)
    local_id = Column(String(36), nullable=False)
    external_id = Column(String(255), nullable=False)
    external_system = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
