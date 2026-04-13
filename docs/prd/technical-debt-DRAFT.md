# Technical Debt Assessment - DRAFT

**Data:** 2026-02-25
**Fase:** Brownfield Discovery — FASE 4 (Consolidação Inicial)
**Status:** PARA REVISÃO DOS ESPECIALISTAS
**Projeto:** Harven.AI Platform

---

## Executive Summary

O Harven.AI acumulou **83 débitos técnicos** identificados em 3 análises independentes (Sistema, Database, Frontend/UX). A plataforma é funcional mas possui vulnerabilidades de segurança críticas, gaps de acessibilidade, e problemas de arquitetura que impedem escalabilidade e compliance.

| Severidade | Sistema | Database | Frontend/UX | **Total** |
|------------|---------|----------|-------------|-----------|
| CRÍTICO | 5 | 4 | 7 | **16** |
| ALTO | 8 | 8 | 7 | **23** |
| MÉDIO | 10 | 10 | 8 | **28** |
| BAIXO | 5 | 5 | 5 | **15** |
| **Total** | **28** | **27** | **27** | **82** |

> **Nota:** Alguns débitos são cross-cutting (aparecem em mais de uma análise). Após de-duplicação, estimamos ~60 débitos únicos.

---

## 1. Débitos de Sistema

*Fonte: `docs/architecture/system-architecture.md`*

### CRÍTICOS

| ID | Débito | Impacto |
|----|--------|---------|
| SYS-C1 | JWT secret hardcoded como fallback | Comprometimento de tokens |
| SYS-C2 | CORS wildcard em methods/headers | Risco CSRF |
| SYS-C3 | Fallback plaintext password no login | Timing attacks |
| SYS-C4 | Backend monolítico (4.779 linhas, 81 rotas) | Manutenibilidade |
| SYS-C5 | Zero testes automatizados | Regressões invisíveis |

### ALTOS

| ID | Débito | Impacto |
|----|--------|---------|
| SYS-H1 | Rate limiting ausente na maioria dos endpoints | Brute force/DoS |
| SYS-H2 | Sem revogação/blacklist de JWT | Tokens válidos após logout |
| SYS-H3 | Sem refresh token (token único 8h) | Janela de comprometimento |
| SYS-H4 | .env.production no repositório | Exposição de credenciais |
| SYS-H5 | sessionStorage + localStorage misturados | Dados desincronizados |
| SYS-H6 | DB não valida conexão no startup | Falha silenciosa |
| SYS-H7 | Sem validação de tamanho global de request | DDoS |
| SYS-H8 | Webhook Moodle sem secret obrigatório | Aceita qualquer POST |

### MÉDIOS

| ID | Débito | Impacto |
|----|--------|---------|
| SYS-M1 | Sem endpoint de reset/troca de senha | Usabilidade |
| SYS-M2 | Sem structured logging (JSON) | Monitoramento |
| SYS-M3 | Uvicorn single-threaded em prod | Performance |
| SYS-M4 | Código duplicado (pagination, errors) | Manutenibilidade |
| SYS-M5 | Sem loading skeleton pattern | UX inconsistente |
| SYS-M6 | Dependências sem versão máxima | Breaking changes |
| SYS-M7 | Admin operations sem audit logging | Rastreabilidade |
| SYS-M8 | Masking de dados sensíveis inconsistente | Exposição de dados |
| SYS-M9 | File upload sanitization fraca | Path traversal |
| SYS-M10 | Sem caching layer | Performance |

⚠️ PENDENTE: Revisão do @data-engineer para SYS-H6, SYS-M10
⚠️ PENDENTE: Revisão do @ux-design-expert para SYS-M5

---

## 2. Débitos de Database

*Fonte: `supabase/docs/DB-AUDIT.md`*

### CRÍTICOS

| ID | Débito | Impacto |
|----|--------|---------|
| DB-C1 | Zero RLS policies no Supabase | Acesso direto irrestrito |
| DB-C2 | API keys em plaintext no system_settings | Exposição de secrets |
| DB-C3 | Sem foreign key constraints | Integridade referencial |
| DB-C4 | Sem cascade deletes | Dados órfãos |

### ALTOS

| ID | Débito | Impacto |
|----|--------|---------|
| DB-H1 | Legacy plaintext password fallback | Segurança auth |
| DB-H2 | JWT com hardcoded secret fallback | Auth bypass |
| DB-H3 | N+1 queries (stats=7, achievements=9) | Performance |
| DB-H4 | Zero indexes em colunas de alta cardinalidade | Full table scans |
| DB-H5 | Sem unique constraints em junction tables | Duplicatas |
| DB-H6 | Sem transaction support | Estado inconsistente |
| DB-H7 | Zero migration files | Não-reprodutível |
| DB-H8 | ID strategy inconsistente (UUID vs text) | FK impossível |

### MÉDIOS

| ID | Débito | Impacto |
|----|--------|---------|
| DB-M1 | Duplicate Pydantic models (DisciplineCreate) | Dados inconsistentes |
| DB-M2 | Dados denormalizados sem sync | Dados stale |
| DB-M3 | Tabelas opcionais (try/except com pass) | Schema incerto |
| DB-M4 | Sem pagination na maioria dos endpoints | Performance |
| DB-M5 | Queries redundantes (mesmos dados 2x) | Performance |
| DB-M6 | Manual joins ao invés de Supabase relations | Performance |
| DB-M7 | Orphan data risk em deletes | Integridade |
| DB-M8 | Race condition em chat counter | Contagem incorreta |
| DB-M9 | `"now()"` string ao invés de server timestamp | Timestamps frágeis |
| DB-M10 | Debug logging expondo dados sensíveis | Segurança |

⚠️ PENDENTE: Revisão do @data-engineer
- Validar severidade dos items DB-C1 a DB-C4
- Estimar horas para cada correção
- Confirmar priorização de indexes vs FK

---

## 3. Débitos de Frontend/UX

*Fonte: `docs/frontend/frontend-spec.md`*

### CRÍTICOS

| ID | Débito | Impacto |
|----|--------|---------|
| UX-C1 | ChapterReader TOC overlay em mobile | Feature core inutilizável |
| UX-C2 | Sidebar sem responsividade mobile | App inutilizável |
| UX-C3 | Search escondido em mobile sem alternativa | Feature inacessível |
| UX-C4 | Tabs sem ARIA roles (tablist, tab) | Violação WCAG |
| UX-C5 | Dialog sem focus trap | Violação WCAG |
| UX-C6 | Contrast ratio falha em muted/gold text | Violação WCAG AA |
| UX-C7 | Botões dead-end (Retomar, Portal, Primeiro acesso) | Dead-end UX |

### ALTOS

| ID | Débito | Impacto |
|----|--------|---------|
| UX-H1 | Sem skeleton loaders | Content jump |
| UX-H2 | Tratamento de erro inconsistente | Confusão |
| UX-H3 | Sem componente Modal reutilizável | Inconsistência |
| UX-H4 | Sem confirmação para ações destrutivas | Perda de dados |
| UX-H5 | Settings save flow confuso | Configurações perdidas |
| UX-H6 | ChapterReader sem breadcrumb | Desorientação |
| UX-H7 | Dark mode incompleto | Experiência inconsistente |

### MÉDIOS

| ID | Débito | Impacto |
|----|--------|---------|
| UX-M1 | Input validation sem feedback real-time | Forms UX |
| UX-M2 | Sem progress indicator para ops longas | Incerteza |
| UX-M3 | Chat messages sem formatação | Legibilidade |
| UX-M4 | MAX_INTERACTIONS hardcoded (3) | Inflexibilidade |
| UX-M5 | Sem aria-live para conteúdo dinâmico | Screen reader |
| UX-M6 | Editing mode não-óbvio para instrutores | Discoverability |
| UX-M7 | TTS não integrado ao conteúdo | UX fragmentada |
| UX-M8 | Tabs com affordance baixa (bg-transparent) | Design |

⚠️ PENDENTE: Revisão do @ux-design-expert
- Confirmar severidade dos items UX-C1 a UX-C7
- Validar se mobile é target obrigatório
- Estimar horas para componentes ausentes

---

## 4. Matriz Preliminar de Priorização

### Prioridade 1 — Segurança (BLOQUEANTE para produção)

| ID | Débito | Esforço Est. | ROI |
|----|--------|-------------|-----|
| SYS-C1 | JWT secret hardcoded | 0.5 dia | Altíssimo |
| SYS-C2 | CORS wildcard | 0.5 dia | Altíssimo |
| SYS-C3 | Plaintext password fallback | 1 dia | Altíssimo |
| DB-C1 | RLS policies | 3 dias | Altíssimo |
| DB-C2 | API keys em DB | 1 dia | Altíssimo |
| SYS-H4 | .env.production no repo | 0.5 dia | Alto |
| DB-H1 | Plaintext fallback | 1 dia | Alto |
| DB-H2 | JWT hardcoded secret | 0.5 dia | Alto |
| SYS-H8 | Webhook sem secret | 0.5 dia | Alto |

**Subtotal: ~9 dias**

### Prioridade 2 — Integridade de Dados

| ID | Débito | Esforço Est. | ROI |
|----|--------|-------------|-----|
| DB-C3 | Foreign keys | 2 dias | Alto |
| DB-C4 | Cascade deletes | 1 dia | Alto |
| DB-H5 | Unique constraints | 0.5 dia | Alto |
| DB-H7 | Baseline migration | 1 dia | Alto |
| DB-H8 | Standardize IDs | 2 dias | Médio |

**Subtotal: ~7 dias**

### Prioridade 3 — UX/Acessibilidade

| ID | Débito | Esforço Est. | ROI |
|----|--------|-------------|-----|
| UX-C2 | Sidebar responsiva | 3 dias | Alto |
| UX-C1 | ChapterReader TOC mobile | 2 dias | Alto |
| UX-C3 | Search mobile | 1 dia | Alto |
| UX-C4 | Tabs ARIA | 1 dia | Alto |
| UX-C5 | Dialog focus trap | 1 dia | Alto |
| UX-C6 | Contrast fixes | 0.5 dia | Alto |
| UX-C7 | Dead-end buttons | 1 dia | Médio |

**Subtotal: ~10 dias**

### Prioridade 4 — Performance

| ID | Débito | Esforço Est. | ROI |
|----|--------|-------------|-----|
| DB-H3 | Fix N+1 queries | 3 dias | Alto |
| DB-H4 | Create indexes | 1 dia | Altíssimo |
| DB-M4 | Add pagination | 2 dias | Alto |
| DB-M6 | Use Supabase relations | 2 dias | Médio |
| SYS-M3 | Uvicorn workers | 0.5 dia | Alto |

**Subtotal: ~9 dias**

### Prioridade 5 — Arquitetura

| ID | Débito | Esforço Est. | ROI |
|----|--------|-------------|-----|
| SYS-C4 | Refactor main.py | 5 dias | Alto |
| SYS-C5 | Add test suite | 5 dias | Alto |
| UX-H3 | Modal component | 1 dia | Médio |
| UX-H1 | Skeleton loaders | 2 dias | Médio |

**Subtotal: ~13 dias**

---

## 5. Cross-Cutting Concerns

### Débitos que aparecem em múltiplas análises:

| Tema | IDs Relacionados | Área |
|------|-----------------|------|
| JWT Secret | SYS-C1, DB-H2 | Security |
| Plaintext Password | SYS-C3, DB-H1 | Security |
| Loading States | SYS-M5, UX-H1 | UX |
| Error Handling | UX-H2, SYS-M4 | UX/Code |
| Mobile Navigation | UX-C1, UX-C2, UX-C3 | Responsividade |
| CORS | SYS-C2, DB-M10 (CORS + debug) | Security |
| Performance | DB-H3, DB-H4, DB-M4, SYS-M10 | Backend |

---

## 6. Perguntas para Especialistas

### Para @data-engineer:
1. Qual é a prioridade real dos indexes vs FK constraints? O que impacta mais a performance imediata?
2. É viável implementar RLS policies incrementalmente (tabela por tabela) ou precisa ser tudo de uma vez?
3. A migração de IDs (text→UUID) em disciplines pode ser feita sem downtime?
4. Race condition no chat counter: vale a pena criar uma Postgres function para atomic increment?
5. Supabase Edge Functions podem ajudar com audit logging?

### Para @ux-design-expert:
1. Mobile é target obrigatório para o MVP ou pode ser faseado?
2. A navegação por sidebar é a melhor pattern para mobile ou devemos considerar bottom tabs?
3. Para o ChapterReader, drawer lateral ou accordion seria melhor que TOC fixa?
4. O design system precisa de Storybook ou documentação inline basta?
5. Dark mode: completar ou remover temporariamente para reduzir scope?

---

## 7. Estimativa Total

| Prioridade | Escopo | Esforço |
|------------|--------|---------|
| P1 — Segurança | 9 items | ~9 dias |
| P2 — Integridade | 5 items | ~7 dias |
| P3 — UX/A11y | 7 items | ~10 dias |
| P4 — Performance | 5 items | ~9 dias |
| P5 — Arquitetura | 4 items | ~13 dias |
| **TOTAL** | **30 items prioritários** | **~48 dias** |

> Médios e baixos adicionais: ~20 dias extras
> **Grande total: ~68 dias (~340 horas)**

---

*DRAFT para revisão dos especialistas*
*Próximo: FASES 5-7 (Validação)*
