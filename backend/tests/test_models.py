"""Tests for SQLAlchemy model serialization and security."""
import uuid
from models import User, SystemSettings, ChatSession, ChatMessage


class TestUserModel:
    def test_to_dict_excludes_password_hash(self, db):
        user = User(
            id=str(uuid.uuid4()),
            name="Secure User",
            email=f"sec-{uuid.uuid4().hex[:6]}@test.com",
            password_hash="$2b$12$secrethash",
            role="STUDENT",
            ra=f"RA{uuid.uuid4().hex[:8]}",
        )
        db.add(user)
        db.commit()

        d = user.to_dict()
        assert "password_hash" not in d
        assert d["name"] == "Secure User"
        assert d["role"] == "STUDENT"

    def test_to_dict_serializes_dates(self, db, sample_user):
        d = sample_user.to_dict()
        if d.get("created_at"):
            assert isinstance(d["created_at"], str)


class TestSystemSettingsModel:
    def test_to_dict_masks_openai_key(self, db):
        settings = SystemSettings(
            id=str(uuid.uuid4()),
            platform_name="Test",
            openai_key="sk-1234567890abcdef",
        )
        db.add(settings)
        db.commit()

        d = settings.to_dict()
        assert d["openai_key"] == "sk-1****"

    def test_to_dict_masks_moodle_token(self, db):
        settings = SystemSettings(
            id=str(uuid.uuid4()),
            platform_name="Test",
            moodle_token="moodle-secret-token-123",
        )
        db.add(settings)
        db.commit()

        d = settings.to_dict()
        assert d["moodle_token"] == "mood****"

    def test_to_dict_masks_short_keys(self, db):
        settings = SystemSettings(
            id=str(uuid.uuid4()),
            platform_name="Test",
            smtp_password="abc",
        )
        db.add(settings)
        db.commit()

        d = settings.to_dict()
        assert d["smtp_password"] == "****"

    def test_to_dict_empty_sensitive_field(self, db):
        settings = SystemSettings(
            id=str(uuid.uuid4()),
            platform_name="Test",
            openai_key="",
        )
        db.add(settings)
        db.commit()

        d = settings.to_dict()
        # Empty string → falsy → no masking needed
        assert d["openai_key"] == ""

    def test_non_sensitive_fields_visible(self, db):
        settings = SystemSettings(
            id=str(uuid.uuid4()),
            platform_name="Harven.AI",
            moodle_url="https://moodle.example.com",
            moodle_enabled=True,
        )
        db.add(settings)
        db.commit()

        d = settings.to_dict()
        assert d["platform_name"] == "Harven.AI"
        assert d["moodle_url"] == "https://moodle.example.com"
        assert d["moodle_enabled"] is True


class TestChatModels:
    def test_chat_session_to_dict(self, db, sample_user):
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=sample_user.id,
            status="active",
            total_messages=5,
        )
        db.add(session)
        db.commit()

        d = session.to_dict()
        assert d["status"] == "active"
        assert d["total_messages"] == 5

    def test_chat_message_to_dict(self, db, sample_user):
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=sample_user.id,
        )
        db.add(session)
        db.commit()

        msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role="user",
            content="Hello World",
        )
        db.add(msg)
        db.commit()

        d = msg.to_dict()
        assert d["role"] == "user"
        assert d["content"] == "Hello World"
