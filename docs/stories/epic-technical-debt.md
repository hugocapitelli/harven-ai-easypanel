# Epic: Resolucao de Debitos Tecnicos — Harven.AI

**ID:** EPIC-TD-001
**Data:** 2026-02-25
**Owner:** Tech Lead
**Status:** PLANNED
**Fonte:** Brownfield Discovery Assessment

---

## Objetivo

Resolver os 65 debitos tecnicos identificados na auditoria Brownfield Discovery, tornando a plataforma Harven.AI segura para producao, acessivel em mobile, performatica, e mantenivel.

## Escopo

### Incluido
- 8 debitos criticos de seguranca
- 22 debitos altos (integridade, performance, UX)
- 22 debitos medios (architecture, polish)
- 13 debitos baixos (backlog)

### Excluido
- Audit de AI agents (epic separado)
- Novas features
- Redesign completo de UI
- Migracao de tecnologia

## Criterios de Sucesso

| Criterio | Metrica | Target |
|----------|---------|--------|
| Vulnerabilidades criticas | Count | 0 |
| RLS policies | Coverage | 100% tabelas |
| Lighthouse a11y | Score | > 90 |
| Login latencia | P95 | < 200ms |
| Mobile usability | Student flows on 375px | Pass |
| Test coverage | Backend critical paths | > 60% |

## Timeline

| Sprint | Foco | Duracao | Stories |
|--------|------|---------|---------|
| Sprint 1 | Seguranca | 1 semana | Story 1.1, 1.2 |
| Sprint 2 | Integridade + Mobile Core | 1 semana | Story 2.1, 2.2 |
| Sprint 3 | Performance + UX Mobile | 1 semana | Story 3.1, 3.2 |
| Sprint 4 | Acessibilidade + Polish | 1 semana | Story 4.1, 4.2 |
| Sprint 5-6 | Arquitetura | 2 semanas | Story 5.1, 5.2 |

## Budget

| Item | Valor |
|------|-------|
| Desenvolvimento (340h x R$150) | R$ 51.000 |
| Contingencia (15%) | R$ 7.650 |
| **Total** | **R$ 58.650** |

## Lista de Stories

| Story | Titulo | Sprint | Est. |
|-------|--------|--------|------|
| 1.1 | Fix security vulnerabilities (JWT, CORS, credentials) | S1 | 24h |
| 1.2 | Implement RLS policies + storage security | S1 | 24h |
| 2.1 | Database integrity (FK, cascade, unique, migrations) | S2 | 28h |
| 2.2 | Sidebar responsive + mobile navigation | S2 | 20h |
| 3.1 | Fix N+1 queries + indexes + pagination | S3 | 32h |
| 3.2 | ChapterReader mobile + Modal + Breadcrumb | S3 | 28h |
| 4.1 | WCAG compliance (ARIA, contrast, focus, keyboard) | S4 | 24h |
| 4.2 | Loading states + error handling + confirmations | S4 | 24h |
| 5.1 | Refactor backend into modules | S5 | 40h |
| 5.2 | Create test suite | S6 | 40h |

## Riscos

| Risco | Mitigacao |
|-------|----------|
| RLS break existing functionality | Test with anon key before + after |
| FK fail on existing orphan data | Cleanup script before adding FK |
| Refactor introduce regressions | Tests BEFORE refactor (Story 5.2 ideally first) |
| Mobile layout changes affect desktop | Test on multiple viewports |

---

*@pm — Epic criado*
