# Technical Debt Assessment - FINAL

**Data:** 2026-02-25
**Fase:** Brownfield Discovery — FASE 8 (Assessment Final)
**Projeto:** Harven.AI Platform
**Validadores:** @architect, @data-engineer, @ux-design-expert, @qa

---

## Executive Summary

O Harven.AI possui **~65 débitos técnicos únicos** (após de-duplicação) distribuídos em 3 áreas: sistema/backend, database, e frontend/UX. A plataforma é funcional mas apresenta **vulnerabilidades de segurança críticas** que impedem deploy seguro em produção, além de gaps de acessibilidade e performance.

### Números Chave

| Métrica | Valor |
|---------|-------|
| Total de Débitos (únicos) | ~65 |
| Débitos Críticos | 8 |
| Débitos Altos | 22 |
| Débitos Médios | 22 |
| Débitos Baixos | 13 |
| Esforço Total Estimado | ~340 horas (~43 dias) |
| Esforço P1 (Segurança) | ~48 horas (~6 dias) |

### Severidade Consolidada (com inputs dos especialistas)

| ID | Débito | Severidade Final | Área | Horas |
|----|--------|------------------|------|-------|
| **DB-C1** | Zero RLS policies | **CRÍTICO** | Database | 24h |
| **DB-C2** | API keys em system_settings | **CRÍTICO** | Database | 4h |
| **SYS-C1** | JWT secret hardcoded fallback | **CRÍTICO** | Backend | 2h |
| **DB-H4→C** | Zero indexes (full scan em login) | **CRÍTICO** ↑ | Database | 4h |
| **SYS-H4** | .env.production no repositório | **CRÍTICO** ↑ | DevOps | 1h |
| **UX-C1** | ChapterReader TOC overlay mobile | **CRÍTICO** | Frontend | 16h |
| **UX-C2** | Sidebar sem responsividade mobile | **CRÍTICO** | Frontend | 20h |
| **DB-NEW1** | Storage bucket RLS ausente | **CRÍTICO** | Database | 8h |

---

## Inventário Completo de Débitos

### Sistema/Backend (validado por @architect)

#### CRÍTICOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| SYS-C1 | JWT secret hardcoded fallback | 2h | Fail startup if missing |
| SYS-C4 | Backend monolítico (4.779 linhas) | 40h | Refactor em módulos |
| SYS-C5 | Zero testes automatizados | 40h | Test suite base |

#### ALTOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| SYS-C2→H | CORS wildcard | 2h | Restringir methods/headers |
| SYS-C3→H | Plaintext password fallback | 4h | Remover fallback, forçar reset |
| SYS-H1 | Rate limiting ausente | 8h | Adicionar em todos endpoints |
| SYS-H2 | Sem revogação JWT | 16h | Implementar blacklist |
| SYS-H3 | Sem refresh token | 16h | Implementar flow |
| SYS-H4 | .env.production no repo | 1h | URGENTE: remover agora |
| SYS-H6 | DB não valida no startup | 2h | Fail if no connection |
| SYS-H7 | Sem request size limit | 2h | Add global middleware |
| SYS-H8 | Webhook sem secret | 2h | Make required |

#### MÉDIOS

| ID | Débito | Horas |
|----|--------|-------|
| SYS-M1 | Sem password reset | 8h |
| SYS-M2 | Sem structured logging | 8h |
| SYS-M3 | Uvicorn single-threaded | 2h |
| SYS-M4 | Código duplicado | 8h |
| SYS-M6 | Dependencies sem max version | 2h |
| SYS-M7 | Sem audit logging | 8h |
| SYS-M8 | Masking inconsistente | 4h |
| SYS-M9 | Upload sanitization fraca | 4h |
| SYS-M10 | Sem caching layer | 16h |

### Database (validado por @data-engineer)

#### CRÍTICOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| DB-C1 | Zero RLS policies | 24h | Prioridade #1 absoluta |
| DB-C2 | API keys em DB | 4h | Mover para env vars |
| DB-H4→C | Zero indexes | 4h | Quick win, ROI altíssimo |
| DB-NEW1 | Storage RLS ausente | 8h | Buckets abertos |

#### ALTOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| DB-C3→H | Sem FK constraints | 16h | Após RLS |
| DB-C4→H | Sem cascade deletes | 8h | Junto com FK |
| DB-H1 | Plaintext password fallback | 4h | Remover fallback |
| DB-H3 | N+1 queries | 24h | Stats (7), achievements (9) |
| DB-H5 | Sem unique constraints | 2h | Junction tables |
| DB-H6 | Sem transactions | 8h | RPC functions |
| DB-H7 | Zero migrations | 8h | Baseline dump |
| DB-M4→H | Sem pagination | 12h | Endpoints de listagem |
| DB-M7→H | Orphan data | 4h | Cleanup + FK |
| DB-M10→H | Debug logging sensível | 4h | Remover prints |

#### MÉDIOS

| ID | Débito | Horas |
|----|--------|-------|
| DB-H8→M | ID strategy inconsistente | 16h |
| DB-M1 | Duplicate Pydantic models | 2h |
| DB-M2 | Dados denormalizados | 8h |
| DB-M3 | Tabelas opcionais | 4h |
| DB-M5 | Queries redundantes | 4h |
| DB-M6 | Manual joins | 8h |
| DB-M8 | Race condition counter | 2h |
| DB-NEW3 | Connection pooling | 4h |
| DB-NEW4 | Health check DB | 2h |

### Frontend/UX (validado por @ux-design-expert)

#### CRÍTICOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| UX-C1 | ChapterReader TOC mobile | 16h | Drawer colapsável |
| UX-C2 | Sidebar não-responsiva | 20h | Hamburger + drawer + bottom tabs (student) |

#### ALTOS

| ID | Débito | Horas | Notas |
|----|--------|-------|-------|
| UX-C3→H | Search mobile | 6h | Search icon expandável |
| UX-C4→H | Tabs sem ARIA | 4h | Add roles + arrow keys |
| UX-C5→H | Dialog sem focus trap | 4h | useFocusTrap hook |
| UX-C6→H | Contrast ratio | 3h | Adjust muted + gold colors |
| UX-C7→H | Dead-end buttons | 6h | Implement or remove |
| UX-H1 | Sem skeleton loaders | 12h | Component base + apply |
| UX-H2 | Error handling inconsistente | 8h | Padronizar pattern |
| UX-H3 | Sem Modal component | 8h | Criar reutilizável |
| UX-H4 | Sem confirmação destrutiva | 4h | Usar ConfirmDialog |
| UX-H6 | Sem breadcrumb | 4h | Curso > Cap > Conteúdo |
| UX-M5→H | Sem aria-live | 4h | Chat + notifications |
| UX-NEW2 | Socratic Chat feedback | 8h | Typing indicator |

#### MÉDIOS

| ID | Débito | Horas |
|----|--------|-------|
| UX-H5→M | Settings save flow | 6h |
| UX-M1 | Input validation | 8h |
| UX-M2 | Progress indicator | 6h |
| UX-M3 | Chat formatting | 8h |
| UX-M6 | Editing mode | 4h |
| UX-M8 | Tabs affordance | 3h |
| UX-NEW1 | Onboarding | 12h |
| UX-NEW4 | 404/error page | 4h |

---

## Plano de Resolução

### Sprint 1: SEGURANÇA (1 semana — ~48h)

**Objetivo:** Eliminar todas as vulnerabilidades críticas de segurança.

| Ordem | ID | Task | Horas | Dep. |
|-------|-----|------|-------|------|
| 1 | SYS-H4 | Remover .env.production do git + rotate credentials | 3h | — |
| 2 | SYS-C1 | Remover JWT secret fallback | 2h | — |
| 3 | DB-M10→H | Remover debug logging sensível | 4h | — |
| 4 | DB-H4→C | Criar indexes (users.ra, etc.) | 4h | — |
| 5 | DB-C2 | Mover API keys para env vars | 4h | — |
| 6 | SYS-C2→H | Restringir CORS | 2h | — |
| 7 | SYS-C3→H | Remover plaintext password fallback | 4h | — |
| 8 | DB-C1 | RLS policies (users, system_settings) | 12h | 5 |
| 9 | DB-NEW1 | Storage bucket RLS | 8h | 8 |
| 10 | SYS-H8 | Webhook secret obrigatório | 2h | — |

### Sprint 2: INTEGRIDADE + UX CRÍTICO (1 semana — ~48h)

**Objetivo:** Integridade de dados + mobile usability.

| Ordem | ID | Task | Horas | Dep. |
|-------|-----|------|-------|------|
| 1 | DB-H7 | Baseline migration | 8h | — |
| 2 | DB-C3→H | FK constraints | 16h | 1 |
| 3 | DB-C4→H + DB-H5 | Cascade + unique constraints | 10h | 2 |
| 4 | UX-C2 | Sidebar responsiva (hamburger + drawer) | 20h | — |

### Sprint 3: MOBILE + PERFORMANCE (1 semana — ~48h)

| Ordem | ID | Task | Horas | Dep. |
|-------|-----|------|-------|------|
| 1 | UX-C1 | ChapterReader TOC mobile | 16h | — |
| 2 | DB-H3 | Fix N+1 queries | 16h | — |
| 3 | UX-H3 | Modal component | 8h | — |
| 4 | UX-H6 | Breadcrumb navigation | 4h | — |
| 5 | UX-C6→H | Contrast fixes | 3h | — |

### Sprint 4: ACCESSIBILITY + POLISH (1 semana — ~48h)

| Ordem | ID | Task | Horas | Dep. |
|-------|-----|------|-------|------|
| 1 | UX-C4→H | Tabs ARIA roles | 4h | — |
| 2 | UX-C5→H | Dialog focus trap | 4h | 3-S3 |
| 3 | UX-M5→H | aria-live regions | 4h | — |
| 4 | UX-H1 | Skeleton loaders | 12h | — |
| 5 | UX-H2 | Error handling pattern | 8h | — |
| 6 | UX-H4 | Confirmações destrutivas | 4h | 3-S3 |
| 7 | DB-M4→H | Pagination endpoints | 12h | — |

### Sprint 5+: ARQUITETURA (2 semanas — ~80h)

| ID | Task | Horas |
|----|------|-------|
| SYS-C4 | Refactor main.py em módulos | 40h |
| SYS-C5 | Test suite base | 40h |

---

## Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Anon key + sem RLS = DB aberto | ALTA | CRÍTICO | Sprint 1 prioridade |
| .env.production exposto | ALTA | CRÍTICO | Ação imediata (fora sprint) |
| JWT secret vazado | MÉDIA | CRÍTICO | Remover fallback sprint 1 |
| Mobile quebrado para students | ALTA | ALTO | Sprint 2-3 |
| Refactor sem testes = regressões | ALTA | ALTO | Testes antes de refactor |
| N+1 com dados crescendo | MÉDIA | ALTO | Sprint 3 (indexes mitigam) |

---

## Critérios de Sucesso

| Critério | Métrica | Target |
|----------|---------|--------|
| Vulnerabilidades críticas | Count | 0 |
| Lighthouse accessibility | Score | > 90 |
| Login latência | P95 | < 200ms |
| List endpoints latência | P95 | < 500ms |
| Mobile usability (Student) | All flows on 375px | Pass |
| Test coverage (Backend) | Line coverage | > 60% |
| RLS policies | Tables covered | 100% |
| FK constraints | Relations enforced | 100% |

---

## Gaps Conhecidos (do QA Review)

1. AI agents não auditados (prompt injection, cost optimization) — story separada
2. Integration service (932 linhas) review superficial — sprint de integrações
3. Estado real do Supabase dashboard não verificado — validar antes de implementar
4. Sem load testing data — adicionar após fixes de performance
5. Bundle size não analisado — adicionar vite-bundle-visualizer

---

*Assessment Final consolidado com inputs de todos os especialistas.*
*@architect — Orion (Orchestrator)*
