"""Tests for repository layer — CRUD operations via SQLAlchemy."""
import uuid
import pytest
from repositories.user_repo import UserRepository
from repositories.discipline_repo import DisciplineRepository
from repositories.admin_repo import AdminRepository
from repositories.chat_repo import ChatRepository
from repositories.gamification_repo import GamificationRepository
from repositories.notification_repo import NotificationRepository
from models import User, Discipline, ChatSession, Content, Chapter, Notification


# ─── UserRepository ──────────────────────────────────────────────────

class TestUserRepository:
    def test_create_user(self, db):
        repo = UserRepository(db)
        user = repo.create({
            "id": str(uuid.uuid4()),
            "name": "New User",
            "email": f"new-{uuid.uuid4().hex[:6]}@test.com",
            "password_hash": "$2b$12$test",
            "role": "STUDENT",
            "ra": f"RA{uuid.uuid4().hex[:8]}",
        })
        assert user.id is not None
        assert user.name == "New User"

    def test_get_by_id(self, db, sample_user):
        repo = UserRepository(db)
        found = repo.get_by_id(sample_user.id)
        assert found is not None
        assert found.email == sample_user.email

    def test_get_by_id_not_found(self, db):
        repo = UserRepository(db)
        assert repo.get_by_id("nonexistent-id") is None

    def test_get_by_email(self, db, sample_user):
        repo = UserRepository(db)
        # UserRepository doesn't have get_by_email; use get_all with email filter
        rows, total = repo.get_all(filters={"email": sample_user.email})
        assert total == 1
        assert rows[0].id == sample_user.id

    def test_get_by_ra(self, db, sample_user):
        repo = UserRepository(db)
        found = repo.get_by_ra("12345")
        assert found is not None
        assert found.id == sample_user.id

    def test_update_user(self, db, sample_user):
        repo = UserRepository(db)
        updated = repo.update(sample_user.id, {"name": "Updated Name"})
        assert updated.name == "Updated Name"

    def test_delete_user(self, db):
        repo = UserRepository(db)
        user = repo.create({
            "id": str(uuid.uuid4()),
            "name": "To Delete",
            "email": f"del-{uuid.uuid4().hex[:6]}@test.com",
            "password_hash": "$2b$12$test",
            "role": "STUDENT",
            "ra": f"RA{uuid.uuid4().hex[:8]}",
        })
        result = repo.delete(user.id)
        assert result is True
        assert repo.get_by_id(user.id) is None

    def test_to_dict_excludes_password(self, db, sample_user):
        d = sample_user.to_dict()
        assert "password_hash" not in d
        assert "name" in d


# ─── DisciplineRepository ────────────────────────────────────────────

class TestDisciplineRepository:
    def test_add_and_get_teachers(self, db, sample_discipline, sample_user):
        # Make user an instructor
        sample_user.role = "INSTRUCTOR"
        db.commit()

        repo = DisciplineRepository(db)
        repo.add_teacher(sample_discipline.id, sample_user.id)
        teachers = repo.get_teachers(sample_discipline.id)
        assert len(teachers) >= 1

    def test_add_and_remove_student(self, db, sample_discipline, sample_user):
        repo = DisciplineRepository(db)
        repo.add_student(sample_discipline.id, sample_user.id)
        students = repo.get_students(sample_discipline.id)
        assert len(students) >= 1

        removed = repo.remove_student(sample_discipline.id, sample_user.id)
        assert removed == 1

    def test_add_students_batch(self, db, sample_discipline):
        repo = DisciplineRepository(db)
        # Create 3 students
        students = []
        for i in range(3):
            s = User(
                id=str(uuid.uuid4()),
                name=f"Batch Student {i}",
                email=f"batch{i}-{uuid.uuid4().hex[:4]}@test.com",
                password_hash="$2b$12$test",
                role="STUDENT",
                ra=f"RA{uuid.uuid4().hex[:8]}",
            )
            db.add(s)
            students.append(s)
        db.commit()

        result = repo.add_students_batch(sample_discipline.id, [s.id for s in students])
        assert len(result) == 3


# ─── AdminRepository ─────────────────────────────────────────────────

class TestAdminRepository:
    def test_create_and_get_settings(self, db):
        repo = AdminRepository(db)
        settings = repo.update_settings({"platform_name": "Test Platform"})
        assert settings.platform_name == "Test Platform"

        fetched = repo.get_settings()
        assert fetched.platform_name == "Test Platform"

    def test_settings_masks_sensitive_fields(self, db):
        repo = AdminRepository(db)
        settings = repo.update_settings({
            "platform_name": "Test",
            "openai_key": "sk-1234567890abcdef",
        })
        d = settings.to_dict()
        assert d["openai_key"] == "sk-1****"
        assert d["platform_name"] == "Test"

    def test_create_log(self, db):
        repo = AdminRepository(db)
        log = repo.create_log({
            "id": str(uuid.uuid4()),
            "msg": "Test log entry",
            "author": "system",
            "status": "success",
            "type": "test",
        })
        assert log.msg == "Test log entry"

    def test_get_logs_pagination(self, db):
        repo = AdminRepository(db)
        for i in range(5):
            repo.create_log({
                "id": str(uuid.uuid4()),
                "msg": f"Log {i}",
                "author": "system",
                "status": "success",
                "type": "test",
            })
        rows, total = repo.get_logs(limit=2, offset=0)
        assert len(rows) == 2
        assert total >= 5

    def test_create_and_delete_backup(self, db):
        repo = AdminRepository(db)
        backup = repo.create_backup({
            "id": str(uuid.uuid4()),
            "name": "test-backup",
            "status": "completed",
            "type": "full",
        })
        assert repo.get_backup_by_id(backup.id) is not None

        deleted = repo.delete_backup(backup.id)
        assert deleted is True
        assert repo.get_backup_by_id(backup.id) is None


# ─── ChatRepository ──────────────────────────────────────────────────

class TestChatRepository:
    def _create_session(self, db, user_id):
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            status="active",
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def test_get_sessions_for_user(self, db, sample_user):
        self._create_session(db, sample_user.id)
        repo = ChatRepository(db)
        sessions = repo.get_sessions_for_user(sample_user.id)
        assert len(sessions) >= 1

    def test_create_message(self, db, sample_user):
        session = self._create_session(db, sample_user.id)
        repo = ChatRepository(db)
        msg = repo.create_message(session.id, {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": "Hello AI!",
        })
        assert msg.content == "Hello AI!"
        assert msg.session_id == session.id

    def test_get_messages(self, db, sample_user):
        session = self._create_session(db, sample_user.id)
        repo = ChatRepository(db)
        repo.create_message(session.id, {"id": str(uuid.uuid4()), "role": "user", "content": "msg1"})
        repo.create_message(session.id, {"id": str(uuid.uuid4()), "role": "assistant", "content": "msg2"})
        messages = repo.get_messages(session.id)
        assert len(messages) == 2


# ─── GamificationRepository ─────────────────────────────────────────

class TestGamificationRepository:
    def test_create_activity(self, db, sample_user):
        repo = GamificationRepository(db)
        activity = repo.create_activity({
            "id": str(uuid.uuid4()),
            "user_id": sample_user.id,
            "action": "login",
            "target_type": "session",
        })
        assert activity.action == "login"
        assert activity.user_id == sample_user.id

    def test_get_or_create_stats(self, db, sample_user):
        repo = GamificationRepository(db)
        stats = repo.get_or_create_stats(sample_user.id)
        assert stats.user_id == sample_user.id

        # Second call should return same record
        stats2 = repo.get_or_create_stats(sample_user.id)
        assert stats2.id == stats.id

    def test_update_stats(self, db, sample_user):
        repo = GamificationRepository(db)
        repo.get_or_create_stats(sample_user.id)
        updated = repo.update_stats(sample_user.id, {"courses_completed": 3, "hours_studied": 12.5})
        assert updated.courses_completed == 3
        assert updated.hours_studied == 12.5

    def test_upsert_progress(self, db, sample_user, sample_course):
        repo = GamificationRepository(db)
        progress = repo.upsert_progress(sample_user.id, sample_course.id, {"progress_percent": 50.0})
        assert progress.progress_percent == 50.0

        # Upsert again → should update
        progress2 = repo.upsert_progress(sample_user.id, sample_course.id, {"progress_percent": 75.0})
        assert progress2.id == progress.id
        assert progress2.progress_percent == 75.0


# ─── NotificationRepository ─────────────────────────────────────────

class TestNotificationRepository:
    def _create_notif(self, db, user_id, read=False):
        n = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title="Test",
            message="Test notification",
            type="info",
            read=read,
        )
        db.add(n)
        db.commit()
        return n

    def test_get_for_user(self, db, sample_user):
        self._create_notif(db, sample_user.id)
        self._create_notif(db, sample_user.id)
        repo = NotificationRepository(db)
        rows, total = repo.get_for_user(sample_user.id)
        assert total >= 2

    def test_unread_count(self, db, sample_user):
        self._create_notif(db, sample_user.id, read=False)
        self._create_notif(db, sample_user.id, read=True)
        repo = NotificationRepository(db)
        count = repo.get_unread_count(sample_user.id)
        assert count >= 1

    def test_mark_all_read(self, db, sample_user):
        self._create_notif(db, sample_user.id, read=False)
        self._create_notif(db, sample_user.id, read=False)
        repo = NotificationRepository(db)
        updated = repo.mark_all_read(sample_user.id)
        assert updated >= 2
        assert repo.get_unread_count(sample_user.id) == 0
