# Story AZM-3.1: Criar Camada de Banco — Database Models

> **Epic:** Epic 3 — Backend Data Layer Refactor
> **Status:** Draft
> **Priority:** Critical
> **Estimated Points:** 5
> **Owner:** @dev (review: @architect)
> **Depends on:** AZM-2.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** criar a engine SQLAlchemy com connection pool para Azure SQL e os ORM models mapeando todas as 20 tabelas,
**so that** o backend tenha uma camada de dados tipada e relacional substituindo o supabase-py.

---

## Acceptance Criteria

1. [ ] `backend/database.py` criado com engine, SessionLocal e `get_db()` dependency
2. [ ] `backend/models/__init__.py` exportando todos os models
3. [ ] `backend/models/base.py` com Base, TimestampMixin, UUIDPrimaryKeyMixin
4. [ ] 14 arquivos de model criados cobrindo as 20 tabelas (agrupados por domínio)
5. [ ] Todos os relationships bidirecionais definidos (teacher↔discipline, user↔chat_sessions, etc.)
6. [ ] Models possuem método `to_dict()` para serialização em JSON
7. [ ] Conexão testada com Azure SQL Database

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar `backend/database.py` (AC: 1)
  - [ ] Import: `create_engine`, `sessionmaker`, `Session` do SQLAlchemy
  - [ ] `DATABASE_URL = os.getenv("DATABASE_URL")`
  - [ ] Engine com pool_size=5, max_overflow=10, pool_timeout=30, pool_recycle=1800
  - [ ] `SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)`
  - [ ] `get_db()` como generator function (yield db, finally db.close())
- [ ] Task 2: Criar `backend/models/base.py` (AC: 3)
  - [ ] `Base(DeclarativeBase)` — base declarativa
  - [ ] `TimestampMixin`: created_at (server_default=func.getutcdate()), updated_at (onupdate=func.getutcdate())
  - [ ] `UUIDPrimaryKeyMixin`: id Column(String(36), default=lambda: str(uuid.uuid4()), server_default=func.newid())
- [ ] Task 3: Criar `backend/models/user.py` (AC: 4, 5, 6)
  - [ ] Class User(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="users"
  - [ ] Columns: ra(String50 unique index), name(String255), email(String255 nullable), role(String20), avatar_url(String500 nullable), title(String255 nullable), bio(String2000 nullable), password_hash(String255 nullable)
  - [ ] Relationships: taught_disciplines, enrolled_disciplines, activities, notifications, chat_sessions
  - [ ] `to_dict()` method
- [ ] Task 4: Criar `backend/models/discipline.py` (AC: 4, 5, 6)
  - [ ] Class Discipline(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="disciplines"
  - [ ] Class DisciplineTeacher(Base, UUIDPrimaryKeyMixin), __tablename__="discipline_teachers"
    - FKs: discipline_id, teacher_id. UniqueConstraint("discipline_id", "teacher_id")
    - Relationships: teacher→User, discipline→Discipline (back_populates)
  - [ ] Class DisciplineStudent(Base, UUIDPrimaryKeyMixin), __tablename__="discipline_students"
    - FKs: discipline_id, student_id. UniqueConstraint("discipline_id", "student_id")
    - Relationships: student→User, discipline→Discipline (back_populates)
- [ ] Task 5: Criar `backend/models/course.py` (AC: 4, 5, 6)
  - [ ] Class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="courses"
  - [ ] Columns: discipline_id(FK CASCADE), title, description, image_url, status(default='draft')
  - [ ] Relationships: discipline, chapters
- [ ] Task 6: Criar `backend/models/chapter.py` (AC: 4, 5, 6)
  - [ ] Class Chapter(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="chapters"
  - [ ] Columns: course_id(FK CASCADE), title, description, order(Integer default=0)
  - [ ] Relationships: course, contents
- [ ] Task 7: Criar `backend/models/content.py` (AC: 4, 5, 6)
  - [ ] Class Content(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="contents"
  - [ ] Columns: chapter_id(FK CASCADE), title, type(String50), file_url, text_content, text_url, audio_url, duration(Integer), order
  - [ ] Relationships: chapter, questions, chat_sessions
- [ ] Task 8: Criar `backend/models/question.py` (AC: 4, 5, 6)
  - [ ] Class Question(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="questions"
  - [ ] Columns: content_id(FK CASCADE), question(NVARCHAR(MAX)), answer, difficulty, status(default='active'), metadata(NVARCHAR(MAX))
  - [ ] Relationships: content
- [ ] Task 9: Criar `backend/models/chat.py` (AC: 4, 5, 6)
  - [ ] Class ChatSession(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="chat_sessions"
  - [ ] Columns: user_id(FK), content_id(FK), status(default='active'), total_messages(Integer default=0), performance_score(Float)
  - [ ] Relationships: user, content, messages
  - [ ] Class ChatMessage(Base, UUIDPrimaryKeyMixin), __tablename__="chat_messages"
  - [ ] Columns: session_id(FK CASCADE), role, content(NVARCHAR(MAX)), agent_type, metadata(NVARCHAR(MAX)), created_at
  - [ ] Relationships: session
- [ ] Task 10: Criar `backend/models/admin.py` (AC: 4, 6)
  - [ ] Class SystemSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin), __tablename__="system_settings"
  - [ ] Class SystemLog(Base, UUIDPrimaryKeyMixin), __tablename__="system_logs"
  - [ ] Class SystemBackup(Base, UUIDPrimaryKeyMixin), __tablename__="system_backups"
- [ ] Task 11: Criar `backend/models/gamification.py` (AC: 4, 5, 6)
  - [ ] Class UserActivity(Base, UUIDPrimaryKeyMixin), __tablename__="user_activities"
  - [ ] Class UserStats(Base, UUIDPrimaryKeyMixin), __tablename__="user_stats" (user_id UNIQUE)
  - [ ] Class UserAchievement(Base, UUIDPrimaryKeyMixin), __tablename__="user_achievements"
  - [ ] Class Certificate(Base, UUIDPrimaryKeyMixin), __tablename__="certificates"
- [ ] Task 12: Criar `backend/models/progress.py` (AC: 4, 5, 6)
  - [ ] Class CourseProgress(Base, UUIDPrimaryKeyMixin), __tablename__="course_progress"
  - [ ] Columns: user_id(FK), course_id(FK), completion_percentage(Float default=0), last_accessed, updated_at
  - [ ] UniqueConstraint("user_id", "course_id")
- [ ] Task 13: Criar `backend/models/notification.py` (AC: 4, 5, 6)
  - [ ] Class Notification(Base, UUIDPrimaryKeyMixin), __tablename__="notifications"
  - [ ] Columns: user_id(FK), content(NVARCHAR(MAX)), read(Boolean default=False — mapeia para BIT), created_at
  - [ ] Relationships: user
- [ ] Task 14: Criar `backend/models/token_usage.py` (AC: 4, 6)
  - [ ] Class TokenUsage(Base, UUIDPrimaryKeyMixin), __tablename__="token_usage"
  - [ ] Columns: user_id(FK), tokens_used(Integer default=0), usage_date(Date default=func.cast(func.getutcdate(), Date))
  - [ ] UniqueConstraint("user_id", "usage_date")
  - [ ] Relationships: user
- [ ] Task 15: Criar `backend/models/__init__.py` (AC: 2)
  - [ ] Import e re-export de TODOS os models
- [ ] Task 16: Testar conexão (AC: 7)
  - [ ] Script de teste: importar engine, criar sessão, executar SELECT 1

---

## Dev Notes

**Arquivo de referência:** Architecture doc seções 2.2, 2.3, 2.4

**database.py — código completo:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL")
# Formato: mssql+pyodbc://user:password@server.database.windows.net/harven-db?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**base.py — código completo:**
```python
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase
import uuid

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at = Column(DateTime, server_default=func.getutcdate(), nullable=False)
    updated_at = Column(DateTime, server_default=func.getutcdate(), onupdate=func.getutcdate(), nullable=True)

class UUIDPrimaryKeyMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=func.newid())
```

**User model exemplo (da arquitetura):**
```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean
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

    taught_disciplines = relationship("DisciplineTeacher", back_populates="teacher")
    enrolled_disciplines = relationship("DisciplineStudent", back_populates="student")
    activities = relationship("UserActivity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
```

**Padrão `to_dict()`** — implementar em cada model:
```python
def to_dict(self):
    return {c.name: getattr(self, c.name) for c in self.__table__.columns}
```
Para DateTime, converter para ISO string. Para relationships, não incluir por padrão (lazy).

**Mapeamento de 14 arquivos → 20 tabelas:**
| Arquivo | Tabelas |
|---------|---------|
| user.py | users |
| discipline.py | disciplines, discipline_teachers, discipline_students |
| course.py | courses |
| chapter.py | chapters |
| content.py | contents |
| question.py | questions |
| chat.py | chat_sessions, chat_messages |
| admin.py | system_settings, system_logs, system_backups |
| gamification.py | user_activities, user_stats, user_achievements, certificates |
| progress.py | course_progress |
| notification.py | notifications |
| token_usage.py | token_usage |
| base.py | (mixins, sem tabela) |

**Nota:** O `token_usage.py` foi adicionado como arquivo separado (Task 14), totalizando 14 arquivos de model (13 com tabelas + base.py com mixins) cobrindo 20 tabelas.

### Testing

- Importar todos os models e verificar que não há erros de import circular
- `Base.metadata.sorted_tables` deve retornar 20 tabelas
- Testar `to_dict()` com dados mock
- Testar conexão real com Azure SQL via `engine.connect()`

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Fix header mapeamento (13→14 arquivos, 19→20 tabelas), nota stale | River (SM) |

---

## Dev Agent Record

### Agent Model Used
_To be filled by dev agent_

### Debug Log References
_To be filled by dev agent_

### Completion Notes List
_To be filled by dev agent_

### File List
_To be filled by dev agent_

---

## QA Results
_To be filled by QA agent_
