# Story AZM-6.1: Teste End-to-End Completo

> **Epic:** Epic 6 — Validação End-to-End
> **Status:** Draft
> **Priority:** Critical
> **Estimated Points:** 5
> **Owner:** @qa (com @dev para fixes)
> **Depends on:** AZM-3.7, AZM-4.1, AZM-5.2
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** QA engineer,
**I want** executar testes end-to-end de todos os fluxos no ambiente Azure,
**so that** validemos que a migração não introduziu regressões e tudo funciona corretamente.

---

## Acceptance Criteria

1. [ ] **Auth:** Login com RA funciona, JWT gerado corretamente
2. [ ] **Users:** CRUD de usuários funcional (admin, instructor, student), batch create
3. [ ] **Avatar:** Upload e delete de avatar no Azure Blob Storage, URL retornada com `harvenstorage.blob.core.windows.net`
4. [ ] **Disciplines:** CRUD funcional, assignment de teachers/students, batch enroll, upload de imagem
5. [ ] **Courses:** CRUD com paginação, filtro por discipline, export hierárquico
6. [ ] **Classes:** Create course in class, list courses, class stats
7. [ ] **Chapters:** CRUD com ordenação
8. [ ] **Contents:** CRUD, upload de PDF/vídeo para Azure Blob Storage, generic uploads
9. [ ] **Questions:** Geração AI funcional, bulk operations, batch replace, status transitions
10. [ ] **Chat Socrático:** Criar sessão, enviar mensagens, AI responde, message count incrementa, export Moodle
11. [ ] **Notifications:** Criar, listar por user, unread count, marcar como lida, mark all read, deletar
12. [ ] **Admin Settings:** Salvar/carregar configurações, upload de 3 logos, settings/public sem auth
13. [ ] **Admin Logs:** Logs registrados, search com filtros, export JSON/CSV
14. [ ] **Admin Backups:** Criar backup, download com signed URL, deletar
15. [ ] **Admin Stats/Monitoring:** Dashboard com contagens corretas, performance, storage stats
16. [ ] **Admin Actions:** Anúncios, force-logout, clear-cache
17. [ ] **Gamification:** Activities, stats, achievements unlock, certificates, course progress + completion
18. [ ] **Dashboard:** Stats do student (courses count, hours, score)
19. [ ] **Search:** Busca global cross-table retorna resultados
20. [ ] **AI Services:** Status check, Socratic dialogue, question generation, cost estimation, token tracking
21. [ ] **TTS:** Voice list, audio generation, áudio salvo em Blob Storage
22. [ ] **Integrations:** Test connection, JACAD lookup, Moodle webhook
23. [ ] **Rate Limiting:** Funcional (100 req/min)
24. [ ] **Health Checks:** `/`, `/health`, `/test-db` respondendo em ambos containers
25. [ ] **CORS:** Frontend acessa backend sem erros de cross-origin

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Validar Auth flow (AC: 1)
  - [ ] POST /auth/login com RA válido → JWT token
  - [ ] Usar token em requests subsequentes
  - [ ] Testar login com RA inválido → 401
  - [ ] Testar login com senha inválida → 401
- [ ] Task 2: Validar Users CRUD (AC: 2, 3)
  - [ ] GET /users → lista de users
  - [ ] POST /users → criar user
  - [ ] POST /users/batch → batch create
  - [ ] PUT /users/{id} → atualizar user
  - [ ] POST /users/{id}/avatar → upload avatar → URL com `harvenstorage.blob.core.windows.net`
  - [ ] DELETE /users/{id}/avatar → remover avatar
- [ ] Task 3: Validar Disciplines (AC: 4)
  - [ ] CRUD disciplines
  - [ ] POST /disciplines/{id}/teachers → assign teacher
  - [ ] POST /disciplines/{id}/students → assign student
  - [ ] POST /disciplines/{id}/students/batch → batch enroll
  - [ ] POST /disciplines/{id}/image → upload imagem
  - [ ] GET teachers/students → joinedload retorna user data
  - [ ] DELETE teacher/student assignment
- [ ] Task 4: Validar Courses (AC: 5)
  - [ ] CRUD courses com paginação (offset/limit, header x-total-count)
  - [ ] GET /courses?discipline_id=X → filtro por discipline
  - [ ] GET /courses/{id}/export → export hierárquico (course → chapters → contents → questions)
  - [ ] POST /courses/{id}/image → upload imagem curso → Azure Blob Storage
- [ ] Task 5: Validar Classes (AC: 6)
  - [ ] POST /classes/{class_id}/courses → create course in class
  - [ ] GET /classes/{class_id}/courses → list courses
  - [ ] GET /classes/{class_id}/stats → class stats
- [ ] Task 6: Validar Chapters (AC: 7)
  - [ ] CRUD chapters com ordenação por `order` field
- [ ] Task 7: Validar Contents (AC: 8)
  - [ ] CRUD contents
  - [ ] POST /chapters/{id}/upload → upload PDF → Azure Blob Storage → text extraction
  - [ ] POST /upload → upload genérico
  - [ ] POST /upload/video → upload vídeo
  - [ ] POST /upload/audio → upload áudio
- [ ] Task 8: Validar Questions (AC: 9)
  - [ ] POST /contents/{id}/questions → gerar questions via AI
  - [ ] Bulk insert funcional
  - [ ] PUT /contents/{id}/questions/batch → batch replace
  - [ ] Status transitions (active → replacing)
  - [ ] DELETE by status
- [ ] Task 9: Validar Chat Socrático (AC: 10)
  - [ ] POST /chat-sessions → criar session
  - [ ] POST /chat-sessions/{id}/messages → enviar mensagem → AI responde
  - [ ] total_messages incrementa (SP call)
  - [ ] GET /users/{id}/chat-sessions → joinedload (content → chapter → course)
  - [ ] POST /chat-sessions/{id}/export-moodle → export xAPI
- [ ] Task 10: Validar Notifications (AC: 11)
  - [ ] POST /notifications → criar
  - [ ] GET /notifications/{user_id} → listar por user
  - [ ] GET /notifications/{user_id}/count → unread count
  - [ ] PUT /notifications/{id}/read → mark as read
  - [ ] PUT /notifications/{user_id}/read-all → mark all read
  - [ ] DELETE /notifications/{id} → deletar
- [ ] Task 11: Validar Admin Settings (AC: 12)
  - [ ] GET/POST /admin/settings → singleton pattern
  - [ ] GET /settings/public → sem auth
  - [ ] POST /admin/settings/upload-logo → upload logo
  - [ ] POST /admin/settings/upload-login-logo → upload login logo
  - [ ] POST /admin/settings/upload-login-bg → upload background
  - [ ] URLs retornadas com `harvenstorage.blob.core.windows.net`
- [ ] Task 12: Validar Admin Logs (AC: 13)
  - [ ] GET /admin/logs → listar logs
  - [ ] GET /admin/logs/search → search com filtros
  - [ ] GET /admin/logs/export → export JSON/CSV
- [ ] Task 13: Validar Admin Backups (AC: 14)
  - [ ] POST /admin/backups → criar backup
  - [ ] GET /admin/backups/{id}/download → signed URL com SAS token
  - [ ] DELETE /admin/backups/{id} → deletar backup
- [ ] Task 14: Validar Admin Stats/Monitoring (AC: 15)
  - [ ] GET /admin/stats → dashboard com contagens corretas
  - [ ] GET /admin/performance → métricas de sistema
  - [ ] GET /admin/storage → storage stats
- [ ] Task 15: Validar Admin Actions (AC: 16)
  - [ ] POST /admin/actions → anúncios
  - [ ] POST /admin/force-logout → invalidar sessões
  - [ ] POST /admin/clear-cache → limpar cache
- [ ] Task 16: Validar Gamification (AC: 17)
  - [ ] POST /users/{id}/activities → registrar activity
  - [ ] GET /users/{id}/stats → get/update stats
  - [ ] POST /users/{id}/achievements/{aid}/unlock → unlock achievement
  - [ ] GET/POST /users/{id}/certificates → certificates
  - [ ] POST /users/{id}/courses/{cid}/complete-content/{ctid} → course progress + completion
- [ ] Task 17: Validar Dashboard (AC: 18)
  - [ ] GET /dashboard/stats → courses count, hours, score do student
- [ ] Task 18: Validar Search (AC: 19)
  - [ ] GET /search?q=termo → busca global cross-table retorna resultados
- [ ] Task 19: Validar AI Services (AC: 20)
  - [ ] GET /api/ai/status → status check
  - [ ] POST /api/ai/socrates/dialogue → Socratic dialogue funcional
  - [ ] POST /api/ai/creator/generate → question generation
  - [ ] GET /api/ai/estimate-cost → cost estimation
  - [ ] Verificar token_usage tracking no DB
- [ ] Task 20: Validar TTS (AC: 21)
  - [ ] GET /api/ai/tts/voices → voice list
  - [ ] POST /api/ai/tts/generate → audio generation
  - [ ] Verificar áudio salvo em Blob Storage
- [ ] Task 21: Validar Integrations (AC: 22)
  - [ ] POST /integrations/test-connection → test connection
  - [ ] GET /integrations/lookup-student/{ra} → JACAD lookup
  - [ ] POST /integrations/moodle/webhook → Moodle webhook
- [ ] Task 22: Validar Infra (AC: 23, 24, 25)
  - [ ] Rate limiting: enviar >100 requests/min → 429
  - [ ] Health checks: GET /, /health, /test-db → HTTP 200 em ambos containers
  - [ ] CORS: frontend em URL diferente acessa backend sem erros de cross-origin

---

## Dev Notes

**Endpoints base:**
- Backend: `https://harven-backend.REGION.azurecontainerapps.io`
- Frontend: `https://harven-frontend.REGION.azurecontainerapps.io`

**Login para obter JWT:**
```bash
curl -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"ra": "admin", "password": "admin_password"}'
# Response: {"access_token": "eyJ...", "user": {...}}
```

**Padrão de teste para cada rota:**
```bash
# Com autenticação
curl -X GET $BACKEND_URL/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Setup de dados de teste (pré-requisito):**
1. Executar `sql/seed.sql` — garante admin user + system_settings
2. Criar instructor via `POST /users` com role=INSTRUCTOR
3. Criar student via `POST /users` com role=STUDENT
4. Criar discipline via `POST /disciplines`
5. Assign teacher e student à discipline
6. Criar course → chapter → content → questions (pipeline completo)

**Checklist de validação Azure:**
- URLs de Blob Storage retornadas contêm `harvenstorage.blob.core.windows.net`
- Responses JSON mantêm mesma estrutura que versão Supabase
- Paginação retorna `total` count correto e header `x-total-count`
- Signed URLs para backups funcionam (download com SAS token)

**Estruturas de response esperadas:**
```json
// Lista com paginação
{"data": [...], "total": N}
// Headers: x-total-count: N

// Single item
{"data": {...}}

// Login response
{"access_token": "eyJ...", "user": {"id": "...", "ra": "...", "role": "INSTRUCTOR", ...}}

// Health check
{"status": "ok", "database": "connected"}

// Error
{"detail": "Error message"}
```

### Testing

- Cada AC é um teste individual — documentar resultado (Pass/Fail)
- Seguir ordem de setup: Auth → Users → Disciplines → Courses → ... (dados dependem uns dos outros)
- Para falhas: criar bug ticket referenciando AC number e notificar @dev
- Re-testar após fix
- Usar curl ou Postman collection com variáveis de ambiente

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Reescrita completa Tasks: 10→22 tasks alinhadas com 25 ACs | River (SM) |

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
