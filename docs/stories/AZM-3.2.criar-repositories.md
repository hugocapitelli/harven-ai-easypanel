# Story AZM-3.2: Criar Repositories

> **Epic:** Epic 3 — Backend Data Layer Refactor
> **Status:** Draft
> **Priority:** Critical
> **Estimated Points:** 8
> **Owner:** @dev
> **Depends on:** AZM-3.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** implementar BaseRepository com CRUD genérico e 11 repositories especializados,
**so that** toda lógica de acesso a dados esteja isolada em repositories substituindo os 168 padrões supabase.table() + 1 supabase.rpc().

---

## Acceptance Criteria

1. [ ] `backend/repositories/base.py` com BaseRepository (get_by_id, get_all, create, create_many, update, delete, delete_where, upsert)
2. [ ] `backend/repositories/user_repo.py` — UserRepository (auth por RA, busca por role, avatar update)
3. [ ] `backend/repositories/discipline_repo.py` — DisciplineRepository (com get_teachers, get_students via joinedload)
4. [ ] `backend/repositories/course_repo.py` — CourseRepository (filtro por discipline, paginação, export hierarchy)
5. [ ] `backend/repositories/chapter_repo.py` — ChapterRepository (ordenação por order field)
6. [ ] `backend/repositories/content_repo.py` — ContentRepository (busca ilike, audio/text URL updates)
7. [ ] `backend/repositories/question_repo.py` — QuestionRepository (bulk insert, status transitions, delete by status)
8. [ ] `backend/repositories/chat_repo.py` — ChatRepository (sessions com joinedload de contents/chapters/courses, increment_message_count via SP)
9. [ ] `backend/repositories/admin_repo.py` — AdminRepository (settings singleton, logs insert, backups CRUD)
10. [ ] `backend/repositories/gamification_repo.py` — GamificationRepository (activities, stats, achievements, certificates, progress)
11. [ ] `backend/repositories/notification_repo.py` — NotificationRepository (unread count, mark all read)
12. [ ] Mapeamento 1:1 documentado: cada padrão Supabase → método repository

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar `backend/repositories/base.py` (AC: 1)
  - [ ] BaseRepository.__init__(self, db: Session, model: Type[T])
  - [ ] get_by_id(id) — `db.get(model, id)`
  - [ ] get_all(filters, order_by, desc, limit, offset) → tuple[List[T], int] — com count total
  - [ ] create(data) — add, commit, refresh
  - [ ] create_many(data_list) — add_all, commit
  - [ ] update(id, data) — setattr loop, commit
  - [ ] delete(id) — delete, commit → bool
  - [ ] delete_where(filters) → int (count deleted)
  - [ ] upsert(data, conflict_columns) — select existing or create
- [ ] Task 2: Criar `backend/repositories/user_repo.py` (AC: 2)
  - [ ] `get_by_ra(ra)` — autenticação (substitui `.eq("ra", ra).single()`)
  - [ ] `get_by_role(role)` — listar por role
  - [ ] `search_users(term)` — ilike em name/email/ra
  - [ ] `update_avatar(user_id, avatar_url)` — update específico
- [ ] Task 3: Criar `backend/repositories/discipline_repo.py` (AC: 3)
  - [ ] `get_teachers(discipline_id)` — joinedload(DisciplineTeacher.teacher)
  - [ ] `get_students(discipline_id)` — joinedload(DisciplineStudent.student)
  - [ ] `add_teacher(discipline_id, teacher_id)` — create DisciplineTeacher
  - [ ] `remove_teacher(discipline_id, teacher_id)` — delete_where
  - [ ] `add_student(discipline_id, student_id)` — create DisciplineStudent
  - [ ] `remove_student(discipline_id, student_id)` — delete_where
- [ ] Task 4: Criar `backend/repositories/course_repo.py` (AC: 4)
  - [ ] Override `get_all` para filtro por discipline_id com paginação
  - [ ] `export_full(course_id)` — joinedload de chapters → contents → questions
  - [ ] `get_with_chapters(course_id)` — eager load chapters
- [ ] Task 5: Criar `backend/repositories/chapter_repo.py` (AC: 5)
  - [ ] Override `get_all` para ordenação default por `order` field
  - [ ] `reorder(chapter_id, new_order)` — update order
- [ ] Task 6: Criar `backend/repositories/content_repo.py` (AC: 6)
  - [ ] `search(column, term)` — ilike search (substitui `.ilike("col", "%term%")`)
  - [ ] `update_audio_url(content_id, url)` — update específico
  - [ ] `update_text_url(content_id, url)` — update específico
- [ ] Task 7: Criar `backend/repositories/question_repo.py` (AC: 7)
  - [ ] `create_many(questions)` — bulk insert
  - [ ] `update_status(question_id, status)` — status transition
  - [ ] `delete_by_status(content_id, status)` — delete where content_id AND status
  - [ ] `get_by_content_and_status(content_id, status)` — filtro combinado
- [ ] Task 8: Criar `backend/repositories/chat_repo.py` (AC: 8)
  - [ ] `get_sessions_for_user(user_id)` — com joinedload de content → chapter → course
  - [ ] `get_session_with_messages(session_id)` — joinedload messages
  - [ ] `create_message(session_id, data)` — create ChatMessage
  - [ ] `increment_message_count(session_id)` — `db.execute(text("EXEC sp_increment_message_count @session_id = :sid"), {"sid": session_id})`
- [ ] Task 9: Criar `backend/repositories/admin_repo.py` (AC: 9)
  - [ ] `get_settings()` — singleton (first row)
  - [ ] `update_settings(data)` — update first row or create if none
  - [ ] `create_log(data)` — insert SystemLog
  - [ ] `get_logs(limit, offset, order_by)` — with pagination
  - [ ] CRUD completo para SystemBackup
- [ ] Task 10: Criar `backend/repositories/gamification_repo.py` (AC: 10)
  - [ ] `create_activity(data)` — insert UserActivity
  - [ ] `get_user_activities(user_id)` — filter by user
  - [ ] `get_or_create_stats(user_id)` — upsert UserStats
  - [ ] `update_stats(user_id, data)` — update stats
  - [ ] `create_achievement(data)` — insert
  - [ ] `get_achievements(user_id)` — filter
  - [ ] `create_certificate(data)` — insert
  - [ ] `get_certificates(user_id)` — filter
  - [ ] `upsert_progress(user_id, course_id, data)` — upsert CourseProgress
  - [ ] `get_progress(user_id, course_id)` — get specific progress
- [ ] Task 11: Criar `backend/repositories/notification_repo.py` (AC: 11)
  - [ ] `get_unread_count(user_id)` — count where read=False
  - [ ] `mark_all_read(user_id)` — bulk update read=True
  - [ ] `get_for_user(user_id, limit, offset)` — with pagination
- [ ] Task 12: Criar `backend/repositories/__init__.py`
  - [ ] Import e export de todos os repositories

---

## Dev Notes

**BaseRepository completo (da arquitetura):**
```python
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

    def get_all(self, filters=None, order_by=None, desc=False, limit=None, offset=None) -> tuple[List[T], int]:
        query = select(self.model)
        if filters:
            for key, value in filters.items():
                query = query.where(getattr(self.model, key) == value)
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        if order_by:
            col = getattr(self.model, order_by)
            query = query.order_by(col.desc() if desc else col.asc())
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def create(self, data: Dict[str, Any]) -> T:
        obj = self.model(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def create_many(self, data_list: List[Dict[str, Any]]) -> List[T]:
        objects = [self.model(**data) for data in data_list]
        self.db.add_all(objects)
        self.db.commit()
        for obj in objects:
            self.db.refresh(obj)
        return objects

    def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        obj = self.get_by_id(id)
        if not obj:
            return None
        for key, value in data.items():
            setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: str) -> bool:
        obj = self.get_by_id(id)
        if not obj:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True

    def delete_where(self, filters: Dict[str, Any]) -> int:
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

**Mapeamento Supabase → Repository (169 operações: 168 table + 1 rpc):**
**Nota:** As 24 operações supabase.storage são cobertas pela AZM-3.3 (AzureBlobStorage wrapper). Total geral: 193 operações Supabase.

| Supabase Pattern | Repository Method |
|---|---|
| `.select("*", count="exact").range()` | `repo.get_all(offset=, limit=)` |
| `.select("*").eq("id", x).single()` | `repo.get_by_id(x)` |
| `.select("*").eq(k, v)` | `repo.get_all(filters={k: v})` |
| `.insert(data)` | `repo.create(data)` |
| `.insert(data_list)` | `repo.create_many(data_list)` |
| `.update(data).eq("id", x)` | `repo.update(x, data)` |
| `.delete().eq("id", x)` | `repo.delete(x)` |
| `.delete().eq(k1,v1).eq(k2,v2)` | `repo.delete_where({k1:v1, k2:v2})` |
| `.upsert(data)` | `repo.upsert(data, conflict_cols)` |
| `.rpc("increment_message_count")` | `repo.increment_message_count(id)` |
| `.ilike("col", term)` | `repo.search(col, term)` |
| Relationship joins (`.select("*, table!fk(*)")`) | SQLAlchemy `joinedload()` |

**Total: 169 operações (168 table + 1 rpc)** — contagem baseada em análise exaustiva de `backend/main.py`.

**joinedload pattern (para DisciplineRepository, ChatRepository):**
```python
from sqlalchemy.orm import joinedload

query = (
    select(DisciplineTeacher)
    .options(joinedload(DisciplineTeacher.teacher))
    .where(DisciplineTeacher.discipline_id == discipline_id)
)
results = self.db.execute(query).scalars().unique().all()
```

**Stored Procedure call (ChatRepository):**
```python
from sqlalchemy import text

def increment_message_count(self, session_id: str):
    self.db.execute(
        text("EXEC sp_increment_message_count @session_id = :sid"),
        {"sid": session_id}
    )
    self.db.commit()
```

**ilike pattern (ContentRepository, UserRepository):**
```python
from sqlalchemy import func as sqlfunc

def search(self, column: str, term: str):
    col = getattr(self.model, column)
    query = select(self.model).where(col.ilike(f"%{term}%"))
    return self.db.execute(query).scalars().all()
```
Nota: No SQL Server, `ILIKE` não existe nativamente. SQLAlchemy traduz `.ilike()` para `LIKE` com collation case-insensitive (que é o default do Azure SQL).

### Testing

- Testar cada método do BaseRepository com dados mock
- Testar joinedload queries retornam related objects
- Testar SP call com session_id existente
- Testar ilike search com termos parciais
- Testar upsert (create new + update existing)
- Testar paginação (offset/limit) com count total
- Verificar que TODOS os 169 padrões Supabase (168 table + 1 rpc) têm equivalente

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Fix tabela mapeamento: remover coluna Count (discrepância numérica), total autoritativo 169 | River (SM) |

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
