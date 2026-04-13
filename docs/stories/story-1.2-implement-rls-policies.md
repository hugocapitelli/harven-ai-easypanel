# Story 1.2 — Implement RLS Policies + Storage Security

**Epic:** EPIC-TD-001 (Resolucao de Debitos Tecnicos)
**Sprint:** 1
**Estimativa:** 24 horas
**Prioridade:** CRITICAL
**Assignee:** @data-engineer + @dev

---

## Objetivo

Implementar Row Level Security (RLS) no Supabase para todas as tabelas e buckets, impedindo acesso direto nao-autorizado via anon key.

## Tasks

- [ ] **T1: Mover API keys do system_settings para env vars** (4h)
  - Remover colunas: openai_key, moodle_token, jacad_api_key, smtp_password, moodle_webhook_secret
  - Criar migration SQL para remover colunas
  - Atualizar backend para ler de env vars
  - Atualizar GET /admin/settings para nao retornar essas colunas
  - Atualizar POST /admin/settings para ignorar esses campos

- [ ] **T2: Criar indexes de alta prioridade** (4h)
  - Migration SQL:
    ```sql
    CREATE INDEX idx_users_ra ON users(ra);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_courses_discipline_id ON courses(discipline_id);
    CREATE INDEX idx_chapters_course_id ON chapters(course_id);
    CREATE INDEX idx_contents_chapter_id ON contents(chapter_id);
    CREATE INDEX idx_questions_content_id ON questions(content_id);
    CREATE INDEX idx_discipline_teachers_teacher ON discipline_teachers(teacher_id);
    CREATE INDEX idx_discipline_teachers_discipline ON discipline_teachers(discipline_id);
    CREATE INDEX idx_discipline_students_student ON discipline_students(student_id);
    CREATE INDEX idx_discipline_students_discipline ON discipline_students(discipline_id);
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
    CREATE INDEX idx_chat_sessions_user_content ON chat_sessions(user_id, content_id);
    CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
    CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);
    CREATE INDEX idx_user_activities_user ON user_activities(user_id, action);
    ```

- [ ] **T3: Enable RLS em todas as tabelas** (4h)
  - Migration SQL:
    ```sql
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
    -- ... todas as 22 tabelas
    ```
  - Configurar service key no backend (bypass RLS)
  - Manter anon key no frontend (com RLS)

- [ ] **T4: RLS policies — tabelas criticas** (8h)
  - `users`: SELECT own data, admin SELECT all
  - `system_settings`: SELECT public fields (no auth), UPDATE admin only
  - `courses`: SELECT if enrolled or instructor, INSERT/UPDATE instructor+admin
  - `contents`: SELECT if enrolled, INSERT/UPDATE instructor+admin
  - `disciplines`: SELECT if enrolled/teaching, INSERT/UPDATE admin
  - `chat_sessions`: SELECT/INSERT own sessions only
  - `chat_messages`: SELECT/INSERT own session messages only
  - `notifications`: SELECT/UPDATE own notifications only
  - Junction tables: SELECT if participant

- [ ] **T5: Storage RLS** (4h)
  - Bucket `courses`: READ if enrolled, WRITE if instructor+admin
  - Bucket `avatars`: READ all, WRITE own avatar only
  - Bucket `system`: READ all, WRITE admin only

## Criterios de Aceite

- [ ] Anon key nao consegue ler users.password via REST API direto
- [ ] Anon key nao consegue ler system_settings.openai_key (coluna removida)
- [ ] Anon key nao consegue inserir/atualizar dados em nenhuma tabela
- [ ] Backend (service key) continua funcionando normalmente
- [ ] Indexes criados e EXPLAIN ANALYZE mostra uso em queries de login
- [ ] Storage buckets com RLS ativo

## Definition of Done

- [ ] Migration SQL versionada em supabase/migrations/
- [ ] RLS testado com anon key via curl/Postman
- [ ] Backend testado com service key (nenhuma regressao)
- [ ] Indexes verificados com EXPLAIN ANALYZE
- [ ] Storage RLS testado

## Arquivos Impactados

- `supabase/migrations/` (novos arquivos SQL)
- `backend/main.py` (remover colunas sensíveis)
- `backend/.env.example` (atualizar)

---

*Story criada pelo workflow Brownfield Discovery*
