import os
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
import uuid as _uuid
from datetime import datetime, timezone

# ============================================
# DATABASE URL RESOLUTION
# Priority: DATABASE_URL > SUPABASE_URL+PASSWORD > SQLite fallback
# ============================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Construct from Supabase components
    supabase_url = os.getenv("SUPABASE_URL", "")  # e.g. https://abcdef.supabase.co
    supabase_db_password = os.getenv("SUPABASE_DB_PASSWORD", "")
    if supabase_url and supabase_db_password:
        # Extract project ref from https://abcdef.supabase.co
        ref = supabase_url.replace("https://", "").split(".")[0]
        DATABASE_URL = (
            f"postgresql://postgres.{ref}:{supabase_db_password}"
            f"@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
        )
        print(f"✓ DATABASE_URL constructed from SUPABASE_URL (ref={ref})")

if not DATABASE_URL:
    print("⚠ DATABASE_URL not set — running without database (SQLite fallback or in-memory)")

engine = None
SessionLocal = None
_using_sqlite = False

if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print(f"✓ Database: PostgreSQL (pool_pre_ping=True)")
elif os.getenv("USE_SQLITE", "").lower() in ("1", "true", "yes"):
    # Local SQLite for testing
    _db_path = os.path.join(os.path.dirname(__file__), "local_test.db")
    engine = create_engine(f"sqlite:///{_db_path}", echo=False)
    _using_sqlite = True

    @event.listens_for(engine, "connect")
    def _register_compat_functions(dbapi_conn, connection_record):
        """Emulate PostgreSQL functions for SQLite compatibility."""
        dbapi_conn.create_function(
            "now", 0,
            lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )
        dbapi_conn.create_function("gen_random_uuid", 0, lambda: str(_uuid.uuid4()))
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("✓ Database: SQLite (local dev)")


def init_sqlite_db():
    """Create tables and seed demo data for local SQLite testing."""
    if not _using_sqlite or engine is None:
        return
    from models.base import Base
    # Import all models so tables are registered
    from models import (  # noqa: F401
        User, Discipline, DisciplineTeacher, DisciplineStudent,
        Course, Chapter, Content, Question,
        ChatSession, ChatMessage,
        SystemSettings as SystemSettingsModel, SystemLog, SystemBackup,
        UserActivity, UserStats, UserAchievement, Certificate,
        CourseProgress, Notification, TokenUsage,
        MoodleRating, IntegrationLog, ExternalMapping,
        SessionReview,
    )
    Base.metadata.create_all(bind=engine)

    # Seed demo data if empty
    import bcrypt
    def _hash_pw(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    session = SessionLocal()
    try:
        if session.query(User).count() == 0:
            # Users (required for login)
            admin = User(
                id=str(_uuid.uuid4()), name="Admin Demo", email="admin@harven.ai",
                password_hash=_hash_pw("admin123"), role="ADMIN", ra="ADM001",
            )
            instructor = User(
                id=str(_uuid.uuid4()), name="Professor Demo", email="prof@harven.ai",
                password_hash=_hash_pw("prof123"), role="INSTRUCTOR", ra="PROF001",
            )
            student = User(
                id=str(_uuid.uuid4()), name="Aluno Demo", email="aluno@harven.ai",
                password_hash=_hash_pw("aluno123"), role="STUDENT", ra="ALU001",
            )
            session.add_all([admin, instructor, student])
            session.flush()

            # System settings
            session.add(SystemSettingsModel(
                id=str(_uuid.uuid4()), platform_name="Harven.ai Demo",
            ))

            # Achievements
            achievements = [
                {"achievement_id": "first_login", "title": "Primeiro Acesso", "description": "Realizou o primeiro login na plataforma", "icon": "login", "category": "onboarding", "points": 10, "rarity": "common"},
                {"achievement_id": "first_course", "title": "Explorador", "description": "Acessou seu primeiro curso", "icon": "explore", "category": "learning", "points": 25, "rarity": "common"},
                {"achievement_id": "first_quiz", "title": "Desafiante", "description": "Completou seu primeiro quiz", "icon": "quiz", "category": "learning", "points": 30, "rarity": "common"},
                {"achievement_id": "perfect_score", "title": "Nota Máxima", "description": "Obteve 100% em um quiz", "icon": "star", "category": "excellence", "points": 100, "rarity": "rare"},
                {"achievement_id": "streak_3", "title": "Consistente", "description": "Estudou 3 dias seguidos", "icon": "local_fire_department", "category": "dedication", "points": 50, "rarity": "uncommon"},
                {"achievement_id": "streak_7", "title": "Dedicado", "description": "Estudou 7 dias seguidos", "icon": "whatshot", "category": "dedication", "points": 100, "rarity": "rare"},
                {"achievement_id": "streak_30", "title": "Imparável", "description": "Estudou 30 dias seguidos", "icon": "bolt", "category": "dedication", "points": 500, "rarity": "legendary"},
                {"achievement_id": "5_courses", "title": "Estudioso", "description": "Completou 5 cursos", "icon": "school", "category": "learning", "points": 200, "rarity": "rare"},
                {"achievement_id": "10_hours", "title": "Maratonista", "description": "Acumulou 10 horas de estudo", "icon": "timer", "category": "dedication", "points": 150, "rarity": "uncommon"},
                {"achievement_id": "first_certificate", "title": "Certificado", "description": "Obteve seu primeiro certificado", "icon": "workspace_premium", "category": "milestone", "points": 200, "rarity": "rare"},
                {"achievement_id": "ai_chat_10", "title": "Curioso", "description": "Fez 10 perguntas ao tutor IA", "icon": "smart_toy", "category": "engagement", "points": 50, "rarity": "uncommon"},
                {"achievement_id": "ai_chat_50", "title": "Pensador", "description": "Fez 50 perguntas ao tutor IA", "icon": "psychology", "category": "engagement", "points": 150, "rarity": "rare"},
            ]
            for ach in achievements:
                session.add(UserAchievement(
                    id=str(_uuid.uuid4()), user_id=student.id, **ach,
                ))

            # Student stats
            session.add(UserStats(
                id=str(_uuid.uuid4()), user_id=student.id,
                courses_completed=0, courses_in_progress=0,
                hours_studied=0, average_score=0,
                certificates=0, total_activities=0, streak_days=0,
            ))

            session.commit()
            print("[SQLite] Demo data seeded: 3 users + 12 achievements")
        else:
            print("[SQLite] Database already has data, skipping seed")
    except Exception as e:
        session.rollback()
        print(f"[SQLite] Seed error: {e}")
    finally:
        session.close()


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not configured. Set DATABASE_URL or USE_SQLITE=true.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
