# Story 2.1 — Database Integrity

**Epic:** EPIC-TD-001
**Sprint:** 2
**Estimativa:** 28 horas
**Prioridade:** HIGH

---

## Objetivo

Garantir integridade referencial no banco com FK constraints, cascade deletes, unique constraints e baseline migration.

## Tasks

- [ ] **T1: Baseline migration** (8h) — Dump schema atual do Supabase
- [ ] **T2: FK constraints** (10h) — Todas as relacoes (discipline_id, course_id, chapter_id, content_id, user_id)
- [ ] **T3: Cascade deletes** (4h) — courses→chapters→contents→questions, users→activities
- [ ] **T4: Unique constraints** (2h) — junction tables (discipline_id + student_id/teacher_id)
- [ ] **T5: Cleanup orphan data** (4h) — Script para identificar e limpar dados orfaos ANTES de FK

## Criterios de Aceite

- [ ] Baseline migration reproduz schema completo
- [ ] FK constraints impedem insert com IDs invalidos
- [ ] Delete cascade funciona (delete course → chapters → contents → questions)
- [ ] Duplicatas em junction tables rejeitadas
- [ ] Zero dados orfaos apos cleanup
