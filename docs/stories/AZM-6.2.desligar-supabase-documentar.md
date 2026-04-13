# Story AZM-6.2: Desligar Supabase e Documentar

> **Epic:** Epic 6 — Validação End-to-End
> **Status:** Draft
> **Priority:** Medium
> **Estimated Points:** 2
> **Owner:** @devops + @dev
> **Depends on:** AZM-6.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** DevOps engineer,
**I want** desligar o projeto Supabase e atualizar toda a documentação,
**so that** não haja custo residual de Supabase e a documentação reflita a infraestrutura Azure atual.

---

## Acceptance Criteria

1. [ ] Supabase project desligado/pausado
2. [ ] `.env.production` atualizado com variáveis Azure
3. [ ] `CLAUDE.md` atualizado com nova stack e comandos
4. [ ] `DEPLOY.md` criado/atualizado com instruções Azure
5. [ ] `docker-compose.yml` atualizado para dev local (opcional: Azure SQL ou SQLite para dev)
6. [ ] Nenhuma referência a Supabase restante em qualquer doc ou config

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Desligar Supabase (AC: 1)
  - [ ] Acessar dashboard Supabase
  - [ ] Pausar ou deletar o projeto (dados são de teste, sem valor)
  - [ ] Confirmar que não há billing ativo
- [ ] Task 2: Atualizar .env.production (AC: 2)
  - [ ] Garantir que contém: DATABASE_URL, AZURE_STORAGE_*, JWT_SECRET_KEY, OPENAI_API_KEY
  - [ ] Garantir que NÃO contém: SUPABASE_URL, SUPABASE_KEY
- [ ] Task 3: Atualizar CLAUDE.md (AC: 3)
  - [ ] Atualizar seção "Architecture" com Azure SQL, Azure Blob Storage, Container Apps
  - [ ] Atualizar seção "Environment Setup" com novas variáveis
  - [ ] Atualizar seção "Database Schema" para referenciar sql/schema.sql
  - [ ] Atualizar seção "API Routes" se houver mudanças de assinatura
  - [ ] Remover referências a Supabase em todas as seções
- [ ] Task 4: Criar/atualizar DEPLOY.md (AC: 4)
  - [ ] Seção: Pré-requisitos (Azure CLI, GitHub CLI, Docker)
  - [ ] Seção: Provisionamento (referenciar infra/setup-azure.sh)
  - [ ] Seção: Configuração de Secrets
  - [ ] Seção: Deploy manual (az containerapp up)
  - [ ] Seção: Deploy automático (GitHub Actions)
  - [ ] Seção: Troubleshooting
- [ ] Task 5: Atualizar docker-compose.yml (AC: 5)
  - [ ] Remover referências a Supabase
  - [ ] Atualizar env vars do backend service
  - [ ] Opcionalmente: adicionar Azure SQL edge ou SQLite para dev local
- [ ] Task 6: Validar zero Supabase references (AC: 6)
  - [ ] `grep -r "supabase" . --include="*.md" --include="*.yml" --include="*.yaml" --include="*.json" --include="*.env*"` → zero resultados
  - [ ] Exceto: docs históricos que mencionam a migração (aceitável)

---

## Dev Notes

**CLAUDE.md — seções a atualizar:**

A seção "Architecture" do CLAUDE.md deve refletir:
- Backend: FastAPI + SQLAlchemy + Azure SQL (mssql+pyodbc)
- Frontend: React + Vite (sem Supabase JS)
- Database: Azure SQL Database (SQL Server engine, S0 tier)
- Storage: Azure Blob Storage (courses, avatars, backups containers)
- CI/CD: GitHub Actions → ACR → Azure Container Apps
- Hosting: Azure Container Apps Environment

A seção "Environment Setup":
```
- Backend: Copy `.env.example` to `.env` and set `DATABASE_URL`, `AZURE_STORAGE_CONNECTION_STRING`, `OPENAI_API_KEY`
- Frontend: Copy `.env.example` and set `VITE_API_URL`
```

A seção "Database Schema":
```
- Schema: `sql/schema.sql` (T-SQL)
- Seed: `sql/seed.sql`
- 20 tabelas total
```

**DEPLOY.md — estrutura sugerida:**
```markdown
# Deploy Guide — Harven.AI on Azure

## Prerequisites
- Azure CLI installed and authenticated
- GitHub CLI installed
- Docker Desktop

## Infrastructure
Run `bash infra/setup-azure.sh` (see Story AZM-1.1)

## Database
1. Connect to Azure SQL: `sqlcmd -S harven-sql-server.database.windows.net -d harven-db -U harvenadmin`
2. Execute `sql/schema.sql`
3. Execute `sql/seed.sql`

## GitHub Secrets
- AZURE_CREDENTIALS: Service Principal JSON
- BACKEND_URL: https://harven-backend.REGION.azurecontainerapps.io

## Deploy
Push to main → GitHub Actions auto-deploys
- backend/** changes → deploy-backend.yml
- harven.ai-platform-mockup/** changes → deploy-frontend.yml

## Manual Deploy
az containerapp up --name harven-backend --resource-group harven-ai-rg --source ./backend
```

### Testing

- Supabase dashboard confirms project paused/deleted
- `grep -r "supabase"` in project root → zero in active configs
- CLAUDE.md accurately describes current architecture
- DEPLOY.md instructions are executable
- docker-compose.yml works for local dev

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
