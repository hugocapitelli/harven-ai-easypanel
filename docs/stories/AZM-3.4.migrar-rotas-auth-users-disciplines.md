# Story AZM-3.4: Migrar Rotas de Auth, Users e Disciplines para Repositories

> **Epic:** Epic 3 — Backend Data Layer Refactor
> **Status:** Draft
> **Priority:** Critical
> **Estimated Points:** 8
> **Owner:** @dev
> **Depends on:** AZM-3.2, AZM-3.3
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** refatorar as rotas de autenticação, gestão de usuários e disciplinas para usar repositories,
**so that** essas rotas usem SQLAlchemy/Azure SQL ao invés de supabase.table().

---

## Acceptance Criteria

1. [ ] Rota de auth: `POST /auth/login` usando UserRepository
2. [ ] Rotas de users: `GET /users`, `POST /users`, `PUT /users/{id}`, `GET /users/{id}` usando UserRepository
3. [ ] Rota de batch users: `POST /users/batch` usando UserRepository.create_many()
4. [ ] Rota de avatar upload: `POST /users/{id}/avatar` usando blob_storage
5. [ ] Rota de avatar delete: `DELETE /users/{id}/avatar` usando blob_storage.remove()
6. [ ] Rotas de disciplines: `GET /disciplines`, `POST /disciplines`, `GET /disciplines/{id}`, `PUT /disciplines/{id}` usando DisciplineRepository
7. [ ] Upload imagem de disciplina: `POST /disciplines/{id}/image` usando blob_storage
8. [ ] Rotas de teachers: `GET/POST /disciplines/{id}/teachers`, `DELETE /disciplines/{id}/teachers/{tid}` usando DisciplineRepository
9. [ ] Rotas de students: `GET/POST /disciplines/{id}/students`, `DELETE /disciplines/{id}/students/{sid}` usando DisciplineRepository
10. [ ] Batch enroll students: `POST /disciplines/{id}/students/batch` usando DisciplineRepository
11. [ ] `Depends(get_db)` injetado em todas as rotas migradas
12. [ ] Todas as rotas retornam mesma estrutura JSON que antes

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Migrar rota de login (AC: 1, 7)
  - [ ] `POST /auth/login`: trocar `supabase.table("users").select("*").eq("ra", ra).single()` por `UserRepository(db).get_by_ra(ra)`
  - [ ] Manter lógica de bcrypt password verification
  - [ ] Manter JWT token generation
  - [ ] Manter role normalization (TEACHER → INSTRUCTOR)
  - [ ] Adicionar `db: Session = Depends(get_db)` ao parâmetro da rota
- [ ] Task 2: Migrar rotas de users (AC: 2, 11, 12)
  - [ ] `GET /users`: trocar por `UserRepository(db).get_all(filters, order_by, limit, offset)`
  - [ ] `GET /users/{id}`: trocar por `UserRepository(db).get_by_id(id)`
  - [ ] `POST /users`: trocar por `UserRepository(db).create(data)`
  - [ ] `PUT /users/{id}`: trocar por `UserRepository(db).update(id, data)`
  - [ ] Manter mesma estrutura de response: `{"data": [...], "total": N}` para listas
- [ ] Task 3: Migrar rota de batch users (AC: 3)
  - [ ] `POST /users/batch`: trocar por `UserRepository(db).create_many(data_list)`
- [ ] Task 4: Migrar rotas de avatar (AC: 4, 5)
  - [ ] `POST /users/{id}/avatar`: trocar `supabase.storage.from_("avatars").upload()` por `blob_storage.upload("avatars", ...)`
  - [ ] Trocar `get_public_url` por `blob_storage.get_public_url("avatars", ...)`
  - [ ] Atualizar avatar_url no user via `UserRepository(db).update(id, {"avatar_url": url})`
  - [ ] `DELETE /users/{id}/avatar`: trocar `supabase.storage.from_("avatars").remove()` por `blob_storage.remove("avatars", [path])`
  - [ ] Atualizar avatar_url para None via `UserRepository(db).update(id, {"avatar_url": None})`
- [ ] Task 5: Migrar rotas de disciplines (AC: 6, 7, 11, 12)
  - [ ] `GET /disciplines`: trocar por `DisciplineRepository(db, Discipline).get_all(...)`
  - [ ] `GET /disciplines/{id}`: trocar por `DisciplineRepository(db, Discipline).get_by_id(id)`
  - [ ] `POST /disciplines`: trocar por `DisciplineRepository(db, Discipline).create(data)`
  - [ ] `PUT /disciplines/{id}`: trocar por `DisciplineRepository(db, Discipline).update(id, data)`
  - [ ] `POST /disciplines/{id}/image`: trocar por `blob_storage.upload("courses", ...)` + DisciplineRepository.update(id, {"image_url": url})
- [ ] Task 6: Migrar rotas de teachers (AC: 8, 11, 12)
  - [ ] `GET /disciplines/{id}/teachers`: trocar por `DisciplineRepository(db).get_teachers(discipline_id)` com joinedload
  - [ ] `POST /disciplines/{id}/teachers`: trocar por `DisciplineRepository(db).add_teacher(discipline_id, teacher_id)`
  - [ ] `DELETE /disciplines/{id}/teachers/{teacher_id}`: trocar por `DisciplineRepository(db).remove_teacher(discipline_id, teacher_id)`
- [ ] Task 7: Migrar rotas de students (AC: 9, 10, 11, 12)
  - [ ] `GET /disciplines/{id}/students`: trocar por `DisciplineRepository(db).get_students(discipline_id)` com joinedload
  - [ ] `POST /disciplines/{id}/students`: trocar por `DisciplineRepository(db).add_student(discipline_id, student_id)`
  - [ ] `POST /disciplines/{id}/students/batch`: trocar por loop de `DisciplineRepository(db).add_student()` para cada RA
  - [ ] `DELETE /disciplines/{id}/students/{student_id}`: trocar por `DisciplineRepository(db).remove_student(discipline_id, student_id)`
- [ ] Task 8: Remover verificações de `if not supabase` nas rotas migradas (AC: 11)
  - [ ] Substituir `if not supabase: raise HTTPException(503)` por `Depends(get_db)`

---

## Dev Notes

**Padrão de migração (ANTES → DEPOIS):**

```python
# ANTES
@app.post("/auth/login")
async def login(request: Request):
    if not supabase:
        raise HTTPException(status_code=503, detail="DB Disconnected")
    try:
        data = await request.json()
        ra = data.get("ra", "").strip()
        response = supabase.table("users").select("*").eq("ra", ra).single().execute()
        user = response.data
        ...

# DEPOIS
@app.post("/auth/login")
async def login(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        ra = data.get("ra", "").strip()
        user_repo = UserRepository(db)
        user_obj = user_repo.get_by_ra(ra)
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        user = user_obj.to_dict()
        ...
```

**Imports necessários no topo do main.py:**
```python
from database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends
from repositories.user_repo import UserRepository
from repositories.discipline_repo import DisciplineRepository
from storage import blob_storage
```

**Padrão de response — manter exatamente:**
- Lista: `{"data": [item.to_dict() for item in items], "total": total}`
- Single: `{"data": item.to_dict()}`
- Com count header: `response.headers["x-total-count"] = str(total)` (se existente)

**Avatar upload padrão:**
```python
# ANTES
file_path = f"avatars/{user_id}/{filename}"
supabase.storage.from_("avatars").upload(file_path, content, {"upsert": "true", "content-type": content_type})
url = supabase.storage.from_("avatars").get_public_url(file_path)
supabase.table("users").update({"avatar_url": url}).eq("id", user_id).execute()

# DEPOIS
file_path = f"avatars/{user_id}/{filename}"
url = blob_storage.upload("avatars", file_path, content, content_type=content_type)
user_repo.update(user_id, {"avatar_url": url})
```

**Relationship join — teachers/students:**
```python
# ANTES (Supabase join notation)
supabase.table("discipline_teachers").select("*, users!teacher_id(id, name, email, role, avatar_url, ra, title)", count="exact").eq("discipline_id", id).execute()

# DEPOIS (SQLAlchemy joinedload)
results, total = discipline_repo.get_teachers(discipline_id)
data = [{**dt.to_dict(), "teacher": dt.teacher.to_dict()} for dt in results]
```

**Source tree relevante:**
- `backend/main.py` — rotas a migrar (linhas ~100-800 para auth/users/disciplines)
- `backend/database.py` — criado em AZM-3.1
- `backend/repositories/user_repo.py` — criado em AZM-3.2
- `backend/repositories/discipline_repo.py` — criado em AZM-3.2
- `backend/storage.py` — criado em AZM-3.3

### Testing

- Testar login flow completo: RA → user lookup → bcrypt verify → JWT generation
- Testar CRUD users com filtros de role
- Testar avatar upload gera URL correta no Azure Blob Storage
- Testar CRUD disciplines
- Testar add/remove teacher e student
- Testar que joinedload retorna teacher/student data nested
- Verificar que responses mantêm mesma estrutura JSON

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |

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
