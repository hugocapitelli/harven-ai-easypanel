# Story 3.1 — Fix N+1 Queries + Pagination

**Epic:** EPIC-TD-001
**Sprint:** 3
**Estimativa:** 32 horas
**Prioridade:** HIGH

---

## Objetivo

Eliminar queries N+1, adicionar pagination em endpoints de listagem, e usar Supabase relations.

## Tasks

- [ ] **T1: Fix N+1 em /users/{id}/stats** (8h) — Reduzir de 7 para 2 queries
- [ ] **T2: Fix N+1 em /users/{id}/achievements** (8h) — Reduzir de 9 para 3 queries
- [ ] **T3: Use Supabase relations** (8h) — Substituir manual joins por select("*, related(*)")
- [ ] **T4: Add pagination** (8h) — GET /courses, /users, /disciplines/{id}/students, etc.

## Criterios de Aceite

- [ ] /users/{id}/stats: max 2 queries (verificar com logging)
- [ ] Pagination funcional em todos endpoints de listagem
- [ ] Login < 200ms (P95)
- [ ] List endpoints < 500ms (P95)
