# Story AZM-3.5: Migrar Rotas de Courses, Chapters, Contents e Questions para Repositories

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
**I want** refatorar as rotas do core educacional (cursos, capítulos, conteúdos, questões) para usar repositories,
**so that** o fluxo educacional completo funcione com Azure SQL via SQLAlchemy.

---

## Acceptance Criteria

1. [ ] Rotas de courses: `GET /courses`, `POST /courses`, `GET /courses/{id}`, `PUT /courses/{id}`, `DELETE /courses/{id}` usando CourseRepository (com paginação)
2. [ ] Rotas de classes/courses: `POST /classes/{class_id}/courses`, `GET /classes/{class_id}/courses`, `GET /classes/{class_id}/stats` usando CourseRepository
3. [ ] Rota de dashboard: `GET /dashboard/stats` usando queries de contagem
4. [ ] Rotas de chapters: `GET /courses/{id}/chapters`, `POST /courses/{id}/chapters`, `PUT /chapters/{id}`, `DELETE /chapters/{id}` usando ChapterRepository
5. [ ] Rotas de contents: `GET /chapters/{id}/contents`, `POST /chapters/{id}/contents`, `GET /contents/{id}`, `PUT /contents/{id}`, `DELETE /contents/{id}` usando ContentRepository
6. [ ] Upload de conteúdo: `POST /chapters/{id}/upload` usando blob_storage
7. [ ] Upload de imagem de curso: `POST /courses/{id}/image` usando blob_storage
8. [ ] Upload genérico: `POST /upload`, `POST /upload/video`, `POST /upload/audio` usando blob_storage
9. [ ] Rotas de questions: `GET /contents/{id}/questions`, `POST /contents/{id}/questions`, `PUT /questions/{id}`, `DELETE /questions/{id}` usando QuestionRepository
10. [ ] Batch questions: `PUT /contents/{id}/questions/batch` usando QuestionRepository (soft-delete + replace)
11. [ ] Geração de questões: flow AI → QuestionRepository.create_many() mantido
12. [ ] Status transitions de questions (active/replacing) funcionando
13. [ ] Export de curso: `GET /courses/{id}/export` via repository eager load hierarchy

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Migrar rotas de courses (AC: 1)
  - [ ] `GET /courses`: CourseRepository.get_all(filters={"discipline_id": id}, order_by="created_at", desc=True, offset=, limit=)
  - [ ] `GET /courses/{id}`: CourseRepository.get_by_id(id)
  - [ ] `POST /courses`: CourseRepository.create(data)
  - [ ] `PUT /courses/{id}`: CourseRepository.update(id, data)
  - [ ] `DELETE /courses/{id}`: CourseRepository.delete(id)
  - [ ] Manter paginação com response header `x-total-count`
- [ ] Task 2: Migrar rotas de classes (AC: 2)
  - [ ] `POST /classes/{class_id}/courses`: CourseRepository.create(data) com discipline_id=class_id
  - [ ] `GET /classes/{class_id}/courses`: CourseRepository.get_all(filters={"discipline_id": class_id})
  - [ ] `GET /classes/{class_id}/stats`: queries de contagem (courses, students, interactions) para a discipline
- [ ] Task 3: Migrar rota de dashboard (AC: 3)
  - [ ] `GET /dashboard/stats`: queries de contagem/agregação (courses count, hours, score, achievements) por user
- [ ] Task 4: Migrar upload de imagem de curso (AC: 7)
  - [ ] `POST /courses/{id}/image`: `blob_storage.upload("courses", file_path, content, content_type)`
  - [ ] Atualizar `image_url` via CourseRepository.update()
- [ ] Task 5: Migrar rotas de chapters (AC: 4)
  - [ ] `GET /courses/{id}/chapters`: ChapterRepository.get_all(filters={"course_id": id}, order_by="order")
  - [ ] `POST /courses/{id}/chapters`: ChapterRepository.create(data)
  - [ ] `PUT /chapters/{id}`: ChapterRepository.update(id, data)
  - [ ] `DELETE /chapters/{id}`: ChapterRepository.delete(id)
- [ ] Task 6: Migrar rotas de contents (AC: 5)
  - [ ] `GET /chapters/{id}/contents`: ContentRepository.get_all(filters={"chapter_id": id}, order_by="order")
  - [ ] `GET /contents/{id}`: ContentRepository.get_by_id(id) com questions joinedload
  - [ ] `POST /chapters/{id}/contents`: ContentRepository.create(data)
  - [ ] `PUT /contents/{id}`: ContentRepository.update(id, data)
  - [ ] `DELETE /contents/{id}`: ContentRepository.delete(id)
- [ ] Task 7: Migrar uploads de conteúdo (AC: 6, 8)
  - [ ] `POST /chapters/{id}/upload`: `blob_storage.upload("courses", file_path, content, content_type)`
  - [ ] Para PDFs: manter extração de texto com pdfplumber
  - [ ] Para áudio TTS: `blob_storage.upload("courses", audio_path, audio_content, "audio/mpeg")`
  - [ ] Atualizar file_url/text_url/audio_url via ContentRepository.update()
  - [ ] `POST /upload`: upload genérico para blob_storage com upload_with_fallback
  - [ ] `POST /upload/video`: delega para upload genérico
  - [ ] `POST /upload/audio`: delega para upload genérico
- [ ] Task 8: Migrar rotas de questions (AC: 9, 10, 11, 12)
  - [ ] `GET /contents/{id}/questions`: QuestionRepository.get_all(filters={"content_id": id})
  - [ ] `POST /contents/{id}/questions`: QuestionRepository.create(data) ou create_many(data_list)
  - [ ] `PUT /questions/{id}`: QuestionRepository.update(id, data)
  - [ ] `DELETE /questions/{id}`: QuestionRepository.delete(id)
  - [ ] `PUT /contents/{id}/questions/batch`: QuestionRepository.delete_by_status + create_many (soft-delete → replace)
  - [ ] Geração AI: manter flow → AI gera questions → QuestionRepository.create_many(questions)
  - [ ] Status transitions: QuestionRepository.update_status(id, "active"/"replacing")
- [ ] Task 9: Migrar export de curso (AC: 13)
  - [ ] `GET /courses/{id}/export`: CourseRepository.export_full(course_id) com eager load hierarchy
  - [ ] Response: nested JSON course → chapters → contents → questions, suporte CSV
- [ ] Task 10: Adicionar `Depends(get_db)` em todas as rotas migradas
  - [ ] Remover `if not supabase` checks

---

## Dev Notes

**Paginação — manter mesmo padrão:**
```python
# ANTES
.select("*", count="exact").range(offset, offset + per_page - 1)
# response.count → total

# DEPOIS
courses, total = repo.get_all(offset=offset, limit=per_page)
# total já retornado pelo get_all
```

**Upload de conteúdo — padrão:**
```python
# ANTES
supabase.storage.from_("courses").upload(file_path, content, {"upsert": "true", "content-type": ct})
url = supabase.storage.from_("courses").get_public_url(file_path)

# DEPOIS
url = blob_storage.upload("courses", file_path, content, content_type=ct)
```

**Export hierarchy — SQLAlchemy eager loading:**
```python
def export_full(self, course_id):
    query = (
        select(Course)
        .options(
            joinedload(Course.chapters)
            .joinedload(Chapter.contents)
            .joinedload(Content.questions)
        )
        .where(Course.id == course_id)
    )
    return self.db.execute(query).scalar_one_or_none()
```

**Geração AI de questions — o flow AI NAO muda:**
1. Frontend chama `POST /contents/{id}/generate-questions`
2. Backend chama AI service (OpenAI) → retorna list de questions
3. Backend salva: `QuestionRepository(db).create_many(questions)` (era `supabase.table("questions").insert(questions)`)

**Imports adicionais para main.py:**
```python
from repositories.course_repo import CourseRepository
from repositories.chapter_repo import ChapterRepository
from repositories.content_repo import ContentRepository
from repositories.question_repo import QuestionRepository
```

**Source tree:**
- `backend/main.py` — rotas de courses (~lines 800-1800)
- `backend/repositories/course_repo.py`, `chapter_repo.py`, `content_repo.py`, `question_repo.py`
- `backend/storage.py` — blob_storage singleton

### Testing

- Testar CRUD completo de courses com paginação
- Testar CRUD chapters com ordenação
- Testar upload de PDF e extração de texto
- Testar geração AI → bulk insert de questions
- Testar status transitions de questions
- Testar export hierarchy nested JSON
- Verificar que blob_storage.upload gera URLs corretas

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
