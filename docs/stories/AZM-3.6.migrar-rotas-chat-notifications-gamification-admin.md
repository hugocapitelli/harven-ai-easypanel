# Story AZM-3.6: Migrar Rotas de Chat, Notifications, Gamification e Admin

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
**I want** refatorar as rotas de chat socrático, notificações, gamificação e admin console,
**so that** todas as funcionalidades restantes usem repositories/Azure SQL ao invés de supabase.

---

## Acceptance Criteria

1. [ ] Rotas de chat_sessions: `POST /chat-sessions`, `GET /chat-sessions/{id}`, `GET /chat-sessions/by-content/{content_id}`, `GET /users/{id}/chat-sessions`, `PUT /chat-sessions/{id}/complete` usando ChatRepository (com joinedload)
2. [ ] Rotas de chat_messages: `POST /chat-sessions/{id}/messages`, `GET /chat-sessions/{id}/messages` usando ChatRepository
3. [ ] Chamada de SP: `sp_increment_message_count` via `db.execute()` substituindo `supabase.rpc()`
4. [ ] Export de chat: `POST /chat-sessions/{id}/export-moodle` (xAPI format), `GET /export/moodle/batch` (batch export)
5. [ ] Rotas de notifications: `GET /notifications/{user_id}`, `GET /notifications/{user_id}/count`, `POST /notifications`, `PUT /notifications/{id}/read`, `PUT /notifications/{user_id}/read-all`, `DELETE /notifications/{id}` usando NotificationRepository
6. [ ] Rotas de gamification: `GET/POST /users/{id}/activities`, `GET /users/{id}/stats`, `GET /users/{id}/achievements`, `POST /users/{id}/achievements/{aid}/unlock`, `GET/POST /users/{id}/certificates` usando GamificationRepository
7. [ ] Rotas de course progress: `GET /users/{id}/courses/{cid}/progress`, `POST /users/{id}/courses/{cid}/complete-content/{ctid}` usando GamificationRepository
8. [ ] Rotas de admin settings: `GET /admin/settings`, `POST /admin/settings`, `GET /settings/public` usando AdminRepository (singleton pattern)
9. [ ] Upload de logos/backgrounds: `POST /admin/settings/upload-logo`, `POST /admin/settings/upload-login-logo`, `POST /admin/settings/upload-login-bg` usando blob_storage
10. [ ] Rotas de admin logs: `GET /admin/logs`, `GET /admin/logs/search`, `GET /admin/logs/export` usando AdminRepository
11. [ ] Rotas de admin backups: `GET /admin/backups`, `POST /admin/backups`, `GET /admin/backups/{id}/download`, `DELETE /admin/backups/{id}` usando AdminRepository + blob_storage
12. [ ] Backup download: signed URL via `blob_storage.create_signed_url()`
13. [ ] Rotas de admin stats e monitoring: `GET /admin/stats`, `GET /admin/performance`, `GET /admin/storage` usando queries de contagem/sistema
14. [ ] Rotas de admin actions: `POST /admin/actions`, `POST /admin/force-logout`, `POST /admin/clear-cache`
15. [ ] Rota de busca global: `GET /search` usando queries cross-table (courses, disciplines, chapters, users, contents)
16. [ ] Rotas de AI services (10 rotas): `GET /api/ai/status`, `POST /api/ai/creator/generate`, `POST /api/ai/socrates/dialogue`, `POST /api/ai/analyst/detect`, `POST /api/ai/editor/edit`, `POST /api/ai/tester/validate`, `POST /api/ai/organizer/session`, `POST /api/ai/organizer/prepare-export`, `GET /api/ai/estimate-cost`, `POST /api/ai/transcribe` — migrar reads de token_usage e system_settings para repositories
17. [ ] Rotas de TTS (4 rotas): `GET /api/ai/tts/voices`, `POST /api/ai/tts/generate`, `POST /api/ai/tts/generate-summary`, `GET /api/ai/tts/status` — migrar upload de áudio para blob_storage
18. [ ] Rotas de integrações (14 rotas): `POST /integrations/test-connection`, `GET /integrations/status`, `GET /integrations/logs`, `GET /integrations/mappings`, JACAD sync/import (4 rotas), Moodle sync/import/export/ratings/webhook (5 rotas), `GET /integrations/lookup-student/{ra}`
19. [ ] Rotas de health/status: `GET /`, `GET /health`, `GET /test-db` — migrar health check de supabase para db.execute()

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Migrar rotas de chat sessions (AC: 1)
  - [ ] `POST /chat-sessions`: ChatRepository.create(session_data) ou recuperar existente
  - [ ] `GET /chat-sessions/{id}`: ChatRepository.get_session_with_messages(session_id) com joinedload
  - [ ] `GET /chat-sessions/by-content/{content_id}`: ChatRepository.get_by_content_user(content_id, user_id)
  - [ ] `GET /users/{id}/chat-sessions`: ChatRepository.get_sessions_for_user(user_id) com joinedload de content→chapter→course
  - [ ] `PUT /chat-sessions/{id}/complete`: ChatRepository.update(id, {"status": "completed"})
- [ ] Task 2: Migrar rotas de chat messages (AC: 2, 3)
  - [ ] `POST /chat-sessions/{id}/messages`: ChatRepository.create_message(session_id, message_data)
  - [ ] `GET /chat-sessions/{id}/messages`: ChatRepository.get_messages(session_id)
  - [ ] Após criar mensagem do user: `ChatRepository.increment_message_count(session_id)` — chama SP
  - [ ] Manter flow AI: message → AI agents → response → create_message (assistant)
- [ ] Task 3: Migrar export de chat (AC: 4)
  - [ ] `POST /chat-sessions/{id}/export-moodle`: exportar sessão em formato xAPI
  - [ ] `GET /export/moodle/batch`: batch export de sessões para Moodle
- [ ] Task 4: Migrar rotas de notifications (AC: 5)
  - [ ] `GET /notifications/{user_id}`: NotificationRepository.get_for_user(user_id, limit, offset)
  - [ ] `GET /notifications/{user_id}/count`: NotificationRepository.get_unread_count(user_id)
  - [ ] `POST /notifications`: NotificationRepository.create(data)
  - [ ] `PUT /notifications/{id}/read`: NotificationRepository.update(id, {"read": True})
  - [ ] `PUT /notifications/{user_id}/read-all`: NotificationRepository.mark_all_read(user_id)
  - [ ] `DELETE /notifications/{id}`: NotificationRepository.delete(id)
- [ ] Task 5: Migrar rotas de gamification (AC: 6, 7)
  - [ ] `GET /users/{id}/activities`: GamificationRepository.get_user_activities(user_id)
  - [ ] `POST /users/{id}/activities`: GamificationRepository.create_activity(data)
  - [ ] `GET /users/{id}/stats`: GamificationRepository.get_or_create_stats(user_id)
  - [ ] `GET /users/{id}/achievements`: GamificationRepository.get_achievements(user_id)
  - [ ] `POST /users/{id}/achievements/{aid}/unlock`: GamificationRepository.create_achievement(data)
  - [ ] `GET /users/{id}/certificates`: GamificationRepository.get_certificates(user_id)
  - [ ] `POST /users/{id}/certificates`: GamificationRepository.create_certificate(data)
  - [ ] `GET /users/{id}/courses/{cid}/progress`: GamificationRepository.get_progress(user_id, course_id)
  - [ ] `POST /users/{id}/courses/{cid}/complete-content/{ctid}`: GamificationRepository.upsert_progress() + check course completion
- [ ] Task 6: Migrar rotas de admin settings (AC: 8, 9)
  - [ ] `GET /admin/settings`: AdminRepository.get_settings()
  - [ ] `POST /admin/settings`: AdminRepository.update_settings(data)
  - [ ] `GET /settings/public`: AdminRepository.get_settings() (subset público, sem auth)
  - [ ] `POST /admin/settings/upload-logo`: `blob_storage.upload("courses", "system/logo_...", content, content_type)`
  - [ ] `POST /admin/settings/upload-login-logo`: `blob_storage.upload("courses", "system/login_logo_...", content, content_type)`
  - [ ] `POST /admin/settings/upload-login-bg`: `blob_storage.upload("courses", "system/bg_...", content, content_type)`
- [ ] Task 7: Migrar rotas de admin logs (AC: 10)
  - [ ] `GET /admin/logs`: AdminRepository.get_logs(limit=10, order_by="created_at", desc=True)
  - [ ] `GET /admin/logs/search`: AdminRepository.search_logs(filters, pagination)
  - [ ] `GET /admin/logs/export`: AdminRepository.export_logs(format="json"|"csv")
- [ ] Task 8: Migrar rotas de admin backups (AC: 11, 12)
  - [ ] `GET /admin/backups`: AdminRepository.get_all(SystemBackup) com paginação
  - [ ] `POST /admin/backups`: criar backup → upload para blob_storage("backups", ...) → salvar registro
  - [ ] `GET /admin/backups/{id}/download`: `blob_storage.create_signed_url("backups", storage_path, 3600)`
  - [ ] `DELETE /admin/backups/{id}`: `blob_storage.remove("backups", [storage_path])` + AdminRepository.delete(id)
- [ ] Task 9: Migrar rotas de admin stats e monitoring (AC: 13, 14)
  - [ ] `GET /admin/stats`: queries de COUNT em cada tabela (users, courses, disciplines, etc.)
  - [ ] `GET /admin/performance`: métricas de sistema (CPU, RAM, disk, uptime, DB latency)
  - [ ] `GET /admin/storage`: contagem de registros por tabela via `db.execute(select(func.count())...)`
  - [ ] `POST /admin/actions`: criar anúncio global ou manutenção agendada
  - [ ] `POST /admin/force-logout`: invalidar sessões (limpar tokens)
  - [ ] `POST /admin/clear-cache`: limpar cache em memória
- [ ] Task 10: Migrar rota de busca global (AC: 15)
  - [ ] `GET /search`: queries ilike cross-table (courses, disciplines, chapters, users, contents) via repositories
- [ ] Task 11: Migrar rotas de AI services (AC: 16, 17)
  - [ ] As 14 rotas `/api/ai/*` mantêm chamadas a APIs externas (Gemini/OpenAI/ElevenLabs)
  - [ ] Migrar leituras de `token_usage` table para repository (estimativa de custo, limites diários)
  - [ ] Migrar leituras de `system_settings` para AdminRepository (configurações AI)
  - [ ] Migrar uploads de áudio TTS para `blob_storage.upload("courses", ...)`
  - [ ] As 4 rotas TTS (`/api/ai/tts/*`) usam blob_storage para áudio gerado
- [ ] Task 12: Migrar rotas de integrações (AC: 18)
  - [ ] `POST /integrations/test-connection`: testar conexão com sistema externo
  - [ ] `GET /integrations/status`: status de todas as integrações
  - [ ] `GET /integrations/logs`: logs de sincronização com filtros
  - [ ] `GET /integrations/mappings`: mapeamentos de IDs externos
  - [ ] JACAD: `POST .../sync`, `POST .../import-students`, `POST .../import-disciplines`, `GET .../student/{ra}`
  - [ ] Moodle: `POST .../sync`, `POST .../import-users`, `POST .../export-sessions`, `GET .../ratings`, `POST .../webhook`
  - [ ] `GET /integrations/lookup-student/{ra}`: buscar aluno no JACAD + DB local
  - [ ] Migrar todas as leituras/escritas de supabase.table para repositories
- [ ] Task 13: Migrar rotas de health/status (AC: 19)
  - [ ] `GET /`: manter como healthcheck básico
  - [ ] `GET /health`: migrar check de `supabase` para `db.execute(text("SELECT 1"))`
  - [ ] `GET /test-db`: migrar para `db.execute(text("SELECT 1"))` com try/except
- [ ] Task 14: Adicionar `Depends(get_db)` e remover `if not supabase` checks em todas as rotas

---

## Dev Notes

**Chat joinedload — padrão complexo:**
```python
# ANTES (Supabase)
supabase.table("chat_sessions").select("*, contents!content_id(*, chapters!chapter_id(*, courses!course_id(*)))", count="exact").eq("user_id", user_id).execute()

# DEPOIS (SQLAlchemy)
query = (
    select(ChatSession)
    .options(
        joinedload(ChatSession.content)
        .joinedload(Content.chapter)
        .joinedload(Chapter.course)
    )
    .where(ChatSession.user_id == user_id)
)
```

**SP call — increment_message_count:**
```python
# ANTES
supabase.rpc("increment_message_count", {"p_session_id": session_id}).execute()

# DEPOIS
from sqlalchemy import text
db.execute(text("EXEC sp_increment_message_count @session_id = :sid"), {"sid": session_id})
db.commit()
```

**Backup download — signed URL:**
```python
# ANTES
signed = supabase.storage.from_("backups").create_signed_url(storage_path, 3600)
return {"url": signed["signedURL"]}

# DEPOIS
url = blob_storage.create_signed_url("backups", storage_path, 3600)
return {"url": url}
```

**Admin settings — singleton pattern:**
O system_settings tem apenas 1 row. `get_settings()` retorna a primeira row. `update_settings()` faz update nessa row ou cria se não existir.

**Admin stats — pattern:**
```python
# ANTES
users_count = supabase.table("users").select("*", count="exact").execute().count
# DEPOIS
from sqlalchemy import func
users_count = db.execute(select(func.count()).select_from(User)).scalar()
```

**Imports adicionais:**
```python
from repositories.chat_repo import ChatRepository
from repositories.notification_repo import NotificationRepository
from repositories.gamification_repo import GamificationRepository
from repositories.admin_repo import AdminRepository
from repositories.user_repo import UserRepository
from repositories.course_repo import CourseRepository
from repositories.content_repo import ContentRepository
```

**Nota sobre rotas AI:** As rotas `/api/ai/*` chamam APIs externas (Gemini, OpenAI, ElevenLabs) — essa lógica NÃO muda. Apenas as leituras/escritas de `supabase.table("token_usage")`, `supabase.table("system_settings")` e `supabase.storage` precisam migrar para repositories/blob_storage.

**Nota sobre rotas de integrações:** As rotas `/integrations/*` fazem chamadas a sistemas externos (JACAD, Moodle). A lógica de integração não muda — apenas as operações de banco migram para repositories.

**Source tree:**
- `backend/main.py` — rotas restantes (~lines 700-5013, 98 das 124 rotas totais)
- `backend/repositories/` — todos os repositories
- `backend/storage.py` — blob_storage

### Testing

- Testar chat flow completo: criar session → enviar messages → AI response → increment count
- Testar SP call incrementa total_messages
- Testar export de chat para Moodle (xAPI format)
- Testar notifications: create, list by user, unread count, mark as read, mark all read, delete
- Testar gamification: activities, stats, achievements unlock, certificates, course progress + completion
- Testar admin settings singleton (get/update), settings/public (sem auth)
- Testar upload de 3 logos/backgrounds via blob_storage
- Testar admin logs: list, search com filtros, export JSON/CSV
- Testar backup create → upload → signed URL download → delete
- Testar admin stats, performance, storage contagens
- Testar admin actions, force-logout, clear-cache
- Testar busca global (/search) cross-table
- Testar AI routes: status, token_usage tracking, cost estimation
- Testar TTS: generate audio → upload para blob_storage
- Testar integrações: test-connection, JACAD sync, Moodle webhook
- Testar health endpoints: /, /health, /test-db retornam OK com DB conectado

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Fix AC16 contagem rotas (14→10, TTS separado em AC17) | River (SM) |

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
