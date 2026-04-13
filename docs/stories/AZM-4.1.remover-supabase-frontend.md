# Story AZM-4.1: Remover Supabase JS do Frontend

> **Epic:** Epic 4 — Frontend Cleanup
> **Status:** Draft
> **Priority:** Low
> **Estimated Points:** 1
> **Owner:** @dev
> **Depends on:** Nenhum (pode rodar em paralelo com Epic 3)
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** remover toda a dependência do Supabase JS do frontend,
**so that** o frontend não tenha código morto nem dependências desnecessárias.

---

## Acceptance Criteria

1. [ ] `lib/supabase.ts` deletado
2. [ ] `@supabase/supabase-js` removido do package.json
3. [ ] `npm install` executado (lockfile atualizado)
4. [ ] 3 URLs Supabase em `contexts/SettingsContext.tsx` substituídas por strings vazias
5. [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` removidas de `.env.example` e `.env.local` (se existirem)
6. [ ] `npm run build` executa com sucesso sem warnings de Supabase
7. [ ] Zero referências ativas a "supabase" em qualquer arquivo .ts/.tsx (imports, types, variáveis). Comentários explicativos de migração são aceitáveis.

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Deletar `lib/supabase.ts` (AC: 1)
  - [ ] `rm harven.ai-platform-mockup/lib/supabase.ts`
- [ ] Task 2: Remover dependência do package.json (AC: 2, 3)
  - [ ] `cd harven.ai-platform-mockup && npm uninstall @supabase/supabase-js`
  - [ ] Verificar que package.json e lockfile estão atualizados
- [ ] Task 3: Limpar URLs hardcoded em SettingsContext.tsx (AC: 4)
  - [ ] Substituir URL 1 (logo_url): `'https://kllkgrkjmxqdlsrhyrun.supabase.co/...'` → `''`
  - [ ] Substituir URL 2 (login_logo_url): similar → `''`
  - [ ] Substituir URL 3 (login_bg_url): similar → `''`
- [ ] Task 4: Limpar variáveis de ambiente (AC: 5)
  - [ ] Remover `VITE_SUPABASE_URL=` e `VITE_SUPABASE_KEY=` de `.env.example` (se existirem)
  - [ ] Remover das mesmas de `.env.local` (se existirem)
  - [ ] Nota: verificar se essas variáveis existem antes — podem já não estar presentes
- [ ] Task 5: Validar (AC: 6, 7)
  - [ ] `npm run build` — zero erros, zero warnings de supabase
  - [ ] `grep -r "supabase" harven.ai-platform-mockup/src/ --include="*.ts" --include="*.tsx"` — zero referências ativas (imports, types, variáveis)
  - [ ] Comentários como `// migrated from supabase` são aceitáveis e não contam como referência ativa

---

## Dev Notes

**Contexto:** O frontend NUNCA usou o Supabase JS client para operações de dados. Todas as chamadas vão via `services/api.ts` → backend FastAPI. O `@supabase/supabase-js` está instalado mas nunca importado em nenhum componente.

**Arquivo `lib/supabase.ts`:** Artifact criado mas não utilizado por nenhum componente. Safe to delete.

**SettingsContext.tsx — as 3 URLs hardcoded como fallback:**
```typescript
// ANTES (3 URLs Supabase hardcoded como default values)
logo_url: 'https://kllkgrkjmxqdlsrhyrun.supabase.co/storage/v1/object/public/courses/system/logo_xxx.png',
login_logo_url: 'https://kllkgrkjmxqdlsrhyrun.supabase.co/storage/v1/object/public/courses/system/login_logo_xxx.png',
login_bg_url: 'https://kllkgrkjmxqdlsrhyrun.supabase.co/storage/v1/object/public/courses/system/bg_xxx.png',

// DEPOIS
logo_url: '',
login_logo_url: '',
login_bg_url: '',
```

**Source tree:**
- `harven.ai-platform-mockup/lib/supabase.ts` — deletar
- `harven.ai-platform-mockup/package.json` — remover @supabase/supabase-js
- `harven.ai-platform-mockup/contexts/SettingsContext.tsx` — limpar 3 URLs
- `harven.ai-platform-mockup/.env.example` — remover VITE_SUPABASE_*

### Testing

- `npm run build` — zero erros
- `grep -r "supabase" harven.ai-platform-mockup/src/` — zero resultados
- App carrega sem erros no browser (settings carregam do backend API)

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
