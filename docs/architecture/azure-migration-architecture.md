# Arquitetura de Migração: Harven.AI → Azure

> **Status:** Draft v1.0
> **Data:** 2026-02-27
> **Autor:** Aria (Architect Agent)
> **Base:** Project Brief do Atlas + análise profunda do codebase

---

## 1. Visão Geral do Sistema

### 1.1 Arquitetura Alvo

```
                        ┌─────────────────────────────────────────────┐
                        │              GitHub Repository              │
                        │  (harven-ai-app monorepo)                   │
                        └──────────┬──────────────┬───────────────────┘
                                   │              │
                          push backend/**    push frontend/**
                                   │              │
                        ┌──────────▼──────────────▼───────────────────┐
                        │           GitHub Actions CI/CD              │
                        │  ┌──────────────┐  ┌──────────────────┐    │
                        │  │ deploy-      │  │ deploy-          │    │
                        │  │ backend.yml  │  │ frontend.yml     │    │
                        │  └──────┬───────┘  └────────┬─────────┘    │
                        └─────────┼───────────────────┼──────────────┘
                                  │                   │
                        ┌─────────▼───────────────────▼──────────────┐
                        │     Azure Container Registry (ACR)         │
                        │  harvenacr.azurecr.io                      │
                        │  ┌─────────────────┐ ┌───────────────────┐ │
                        │  │ harven-backend   │ │ harven-frontend   │ │
                        │  │ :git-sha         │ │ :git-sha          │ │
                        │  └─────────────────┘ └───────────────────┘ │
                        └─────────┬───────────────────┬──────────────┘
                                  │ pull (Managed ID) │
                        ┌─────────▼───────────────────▼──────────────┐
                        │   Azure Container Apps Environment         │
                        │                                            │
                        │  ┌─────────────────┐ ┌───────────────────┐ │
                        │  │ harven-backend   │ │ harven-frontend   │ │
                        │  │ (FastAPI)        │ │ (React/Nginx)     │ │
                        │  │ Port 8000        │ │ Port 80           │ │
                        │  │ Ingress:external │ │ Ingress:external  │ │
                        │  │ 0.5vCPU / 1Gi   │ │ 0.25vCPU / 0.5Gi │ │
                        │  │ Replicas: 1-3    │ │ Replicas: 1-2     │ │
                        │  └──┬──────────┬───┘ └───────────────────┘ │
                        │     │          │                           │
                        └─────┼──────────┼───────────────────────────┘
                              │          │
                 ┌────────────▼──┐  ┌────▼─────────────────┐
                 │  Azure SQL    │  │  Azure Blob Storage  │
                 │  Database     │  │  harvenstorage       │
                 │  (SQL Server) │  │  ┌─────────────────┐ │
                 │  harven-db    │  │  │ courses          │ │
                 │  S0 tier      │  │  │ avatars          │ │
                 └───────────────┘  │  │ backups          │ │
                                    │  └─────────────────┘ │
                                    └──────────────────────┘
```

### 1.2 Princípios de Design

1. **Mínima mudança no frontend** — O frontend já usa API-mediated architecture; cleanup é cosmético
2. **Repository pattern no backend** — Isolar toda a lógica de acesso a dados do `main.py`
3. **SQLAlchemy como abstração** — ORM que suporta SQL Server nativamente via `mssql+pyodbc`
4. **Mesmos containers, novo orquestrador** — Dockerfiles existentes são reaproveitados com ajustes mínimos
5. **Zero dados a migrar** — Supabase era prototipagem; schema recriado limpo no Azure SQL

---

## 2. Arquitetura do Backend

### 2.1 Estrutura de Diretórios (Pós-Migração)

```
backend/
├── main.py                    # FastAPI routes (refatorado — sem supabase imports)
├── database.py                # NOVO: SQLAlchemy engine + session factory
├── models/                    # NOVO: SQLAlchemy ORM models
│   ├── __init__.py
│   ├── base.py                # Base declarativa + mixins comuns
│   ├── user.py                # User model
│   ├── discipline.py          # Discipline, DisciplineTeacher, DisciplineStudent
│   ├── course.py              # Course model
│   ├── chapter.py             # Chapter model
│   ├── content.py             # Content model
│   ├── question.py            # Question model
│   ├── chat.py                # ChatSession, ChatMessage
│   ├── admin.py               # SystemSettings, SystemLogs, SystemBackups
│   ├── gamification.py        # UserActivities, UserStats, UserAchievements, Certificates
│   ├── notification.py        # Notification model
│   └── progress.py            # CourseProgress model
├── repositories/              # NOVO: Data access layer
│   ├── __init__.py
│   ├── base.py                # BaseRepository (CRUD genérico)
│   ├── user_repo.py           # UserRepository
│   ├── discipline_repo.py     # DisciplineRepository
│   ├── course_repo.py         # CourseRepository
│   ├── chapter_repo.py        # ChapterRepository
│   ├── content_repo.py        # ContentRepository
│   ├── question_repo.py       # QuestionRepository
│   ├── chat_repo.py           # ChatRepository
│   ├── admin_repo.py          # AdminRepository (settings, logs, backups)
│   ├── gamification_repo.py   # GamificationRepository
│   └── notification_repo.py   # NotificationRepository
├── storage.py                 # NOVO: Azure Blob Storage wrapper
├── services/
│   ├── ai_service.py          # SEM MUDANÇA
│   ├── integration_service.py # Ajustar: receber repo ao invés de supabase client
│   └── mocks/
├── agents/                    # SEM MUDANÇA (6 agentes AI)
│   ├── harven_creator.py
│   ├── harven_socrates.py
│   ├── harven_analyst.py
│   ├── harven_editor.py
│   ├── harven_tester.py
│   └── harven_organizer.py
├── requirements.txt           # Atualizado
├── Dockerfile                 # Atualizado (ODBC driver)
└── .env.example               # Atualizado (Azure connection strings)
```

### 2.2 Camada de Banco de Dados (`database.py`)

```python
"""
Azure SQL Database connection via SQLAlchemy.
Connection string: mssql+pyodbc://user:pass@server/db?driver=ODBC+Driver+18+for+SQL+Server
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os

DATABASE_URL = os.getenv("DATABASE_URL")
# Formato: mssql+pyodbc://user:password@server.database.windows.net/harven-db
#          ?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Reciclar conexões a cada 30 min (Azure recomendação)
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """FastAPI dependency para injeção de sessão."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.3 Base Model (`models/base.py`)

```python
"""
Base declarativa com mixins comuns para todos os models.
Mapeamento PostgreSQL → SQL Server aplicado aqui.
"""
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase
import uuid

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    """Mixin para created_at e updated_at automáticos."""
    created_at = Column(
        DateTime,
        server_default=func.getutcdate(),  # T-SQL: GETUTCDATE()
        nullable=False
    )
    updated_at = Column(
        DateTime,
        server_default=func.getutcdate(),
        onupdate=func.getutcdate(),
        nullable=True
    )

class UUIDPrimaryKeyMixin:
    """Mixin para UUID como PK (NEWID() no SQL Server)."""
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        server_default=func.newid()  # T-SQL: NEWID()
    )
```

### 2.4 Exemplo de Model (`models/user.py`)

```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    ra = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)  # STUDENT, INSTRUCTOR, ADMIN
    avatar_url = Column(String(500), nullable=True)
    title = Column(String(255), nullable=True)
    bio = Column(String(2000), nullable=True)
    password_hash = Column(String(255), nullable=True)

    # Relationships
    taught_disciplines = relationship("DisciplineTeacher", back_populates="teacher")
    enrolled_disciplines = relationship("DisciplineStudent", back_populates="student")
    activities = relationship("UserActivity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
```

### 2.5 Base Repository (`repositories/base.py`)

```python
"""
Repository genérico que substitui o padrão supabase.table().select/insert/update/delete.
Cada repository herda e customiza conforme necessidade.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import Type, TypeVar, Optional, List, Dict, Any

T = TypeVar("T")

class BaseRepository:
    def __init__(self, db: Session, model: Type[T]):
        self.db = db
        self.model = model

    def get_by_id(self, id: str) -> Optional[T]:
        return self.db.get(self.model, id)

    def get_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        desc: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> tuple[List[T], int]:
        """
        Substitui: supabase.table(x).select("*", count="exact").range().order().execute()
        Retorna: (rows, total_count)
        """
        query = select(self.model)

        # Filtros (.eq() equivalente)
        if filters:
            for key, value in filters.items():
                query = query.where(getattr(self.model, key) == value)

        # Count total (count="exact" equivalente)
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0

        # Ordenação (.order() equivalente)
        if order_by:
            col = getattr(self.model, order_by)
            query = query.order_by(col.desc() if desc else col.asc())

        # Paginação (.range() equivalente)
        # Supabase: .range(offset, offset + per_page - 1)
        # SQLAlchemy: .offset(offset).limit(per_page)
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)

        rows = self.db.execute(query).scalars().all()
        return rows, total

    def create(self, data: Dict[str, Any]) -> T:
        """Substitui: supabase.table(x).insert(data).execute()"""
        obj = self.model(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def create_many(self, data_list: List[Dict[str, Any]]) -> List[T]:
        """Substitui: supabase.table(x).insert(data_list).execute()"""
        objects = [self.model(**data) for data in data_list]
        self.db.add_all(objects)
        self.db.commit()
        for obj in objects:
            self.db.refresh(obj)
        return objects

    def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        """Substitui: supabase.table(x).update(data).eq("id", id).execute()"""
        obj = self.get_by_id(id)
        if not obj:
            return None
        for key, value in data.items():
            setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: str) -> bool:
        """Substitui: supabase.table(x).delete().eq("id", id).execute()"""
        obj = self.get_by_id(id)
        if not obj:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True

    def delete_where(self, filters: Dict[str, Any]) -> int:
        """Substitui: supabase.table(x).delete().eq(k1,v1).eq(k2,v2).execute()"""
        query = select(self.model)
        for key, value in filters.items():
            query = query.where(getattr(self.model, key) == value)
        objects = self.db.execute(query).scalars().all()
        count = len(objects)
        for obj in objects:
            self.db.delete(obj)
        self.db.commit()
        return count

    def upsert(self, data: Dict[str, Any], conflict_columns: List[str]) -> T:
        """
        Substitui: supabase.table(x).upsert(data).execute()
        No SQL Server: MERGE via SQLAlchemy
        """
        filters = {col: data[col] for col in conflict_columns if col in data}
        query = select(self.model)
        for key, value in filters.items():
            query = query.where(getattr(self.model, key) == value)
        existing = self.db.execute(query).scalar_one_or_none()

        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            return self.create(data)
```

### 2.6 Azure Blob Storage (`storage.py`)

```python
"""
Azure Blob Storage wrapper.
Substitui todas as chamadas supabase.storage.from_(bucket).upload/get_public_url/remove.
"""
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone
import os
import uuid

class AzureBlobStorage:
    def __init__(self):
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "harvenstorage")

        if connection_string:
            self.client = BlobServiceClient.from_connection_string(connection_string)
        else:
            # Managed Identity (produção)
            credential = DefaultAzureCredential()
            self.client = BlobServiceClient(
                account_url=f"https://{self.account_name}.blob.core.windows.net",
                credential=credential
            )

        self.account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")

    def upload(
        self,
        container: str,
        file_path: str,
        content: bytes,
        content_type: str = "application/octet-stream",
        upsert: bool = True,
    ) -> str:
        """
        Substitui: supabase.storage.from_(bucket).upload(path, content, {"upsert": "true", "content-type": ct})
        Retorna: URL pública do blob.
        """
        blob_client = self.client.get_blob_client(container=container, blob=file_path)
        blob_client.upload_blob(
            content,
            overwrite=upsert,
            content_settings=ContentSettings(content_type=content_type),
        )
        return self.get_public_url(container, file_path)

    def get_public_url(self, container: str, file_path: str) -> str:
        """
        Substitui: supabase.storage.from_(bucket).get_public_url(file_path)
        Para containers públicos, URL direta. Para privados, SAS token.
        """
        return f"https://{self.account_name}.blob.core.windows.net/{container}/{file_path}"

    def create_signed_url(self, container: str, file_path: str, expires_in: int = 3600) -> str:
        """
        Substitui: supabase.storage.from_(bucket).create_signed_url(path, 3600)
        Gera SAS token temporário para download privado.
        """
        sas_token = generate_blob_sas(
            account_name=self.account_name,
            container_name=container,
            blob_name=file_path,
            account_key=self.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        return f"https://{self.account_name}.blob.core.windows.net/{container}/{file_path}?{sas_token}"

    def remove(self, container: str, file_paths: list[str]) -> None:
        """
        Substitui: supabase.storage.from_(bucket).remove([file_path])
        """
        for file_path in file_paths:
            blob_client = self.client.get_blob_client(container=container, blob=file_path)
            blob_client.delete_blob(delete_snapshots="include")

    def upload_with_fallback(
        self,
        containers: list[str],
        file_path: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str]:
        """
        Substitui o padrão de fallback entre buckets do Supabase.
        Tenta containers em ordem, retorna (url, container_usado).
        """
        for container in containers:
            try:
                url = self.upload(container, file_path, content, content_type)
                return url, container
            except Exception:
                continue
        raise Exception(f"Upload failed in all containers: {containers}")


# Singleton
blob_storage = AzureBlobStorage()
```

### 2.7 Refactor do `main.py` — Padrão de Migração

O `main.py` atual tem 168 operações Supabase. O padrão de refactor é mecânico:

**ANTES (Supabase):**
```python
@app.get("/courses")
async def get_courses(request: Request):
    if not supabase:
        raise HTTPException(status_code=503, detail="DB Disconnected")
    try:
        response = supabase.table("courses") \
            .select("*", count="exact") \
            .eq("discipline_id", discipline_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + per_page - 1) \
            .execute()
        return {"data": response.data, "total": response.count}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno")
```

**DEPOIS (SQLAlchemy + Repository):**
```python
@app.get("/courses")
async def get_courses(request: Request, db: Session = Depends(get_db)):
    try:
        repo = CourseRepository(db)
        courses, total = repo.get_all(
            filters={"discipline_id": discipline_id},
            order_by="created_at",
            desc=True,
            offset=offset,
            limit=per_page,
        )
        return {"data": [c.to_dict() for c in courses], "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno")
```

**Padrão de migração para Storage:**

```python
# ANTES
supabase.storage.from_("avatars").upload(file_path, content, {"upsert": "true", "content-type": ct})
public_url = supabase.storage.from_("avatars").get_public_url(file_path)

# DEPOIS
from storage import blob_storage
public_url = blob_storage.upload("avatars", file_path, content, content_type=ct)
```

### 2.8 Mapeamento Supabase Query → Repository Method

| Supabase Pattern | Repository Equivalent | Contagem |
|---|---|---|
| `.select("*", count="exact").range()` | `repo.get_all(offset=, limit=)` | 28 |
| `.select("*").eq("id", x).single()` | `repo.get_by_id(x)` | 19 |
| `.select("*").eq(k, v)` | `repo.get_all(filters={k: v})` | 57 |
| `.insert(data)` | `repo.create(data)` | 29 |
| `.insert(data_list)` | `repo.create_many(data_list)` | 5 |
| `.update(data).eq("id", x)` | `repo.update(x, data)` | 25 |
| `.delete().eq("id", x)` | `repo.delete(x)` | 12 |
| `.delete().eq(k1,v1).eq(k2,v2)` | `repo.delete_where({k1:v1, k2:v2})` | 7 |
| `.upsert(data)` | `repo.upsert(data, conflict_cols)` | 1 |
| `.rpc("increment_message_count")` | `repo.increment_message_count(id)` | 1 |
| `.ilike("col", term)` | `repo.search(col, term)` (custom) | 5 |
| Relationship joins `users!teacher_id()` | SQLAlchemy `joinedload()` | 8 |

### 2.9 Queries com Relationship Joins

O Supabase usa notação especial para joins: `select("*, users!teacher_id(id, name)")`. No SQLAlchemy isso vira eager loading:

```python
# ANTES (Supabase)
response = supabase.table("discipline_teachers") \
    .select("*, users!teacher_id(id, name, email, role, avatar_url, ra, title)", count="exact") \
    .eq("discipline_id", discipline_id) \
    .execute()

# DEPOIS (SQLAlchemy)
from sqlalchemy.orm import joinedload

class DisciplineRepository(BaseRepository):
    def get_teachers(self, discipline_id: str) -> tuple[list, int]:
        query = (
            select(DisciplineTeacher)
            .options(joinedload(DisciplineTeacher.teacher))
            .where(DisciplineTeacher.discipline_id == discipline_id)
        )
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        results = self.db.execute(query).scalars().unique().all()
        return results, total
```

---

## 3. Schema Azure SQL (T-SQL)

### 3.1 Mapeamento de Tipos

| Coluna/Padrão | PostgreSQL (Supabase) | Azure SQL (T-SQL) |
|---|---|---|
| Primary Key | `UUID DEFAULT gen_random_uuid()` | `NVARCHAR(36) DEFAULT NEWID()` |
| Auto-increment | `SERIAL` | `INT IDENTITY(1,1)` |
| Boolean | `BOOLEAN DEFAULT false` | `BIT DEFAULT 0` |
| Text | `TEXT` | `NVARCHAR(MAX)` |
| Short text | `VARCHAR(255)` | `NVARCHAR(255)` |
| Timestamp | `TIMESTAMPTZ DEFAULT NOW()` | `DATETIME2 DEFAULT GETUTCDATE()` |
| JSON | `JSONB` | `NVARCHAR(MAX)` (com JSON functions) |
| Integer | `INTEGER` | `INT` |
| Float | `REAL` | `FLOAT` |

### 3.2 DDL Completo — `sql/schema.sql`

```sql
-- ============================================
-- HARVEN.AI - Azure SQL Database Schema
-- Migrado de PostgreSQL/Supabase para T-SQL
-- ============================================

-- USERS
CREATE TABLE users (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ra NVARCHAR(50) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NULL,
    role NVARCHAR(20) NOT NULL,  -- STUDENT, INSTRUCTOR, ADMIN
    avatar_url NVARCHAR(500) NULL,
    title NVARCHAR(255) NULL,
    bio NVARCHAR(2000) NULL,
    password_hash NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT uq_users_ra UNIQUE (ra)
);

-- DISCIPLINES
CREATE TABLE disciplines (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL
);

-- DISCIPLINE ↔ TEACHER (Junction)
CREATE TABLE discipline_teachers (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    discipline_id NVARCHAR(36) NOT NULL,
    teacher_id NVARCHAR(36) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_dt_discipline FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE,
    CONSTRAINT fk_dt_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_discipline_teacher UNIQUE (discipline_id, teacher_id)
);

-- DISCIPLINE ↔ STUDENT (Junction)
CREATE TABLE discipline_students (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    discipline_id NVARCHAR(36) NOT NULL,
    student_id NVARCHAR(36) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_ds_discipline FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_discipline_student UNIQUE (discipline_id, student_id)
);

-- COURSES
CREATE TABLE courses (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    discipline_id NVARCHAR(36) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_courses_discipline FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE
);

-- CHAPTERS
CREATE TABLE chapters (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    course_id NVARCHAR(36) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    [order] INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_chapters_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- CONTENTS
CREATE TABLE contents (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    chapter_id NVARCHAR(36) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    type NVARCHAR(50) NOT NULL,  -- pdf, video, text, etc.
    file_url NVARCHAR(500) NULL,
    text_content NVARCHAR(MAX) NULL,
    text_url NVARCHAR(500) NULL,
    audio_url NVARCHAR(500) NULL,
    duration INT NULL,
    [order] INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_contents_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- QUESTIONS
CREATE TABLE questions (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    content_id NVARCHAR(36) NOT NULL,
    question NVARCHAR(MAX) NOT NULL,
    answer NVARCHAR(MAX) NULL,
    difficulty NVARCHAR(20) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    metadata NVARCHAR(MAX) NULL,  -- JSON
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_questions_content FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- CHAT SESSIONS
CREATE TABLE chat_sessions (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    content_id NVARCHAR(36) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    total_messages INT NOT NULL DEFAULT 0,
    performance_score FLOAT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_cs_content FOREIGN KEY (content_id) REFERENCES contents(id)
);

-- CHAT MESSAGES
CREATE TABLE chat_messages (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    session_id NVARCHAR(36) NOT NULL,
    role NVARCHAR(20) NOT NULL,  -- user, assistant, system
    content NVARCHAR(MAX) NOT NULL,
    agent_type NVARCHAR(50) NULL,
    metadata NVARCHAR(MAX) NULL,  -- JSON
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- SYSTEM SETTINGS (Singleton)
CREATE TABLE system_settings (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    logo_url NVARCHAR(500) NULL,
    login_logo_url NVARCHAR(500) NULL,
    login_bg_url NVARCHAR(500) NULL,
    platform_name NVARCHAR(255) NULL,
    primary_color NVARCHAR(20) NULL,
    ai_daily_token_limit INT NOT NULL DEFAULT 500000,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NULL
);

-- SYSTEM LOGS
CREATE TABLE system_logs (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    msg NVARCHAR(MAX) NOT NULL,
    author NVARCHAR(255) NULL,
    status NVARCHAR(50) NULL,
    type NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- SYSTEM BACKUPS
CREATE TABLE system_backups (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    size_mb FLOAT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'completed',
    records NVARCHAR(MAX) NULL,  -- JSON
    storage_path NVARCHAR(500) NULL,
    type NVARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- USER ACTIVITIES (Gamification)
CREATE TABLE user_activities (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    action NVARCHAR(100) NOT NULL,
    target_id NVARCHAR(36) NULL,
    metadata NVARCHAR(MAX) NULL,  -- JSON
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- USER STATS
CREATE TABLE user_stats (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL UNIQUE,
    total_points INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    courses_completed INT NOT NULL DEFAULT 0,
    contents_completed INT NOT NULL DEFAULT 0,
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- USER ACHIEVEMENTS
CREATE TABLE user_achievements (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    achievement_type NVARCHAR(100) NOT NULL,
    metadata NVARCHAR(MAX) NULL,  -- JSON
    earned_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_uach_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CERTIFICATES
CREATE TABLE certificates (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    course_id NVARCHAR(36) NOT NULL,
    issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- COURSE PROGRESS
CREATE TABLE course_progress (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    course_id NVARCHAR(36) NOT NULL,
    completion_percentage FLOAT NOT NULL DEFAULT 0,
    last_accessed DATETIME2 NULL,
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_cp_course FOREIGN KEY (course_id) REFERENCES courses(id),
    CONSTRAINT uq_user_course_progress UNIQUE (user_id, course_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    [read] BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- TOKEN USAGE (Tracking AI costs)
CREATE TABLE token_usage (
    id NVARCHAR(36) NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    usage_date DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT fk_tu_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_user_usage_date UNIQUE (user_id, usage_date)
);

-- ==========================================
-- INDEXES (Performance)
-- ==========================================

-- Auth
CREATE INDEX idx_users_ra ON users(ra);
CREATE INDEX idx_users_role ON users(role);

-- Content hierarchy
CREATE INDEX idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_chapters_order ON chapters(course_id, [order]);
CREATE INDEX idx_contents_chapter_id ON contents(chapter_id);
CREATE INDEX idx_contents_order ON contents(chapter_id, [order]);
CREATE INDEX idx_questions_content_id ON questions(content_id);
CREATE INDEX idx_questions_status ON questions(content_id, status);

-- Junction tables
CREATE INDEX idx_dt_teacher ON discipline_teachers(teacher_id);
CREATE INDEX idx_dt_discipline ON discipline_teachers(discipline_id);
CREATE INDEX idx_ds_student ON discipline_students(student_id);
CREATE INDEX idx_ds_discipline ON discipline_students(discipline_id);

-- Chat
CREATE INDEX idx_cs_user_content ON chat_sessions(user_id, content_id);
CREATE INDEX idx_cm_session ON chat_messages(session_id);

-- Admin
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX idx_user_activities_user ON user_activities(user_id, action);

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, [read]);

-- Token usage
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, usage_date);

-- ==========================================
-- STORED PROCEDURE (RPC replacement)
-- ==========================================

-- Substitui: supabase.rpc("increment_message_count", {"p_session_id": id})
CREATE PROCEDURE sp_increment_message_count
    @session_id NVARCHAR(36)
AS
BEGIN
    UPDATE chat_sessions
    SET total_messages = ISNULL(total_messages, 0) + 1
    WHERE id = @session_id;
END;
GO
```

### 3.3 Seed Data — `sql/seed.sql`

```sql
-- Admin user padrão
INSERT INTO users (id, ra, name, email, role, password_hash)
VALUES (
    NEWID(),
    'admin',
    'Administrador',
    'admin@harven.ai',
    'ADMIN',
    -- Hash de senha padrão (trocar em produção)
    '$2b$12$LJ3m4ys5xGfK.dQ8kGz8/.xH8w8zRqV4z2B0N.H0r8Q9xQ0mG6Ky'
);

-- Settings iniciais
INSERT INTO system_settings (id, platform_name, ai_daily_token_limit)
VALUES (NEWID(), 'Harven.AI', 500000);
```

---

## 4. Dockerfile Backend (Atualizado com ODBC Driver)

```dockerfile
FROM python:3.11-slim

LABEL maintainer="Harven.AI Team"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Instalar ODBC Driver 18 para SQL Server + dependências
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    gnupg2 \
    unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 5. Requirements.txt (Atualizado)

```
# ============================================
# HARVEN.AI - BACKEND DEPENDENCIES
# ============================================

# Core Framework
fastapi>=0.110.0
uvicorn[standard]>=0.27.0

# Database (Azure SQL via SQLAlchemy)
sqlalchemy>=2.0.0
pyodbc>=5.0.0

# Azure Storage
azure-storage-blob>=12.19.0
azure-identity>=1.15.0

# Environment & Configuration
python-dotenv>=1.0.1
pydantic>=2.6.0
pydantic-settings>=2.2.1

# File Upload
python-multipart>=0.0.9

# PDF Text Extraction
pdfplumber>=0.10.0

# AI & OpenAI
openai>=1.12.0

# Text-to-Speech (ElevenLabs)
elevenlabs>=1.0.0

# Security
bcrypt>=4.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Rate Limiting
slowapi>=0.1.9

# HTTP Client
httpx>=0.26.0

# Utilities
python-dateutil>=2.8.2

# System Monitoring
psutil>=5.9.0
```

**Removido:** `supabase>=2.3.0`
**Adicionado:** `sqlalchemy>=2.0.0`, `pyodbc>=5.0.0`, `azure-storage-blob>=12.19.0`, `azure-identity>=1.15.0`

---

## 6. Environment Variables (Pós-Migração)

```bash
# ============================================
# HARVEN.AI - AZURE ENVIRONMENT
# ============================================

# --- Azure SQL Database ---
DATABASE_URL=mssql+pyodbc://harvenadmin:PASSWORD@harven-sql-server.database.windows.net/harven-db?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no

# --- Azure Blob Storage ---
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=harvenstorage;AccountKey=KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=harvenstorage
AZURE_STORAGE_ACCOUNT_KEY=KEY

# --- Security (sem mudança) ---
JWT_SECRET_KEY=ae99d9a9236c87abdc1d069aa34346167806619cdc9f577c9e293c88b2944d6e
JWT_EXPIRATION_HOURS=8

# --- AI (sem mudança) ---
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# --- Optional (sem mudança) ---
ELEVENLABS_API_KEY=sk_...
ENVIRONMENT=production
FRONTEND_URL=https://harven-frontend.REGION.azurecontainerapps.io
PORT=8000
```

**Removido:** `SUPABASE_URL`, `SUPABASE_KEY`
**Adicionado:** `DATABASE_URL`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`

---

## 7. Frontend — Mudanças

### 7.1 Impacto Mínimo

O frontend **não usa o Supabase JS client** para nenhuma operação de dados. Todas as chamadas vão via `services/api.ts` → backend. As mudanças são:

### 7.2 Arquivos a Alterar

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `lib/supabase.ts` | **Deletar** | Artifact não utilizado |
| `package.json` | **Remover** `@supabase/supabase-js` | Dependência não utilizada |
| `.env.example` | **Remover** `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` | Vars não utilizadas |
| `contexts/SettingsContext.tsx` | **Atualizar** 3 URLs hardcoded | Trocar default Supabase URLs por placeholders ou strings vazias |
| `Dockerfile` | **Sem mudança** | Apenas `VITE_API_URL` é usado no build |
| `nginx.conf` | **Sem mudança** | Serve SPA, não proxeia para Supabase |

### 7.3 SettingsContext.tsx — Correção

```typescript
// ANTES (3 URLs Supabase hardcoded como fallback)
logo_url: 'https://kllkgrkjmxqdlsrhyrun.supabase.co/storage/v1/object/public/courses/system/logo_xxx.png',

// DEPOIS (sem default ou placeholder)
logo_url: '',
login_logo_url: '',
login_bg_url: '',
```

---

## 8. CI/CD — GitHub Actions

### 8.1 Workflow: Deploy Backend

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to Azure Container Apps

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v2
        with:
          appSourcePath: ${{ github.workspace }}/backend
          acrName: harvenacr
          containerAppName: harven-backend
          resourceGroup: harven-ai-rg
          imageToBuild: harvenacr.azurecr.io/harven-backend:${{ github.sha }}
```

### 8.2 Workflow: Deploy Frontend

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to Azure Container Apps

on:
  push:
    branches: [main]
    paths:
      - 'harven.ai-platform-mockup/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v2
        with:
          appSourcePath: ${{ github.workspace }}/harven.ai-platform-mockup
          acrName: harvenacr
          containerAppName: harven-frontend
          resourceGroup: harven-ai-rg
          imageToBuild: harvenacr.azurecr.io/harven-frontend:${{ github.sha }}
          buildArguments: VITE_API_URL=${{ secrets.BACKEND_URL }}
```

### 8.3 GitHub Secrets Necessários

| Secret | Valor | Descrição |
|--------|-------|-----------|
| `AZURE_CREDENTIALS` | JSON do Service Principal | Output de `az ad sp create-for-rbac` |
| `BACKEND_URL` | `https://harven-backend.REGION.azurecontainerapps.io` | URL do backend no Container Apps |

---

## 9. Provisionamento Azure — Script

```bash
#!/bin/bash
# infra/setup-azure.sh
# Provisiona todos os recursos Azure necessários

RESOURCE_GROUP="harven-ai-rg"
LOCATION="brazilsouth"
ACR_NAME="harvenacr"
SQL_SERVER="harven-sql-server"
SQL_DB="harven-db"
SQL_ADMIN="harvenadmin"
SQL_PASSWORD="<DEFINIR_SENHA_FORTE>"
STORAGE_ACCOUNT="harvenstorage"
CONTAINER_ENV="harven-env"

# 1. Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# 3. Azure SQL
az sql server create \
  --resource-group $RESOURCE_GROUP \
  --name $SQL_SERVER \
  --location $LOCATION \
  --admin-user $SQL_ADMIN \
  --admin-password $SQL_PASSWORD

az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name $SQL_DB \
  --service-objective S0

# Firewall: permitir serviços Azure
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 4. Blob Storage
az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS

az storage container create --account-name $STORAGE_ACCOUNT --name courses --public-access blob
az storage container create --account-name $STORAGE_ACCOUNT --name avatars --public-access blob
az storage container create --account-name $STORAGE_ACCOUNT --name backups --public-access off

# 5. Container Apps Environment
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_ENV \
  --location $LOCATION

# 6. Deploy Backend (primeira vez via az containerapp up)
az containerapp up \
  --name harven-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV \
  --source ./backend \
  --ingress external \
  --target-port 8000

# 7. Deploy Frontend
az containerapp up \
  --name harven-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV \
  --source ./harven.ai-platform-mockup \
  --ingress external \
  --target-port 80

# 8. Managed Identity + AcrPull
az containerapp identity assign --name harven-backend --resource-group $RESOURCE_GROUP --system-assigned
az containerapp identity assign --name harven-frontend --resource-group $RESOURCE_GROUP --system-assigned

ACR_ID=$(az acr show --name $ACR_NAME --query id --output tsv)
BACKEND_IDENTITY=$(az containerapp show --name harven-backend --resource-group $RESOURCE_GROUP --query identity.principalId --output tsv)
FRONTEND_IDENTITY=$(az containerapp show --name harven-frontend --resource-group $RESOURCE_GROUP --query identity.principalId --output tsv)

az role assignment create --assignee $BACKEND_IDENTITY --role AcrPull --scope $ACR_ID
az role assignment create --assignee $FRONTEND_IDENTITY --role AcrPull --scope $ACR_ID

az containerapp registry set --name harven-backend --resource-group $RESOURCE_GROUP --server ${ACR_NAME}.azurecr.io --identity system
az containerapp registry set --name harven-frontend --resource-group $RESOURCE_GROUP --server ${ACR_NAME}.azurecr.io --identity system

# 9. Service Principal para GitHub Actions
az ad sp create-for-rbac \
  --name harven-github-actions \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \
  --json-auth

echo "Copie o JSON acima e salve como GitHub Secret: AZURE_CREDENTIALS"
```

---

## 10. Ordem de Execução

```
FASE 1: Infra Azure                    @devops
├── Executar infra/setup-azure.sh
├── Executar sql/schema.sql no Azure SQL
├── Executar sql/seed.sql
├── Configurar GitHub Secrets
└── Validar: container apps rodando (imagens placeholder)

FASE 2: Backend Refactor               @dev
├── Criar database.py
├── Criar models/ (19 tabelas)
├── Criar repositories/ (11 repos)
├── Criar storage.py
├── Refatorar main.py (168 operações)
│   ├── Substituir import supabase → import repos
│   ├── Adicionar Depends(get_db) em todas as rotas
│   ├── Trocar supabase.table() → repo.method()
│   └── Trocar supabase.storage → blob_storage.method()
├── Atualizar requirements.txt
├── Atualizar Dockerfile (ODBC driver)
├── Atualizar .env.example
└── Remover setup_supabase.py

FASE 3: Frontend Cleanup               @dev
├── Deletar lib/supabase.ts
├── npm uninstall @supabase/supabase-js
├── Limpar SettingsContext.tsx (3 URLs)
├── Limpar .env.example
└── npm run build (validar que compila)

FASE 4: CI/CD                          @devops
├── Criar .github/workflows/deploy-backend.yml
├── Criar .github/workflows/deploy-frontend.yml
├── Push test → validar pipeline
└── Validar imagens no ACR + deploy nos Container Apps

FASE 5: Validação E2E                  @qa
├── Login (RA + senha)
├── CRUD disciplines (instructor)
├── CRUD courses/chapters/contents
├── Upload de arquivos (PDF, vídeo, avatar)
├── Chat socrático (AI agents)
├── Admin console (settings, logs, backups)
├── Gamification (activities, stats)
├── Notifications
└── Rate limiting + health checks
```

---

> *Este documento fornece a arquitetura completa para execução. O @dev pode começar pela Fase 2 (backend refactor) enquanto o @devops provisiona a infra (Fase 1) em paralelo.*

— Aria, arquitetando o futuro 🏗️
