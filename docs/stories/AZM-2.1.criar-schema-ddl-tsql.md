# Story AZM-2.1: Criar Schema DDL T-SQL

> **Epic:** Epic 2 — Database Schema Azure SQL
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 5
> **Owner:** @dev (review: @architect)
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** criar o schema DDL completo em T-SQL para o Azure SQL Database,
**so that** todas as 20 tabelas existam com os tipos corretos, indexes e constraints para suportar a aplicação.

---

## Acceptance Criteria

1. [ ] Arquivo `sql/schema.sql` criado com DDL completo
2. [ ] 20 tabelas criadas: users, disciplines, discipline_teachers, discipline_students, courses, chapters, contents, questions, chat_sessions, chat_messages, system_settings, system_logs, system_backups, user_activities, user_stats, user_achievements, certificates, course_progress, notifications, token_usage
3. [ ] Todos os tipos mapeados: UUID→NVARCHAR(36), BOOLEAN→BIT, TEXT→NVARCHAR(MAX), TIMESTAMPTZ→DATETIME2, SERIAL→IDENTITY
4. [ ] 19 indexes de performance criados
5. [ ] Unique constraints: uq_discipline_teacher, uq_discipline_student, uq_users_ra, uq_user_course_progress, uq_user_usage_date
6. [ ] Stored Procedure `sp_increment_message_count` criada
7. [ ] Schema executado com sucesso no Azure SQL Database

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar diretório `sql/` e arquivo `sql/schema.sql` (AC: 1)
- [ ] Task 2: Criar tabelas core (AC: 2, 3)
  - [ ] users (id NVARCHAR(36) DEFAULT NEWID(), ra, name, email, role, avatar_url, title, bio, password_hash, created_at DATETIME2 DEFAULT GETUTCDATE(), updated_at)
  - [ ] disciplines (id, name, description NVARCHAR(MAX), image_url, created_at, updated_at)
  - [ ] discipline_teachers (junction: discipline_id FK, teacher_id FK, uq_discipline_teacher)
  - [ ] discipline_students (junction: discipline_id FK, student_id FK, uq_discipline_student)
- [ ] Task 3: Criar tabelas educacionais (AC: 2, 3)
  - [ ] courses (discipline_id FK CASCADE, title, description, image_url, status DEFAULT 'draft')
  - [ ] chapters (course_id FK CASCADE, title, description, [order] INT — nota: "order" é keyword T-SQL, usar brackets)
  - [ ] contents (chapter_id FK CASCADE, title, type, file_url, text_content, text_url, audio_url, duration, [order])
  - [ ] questions (content_id FK CASCADE, question, answer, difficulty, status DEFAULT 'active', metadata NVARCHAR(MAX))
- [ ] Task 4: Criar tabelas chat (AC: 2, 3)
  - [ ] chat_sessions (user_id FK, content_id FK, status DEFAULT 'active', total_messages INT DEFAULT 0, performance_score FLOAT)
  - [ ] chat_messages (session_id FK CASCADE, role, content NVARCHAR(MAX), agent_type, metadata NVARCHAR(MAX))
- [ ] Task 5: Criar tabelas admin (AC: 2, 3)
  - [ ] system_settings (singleton: logo_url, login_logo_url, login_bg_url, platform_name, primary_color, ai_daily_token_limit INT DEFAULT 500000)
  - [ ] system_logs (msg NVARCHAR(MAX), author, status, type)
  - [ ] system_backups (name, size_mb FLOAT, status DEFAULT 'completed', records NVARCHAR(MAX), storage_path, type DEFAULT 'manual')
- [ ] Task 6: Criar tabelas gamification + notifications + token (AC: 2, 3)
  - [ ] user_activities (user_id FK, action, target_id, metadata NVARCHAR(MAX))
  - [ ] user_stats (user_id FK UNIQUE, total_points, current_streak, longest_streak, courses_completed, contents_completed)
  - [ ] user_achievements (user_id FK, achievement_type, metadata NVARCHAR(MAX), earned_at)
  - [ ] certificates (user_id FK, course_id FK, issued_at)
  - [ ] course_progress (user_id FK, course_id FK, completion_percentage FLOAT DEFAULT 0, last_accessed, uq_user_course_progress)
  - [ ] notifications (user_id FK, content NVARCHAR(MAX), [read] BIT DEFAULT 0 — nota: "read" é keyword T-SQL)
  - [ ] token_usage (user_id FK, tokens_used INT DEFAULT 0, usage_date DATE DEFAULT CAST(GETUTCDATE() AS DATE), uq_user_usage_date)
- [ ] Task 7: Criar indexes (AC: 4)
  - [ ] Auth: idx_users_ra, idx_users_role
  - [ ] Content: idx_courses_discipline_id, idx_chapters_course_id, idx_chapters_order, idx_contents_chapter_id, idx_contents_order, idx_questions_content_id, idx_questions_status
  - [ ] Junction: idx_dt_teacher, idx_dt_discipline, idx_ds_student, idx_ds_discipline
  - [ ] Chat: idx_cs_user_content, idx_cm_session
  - [ ] Admin: idx_system_logs_created (DESC), idx_user_activities_user
  - [ ] Notifications: idx_notifications_user_read
  - [ ] Token: idx_token_usage_user_date
- [ ] Task 8: Criar Stored Procedure (AC: 6)
  - [ ] `sp_increment_message_count(@session_id NVARCHAR(36))` — UPDATE chat_sessions SET total_messages = ISNULL(total_messages, 0) + 1 WHERE id = @session_id
- [ ] Task 9: Executar schema no Azure SQL (AC: 7)
  - [ ] Conectar via `sqlcmd` ou Azure Data Studio
  - [ ] Executar `sql/schema.sql`
  - [ ] Validar criação de todas as tabelas

---

## Dev Notes

**Mapeamento de tipos PostgreSQL → T-SQL (completo):**

| PostgreSQL | T-SQL | Nota |
|---|---|---|
| `UUID DEFAULT gen_random_uuid()` | `NVARCHAR(36) DEFAULT NEWID()` | UUID como string |
| `SERIAL` | `INT IDENTITY(1,1)` | Auto-increment |
| `BOOLEAN DEFAULT false` | `BIT DEFAULT 0` | 0/1 |
| `TEXT` | `NVARCHAR(MAX)` | Suporte Unicode |
| `VARCHAR(n)` | `NVARCHAR(n)` | Unicode |
| `TIMESTAMPTZ DEFAULT NOW()` | `DATETIME2 DEFAULT GETUTCDATE()` | UTC |
| `JSONB` | `NVARCHAR(MAX)` | Usar JSON_VALUE() para queries |
| `INTEGER` | `INT` | Direto |
| `REAL` | `FLOAT` | Direto |

**Keywords T-SQL que precisam de brackets:**
- `[order]` — "ORDER" é keyword
- `[read]` — "READ" é keyword

**Foreign Keys com CASCADE:** discipline_teachers, discipline_students, courses, chapters, contents, questions, chat_messages usam ON DELETE CASCADE.

**chat_sessions NÃO usa CASCADE** no FK de users e contents (para preservar histórico).

**DDL completo está na arquitetura doc seção 3.2** — copiar e validar cada tabela.

### Testing

- Executar schema em Azure SQL e validar zero erros
- Verificar contagem de tabelas: `SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'` = 20
- Verificar contagem de indexes
- Validar SP: `EXEC sp_increment_message_count @session_id = 'test-id'`

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
