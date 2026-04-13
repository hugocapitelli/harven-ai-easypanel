"""Shared test fixtures for Harven.AI backend tests.

Uses an in-memory SQLite database so tests run without PostgreSQL.
"""
import sys
import os
import uuid as _uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.base import Base
from models import (  # noqa: F401 — import all models so tables are registered
    User, Discipline, DisciplineTeacher, DisciplineStudent,
    Course, Chapter, Content, Question,
    ChatSession, ChatMessage,
    SystemSettings, SystemLog, SystemBackup,
    UserActivity, UserStats, UserAchievement, Certificate,
    CourseProgress, Notification, TokenUsage,
    MoodleRating, IntegrationLog, ExternalMapping,
    SessionReview,
)


@pytest.fixture(scope="session")
def engine():
    """Create a SQLite in-memory engine for testing."""
    eng = create_engine("sqlite:///:memory:", echo=False)

    @event.listens_for(eng, "connect")
    def _register_functions(dbapi_conn, connection_record):
        """Register compat functions as SQLite user-defined functions."""
        # getutcdate() → current UTC datetime as ISO string
        dbapi_conn.create_function(
            "getutcdate", 0,
            lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )
        # newid() → UUID string
        dbapi_conn.create_function("newid", 0, lambda: str(_uuid.uuid4()))
        # Enable FK support
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    """Provide a transactional session that rolls back ALL changes after each test.

    Uses a nested transaction (savepoint) so that repo .commit() calls
    don't persist data between tests.
    """
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    # Intercept commit to use savepoints instead of real commits
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def sample_user(db):
    """Create a sample user for tests."""
    import uuid
    user = User(
        id=str(uuid.uuid4()),
        name="Test User",
        email="test@harven.ai",
        password_hash="$2b$12$fakehashfortest",
        role="STUDENT",
        ra="12345",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def sample_admin(db):
    """Create a sample admin user for tests."""
    import uuid
    admin = User(
        id=str(uuid.uuid4()),
        name="Admin User",
        email="admin@harven.ai",
        password_hash="$2b$12$fakehashfortest",
        role="ADMIN",
        ra=f"ADM{uuid.uuid4().hex[:6]}",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def sample_discipline(db):
    """Create a sample discipline."""
    import uuid
    disc = Discipline(
        id=str(uuid.uuid4()),
        name="Mathematics",
        code="MAT101",
    )
    db.add(disc)
    db.commit()
    db.refresh(disc)
    return disc


@pytest.fixture
def sample_course(db, sample_discipline):
    """Create a sample course linked to a discipline."""
    import uuid
    course = Course(
        id=str(uuid.uuid4()),
        discipline_id=sample_discipline.id,
        title="Calculus I",
        status="published",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course
