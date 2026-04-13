# Database Specialist Review

**Data:** 2026-02-25
**Fase:** Brownfield Discovery — FASE 5 (Validação Database)
**Agente:** @data-engineer
**Input:** `docs/prd/technical-debt-DRAFT.md`

---

## 1. Débitos Validados

| ID | Débito | Severidade Original | Severidade Validada | Horas | Prioridade | Notas |
|----|--------|---------------------|---------------------|-------|------------|-------|
| DB-C1 | Zero RLS policies | CRÍTICO | **CRÍTICO** | 24h | P1 | Anon key exposta no frontend. Supabase REST API acessível sem restrição. Deve ser prioridade #1. |
| DB-C2 | API keys em system_settings | CRÍTICO | **CRÍTICO** | 4h | P1 | Mover para env vars. Criar migration para remover colunas sensíveis. |
| DB-C3 | Sem foreign key constraints | CRÍTICO | **ALTO** ↓ | 16h | P2 | Impacto real é menor que RLS. FK sem RLS é inútil. Fazer após RLS. |
| DB-C4 | Sem cascade deletes | CRÍTICO | **ALTO** ↓ | 8h | P2 | Depende de FK (DB-C3). Implementar junto. |
| DB-H1 | Plaintext password fallback | ALTO | **ALTO** | 4h | P1 | Remover fallback, forçar reset para senhas legadas. |
| DB-H2 | JWT hardcoded secret | ALTO | **CRÍTICO** ↑ | 2h | P1 | Pior que indicado. Se secret vaza, TODOS tokens são forjáveis. Fail startup if missing. |
| DB-H3 | N+1 queries | ALTO | **ALTO** | 24h | P3 | Stats endpoint (7 queries) é o mais impactante. Criar view materializada ou stored procedure. |
| DB-H4 | Zero indexes | ALTO | **CRÍTICO** ↑ | 4h | P1 | Full table scan em login (users.ra). Cada login faz scan completo. Quick win com ROI altíssimo. |
| DB-H5 | Sem unique constraints | ALTO | **ALTO** | 2h | P2 | Pode criar duplicatas silenciosamente. Quick fix. |
| DB-H6 | Sem transactions | ALTO | **ALTO** | 8h | P3 | Supabase-py não suporta transactions nativamente. Usar RPC functions em PostgreSQL. |
| DB-H7 | Zero migrations | ALTO | **ALTO** | 8h | P2 | Criar baseline dump via `supabase db dump`. Setup Supabase CLI. |
| DB-H8 | ID inconsistente | ALTO | **MÉDIO** ↓ | 16h | P4 | Grande esforço, impacto limitado no curto prazo. Fazer quando refatorar. |
| DB-M1 | Duplicate Pydantic models | MÉDIO | **MÉDIO** | 2h | P4 | Confirmo: 2 DisciplineCreate com campos diferentes. |
| DB-M2 | Dados denormalizados | MÉDIO | **MÉDIO** | 8h | P4 | Criar triggers ou remover denormalizações não-necessárias. |
| DB-M3 | Tabelas opcionais | MÉDIO | **MÉDIO** | 4h | P3 | Verificar quais tabelas existem de fato no Supabase dashboard. |
| DB-M4 | Sem pagination | MÉDIO | **ALTO** ↑ | 12h | P3 | Com dados crescendo, vai gerar timeouts. Endpoints de listagem são os mais usados. |
| DB-M5 | Queries redundantes | MÉDIO | **MÉDIO** | 4h | P3 | Resolver junto com N+1 (DB-H3). |
| DB-M6 | Manual joins | MÉDIO | **MÉDIO** | 8h | P3 | PostgREST suporta `select("*, related(*)")`. Migrar incrementalmente. |
| DB-M7 | Orphan data risk | MÉDIO | **ALTO** ↑ | 4h | P2 | Sem FK + sem cascade = dados órfãos já existem provavelmente. Precisa cleanup. |
| DB-M8 | Race condition chat | MÉDIO | **MÉDIO** | 2h | P3 | Criar RPC function: `increment_message_count(session_id)`. |
| DB-M9 | "now()" string | MÉDIO | **BAIXO** ↓ | 2h | P4 | PostgREST interpreta corretamente, mas melhor usar `DEFAULT now()`. |
| DB-M10 | Debug logging | MÉDIO | **ALTO** ↑ | 4h | P1 | Exposição de senhas em logs é grave. Remover TODOS os print() de debug. |

---

## 2. Débitos Adicionados

| ID | Débito | Severidade | Horas | Prioridade | Notas |
|----|--------|-----------|-------|------------|-------|
| DB-NEW1 | Supabase storage RLS ausente | CRÍTICO | 8h | P1 | Buckets "courses" e "avatars" são públicos sem restrição. Qualquer um pode upload/download. |
| DB-NEW2 | Sem backup automatizado do DB | ALTO | 4h | P2 | Supabase tem backups, mas não há verificação/download automático pelo app. |
| DB-NEW3 | Connection pooling não configurado | MÉDIO | 4h | P3 | Single Supabase client pode bottleneck com concorrência. Usar pgBouncer/Supavisor. |
| DB-NEW4 | Sem health check do DB no app | MÉDIO | 2h | P3 | GET /health não verifica de fato a conexão com DB de forma confiável. |
| DB-NEW5 | Sem data retention policy | BAIXO | 4h | P4 | system_logs, user_activities crescem indefinidamente. |

---

## 3. Respostas ao Architect

### Q1: Prioridade indexes vs FK?
**Resposta:** Indexes PRIMEIRO. Impacto imediato em performance:
- `users.ra` — cada login hoje faz full scan
- `courses.discipline_id` — listagem de cursos por turma
- `chapters.course_id` + `contents.chapter_id` — carregamento de conteúdo

FK constraints são importantes mas sem indexes a performance cai primeiro. **Criar indexes é 4 horas e resolve 80% dos problemas de performance**.

### Q2: RLS incremental?
**Resposta:** SIM. Implementar por tabela, começando pelas mais críticas:
1. `users` — proteger dados pessoais
2. `system_settings` — proteger API keys
3. `courses`, `contents` — proteger conteúdo
4. Junction tables — proteger enrollment
5. Restante incrementalmente

### Q3: Migração text→UUID sem downtime?
**Resposta:** É complexo mas possível:
1. Adicionar coluna `uuid_id` em `disciplines`
2. Backfill UUIDs
3. Atualizar FKs para apontar para nova coluna
4. Swap PK
5. **Recomendo ADIAR para P4** — esforço alto, risco médio

### Q4: Postgres function para chat counter?
**Resposta:** SIM. Quick win:
```sql
CREATE FUNCTION increment_message_count(p_session_id UUID)
RETURNS void AS $$
  UPDATE chat_sessions
  SET total_messages = total_messages + 1
  WHERE id = p_session_id;
$$ LANGUAGE SQL;
```

### Q5: Edge Functions para audit?
**Resposta:** Supabase Edge Functions (Deno) podem ajudar para:
- Audit logging assíncrono
- Webhook processing
- Mas para audit de DB operations, melhor usar **Postgres triggers** (mais confiável, sem latência de rede)

---

## 4. Recomendações — Ordem de Resolução

### Sprint 1: Quick Wins + Security (1 semana)
1. ✅ Criar indexes (4h) — ROI imediato
2. ✅ Remover JWT secret fallback (2h) — segurança
3. ✅ Remover debug print() (4h) — segurança
4. ✅ Mover API keys para env vars (4h) — segurança
5. ✅ Remover plaintext password fallback (4h) — segurança

### Sprint 2: RLS + Integrity (1 semana)
1. ✅ RLS policies em users + system_settings (8h)
2. ✅ RLS policies em courses + contents (8h)
3. ✅ Unique constraints em junction tables (2h)
4. ✅ Baseline migration dump (8h)
5. ✅ Storage bucket RLS (8h)

### Sprint 3: FK + Performance (1 semana)
1. ✅ Foreign key constraints (16h)
2. ✅ Cascade delete rules (8h)
3. ✅ Fix N+1 queries (stats + achievements) (12h)

### Sprint 4: Polish (1 semana)
1. ✅ Add pagination (12h)
2. ✅ Use Supabase relations (8h)
3. ✅ Atomic increment function (2h)
4. ✅ Data cleanup (orphans) (4h)

---

*@data-engineer — Validação concluída*
