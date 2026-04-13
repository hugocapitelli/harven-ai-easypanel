from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, func
from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SystemSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "system_settings"

    # General
    platform_name = Column(String(255), nullable=True, default="Harven.AI")
    base_url = Column(String(500), nullable=True, default="https://harven.eximiaventures.com.br")
    support_email = Column(String(255), nullable=True, default="suporte@harven.ai")
    primary_color = Column(String(20), nullable=True, default="#d0ff00")
    logo_url = Column(String(500), nullable=True)
    login_logo_url = Column(String(500), nullable=True)
    login_bg_url = Column(String(500), nullable=True)

    # Modules
    module_auto_register = Column(Boolean, nullable=True, default=True)
    module_ai_tutor = Column(Boolean, nullable=True, default=True)
    module_gamification = Column(Boolean, nullable=True, default=True)
    module_dark_mode = Column(Boolean, nullable=True, default=True)

    # Limits
    limit_tokens = Column(Integer, nullable=True, default=2048)
    limit_upload_mb = Column(Integer, nullable=True, default=500)
    ai_daily_token_limit = Column(Integer, nullable=True, default=500000)

    # Integrations
    openai_key = Column(String(500), nullable=True, default="")
    anthropic_connected = Column(Boolean, nullable=True, default=False)
    sso_azure = Column(Boolean, nullable=True, default=True)
    sso_google = Column(Boolean, nullable=True, default=False)

    # Moodle LMS
    moodle_url = Column(String(500), nullable=True, default="")
    moodle_token = Column(String(500), nullable=True, default="")
    moodle_enabled = Column(Boolean, nullable=True, default=False)
    moodle_sync_frequency = Column(String(50), nullable=True, default="manual")
    moodle_last_sync = Column(String(50), nullable=True)
    moodle_export_format = Column(String(20), nullable=True, default="xapi")
    moodle_auto_export = Column(Boolean, nullable=True, default=False)
    moodle_portfolio_enabled = Column(Boolean, nullable=True, default=True)
    moodle_rating_enabled = Column(Boolean, nullable=True, default=True)
    moodle_webhook_secret = Column(String(500), nullable=True, default="")

    # JACAD
    jacad_enabled = Column(Boolean, nullable=True, default=False)
    jacad_url = Column(String(500), nullable=True, default="")
    jacad_api_key = Column(String(500), nullable=True, default="")
    jacad_sync_frequency = Column(String(50), nullable=True, default="manual")
    jacad_last_sync = Column(String(50), nullable=True)
    jacad_auto_create_users = Column(Boolean, nullable=True, default=True)
    jacad_sync_enrollments = Column(Boolean, nullable=True, default=True)

    # SMTP
    smtp_server = Column(String(255), nullable=True, default="")
    smtp_port = Column(Integer, nullable=True, default=587)
    smtp_user = Column(String(255), nullable=True, default="")
    smtp_password = Column(String(500), nullable=True, default="")

    # Security
    pwd_min_length = Column(Integer, nullable=True, default=8)
    pwd_special_chars = Column(Boolean, nullable=True, default=True)
    pwd_expiration = Column(Boolean, nullable=True, default=False)
    session_timeout = Column(String(50), nullable=True, default="30 minutos")
    force_2fa = Column(Boolean, nullable=True, default=False)
    firewall_blocked_ips = Column(Text, nullable=True, default="")
    firewall_whitelist = Column(Text, nullable=True, default="")
    last_force_logout = Column(String(50), nullable=True)

    # Backups
    backup_enabled = Column(Boolean, nullable=True, default=True)
    backup_frequency = Column(String(50), nullable=True, default="Diário")
    backup_retention = Column(Integer, nullable=True, default=30)

    _SENSITIVE_FIELDS = {"openai_key", "moodle_token", "moodle_webhook_secret", "jacad_api_key", "smtp_password"}

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        for field in self._SENSITIVE_FIELDS:
            if field in result and result[field]:
                val = str(result[field])
                result[field] = val[:4] + "****" if len(val) > 4 else "****"
        return result


class SystemLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "system_logs"

    msg = Column(Text, nullable=True)
    author = Column(String(255), nullable=True)
    status = Column(String(50), nullable=True)
    type = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result


class SystemBackup(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "system_backups"

    name = Column(String(255), nullable=True)
    size_mb = Column(Float, nullable=True)
    status = Column(String(50), nullable=True)
    type = Column(String(50), nullable=True)
    records = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def to_dict(self):
        result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        for key, val in result.items():
            if hasattr(val, "isoformat"):
                result[key] = val.isoformat()
        return result
