# Story AZM-1.1: Provisionar Recursos Azure

> **Epic:** Epic 1 — Provisionamento de Infraestrutura Azure
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 3
> **Owner:** @devops
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** DevOps engineer,
**I want** provisionar todos os recursos Azure necessários via CLI script,
**so that** a infraestrutura esteja pronta para receber os containers da aplicação.

---

## Acceptance Criteria

1. [ ] Resource Group `harven-ai-rg` criado em `brazilsouth`
2. [ ] ACR `harvenacr` criado (Basic tier)
3. [ ] Azure SQL Server `harven-sql-server` + Database `harven-db` criado (S0 tier)
4. [ ] Firewall do SQL Server permite Azure Services (AllowAzureServices rule: 0.0.0.0-0.0.0.0)
5. [ ] Storage Account `harvenstorage` com containers: `courses` (public), `avatars` (public), `backups` (private)
6. [ ] Container Apps Environment `harven-env` criado
7. [ ] Container App `harven-backend` criado (Port 8000, ingress external, 0.5vCPU/1Gi, replicas 1-3)
8. [ ] Container App `harven-frontend` criado (Port 80, ingress external, 0.25vCPU/0.5Gi, replicas 1-2)
9. [ ] Script `infra/setup-azure.sh` versionado no repo

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar script `infra/setup-azure.sh` (AC: 9)
  - [ ] Definir variáveis: RESOURCE_GROUP, LOCATION, ACR_NAME, SQL_SERVER, SQL_DB, SQL_ADMIN, SQL_PASSWORD, STORAGE_ACCOUNT, CONTAINER_ENV
  - [ ] Adicionar comando `az group create` (AC: 1)
  - [ ] Adicionar comando `az acr create --sku Basic` (AC: 2)
  - [ ] Adicionar comandos `az sql server create` + `az sql db create --service-objective S0` (AC: 3)
  - [ ] Adicionar comando `az sql server firewall-rule create --name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0` (AC: 4)
  - [ ] Adicionar comandos `az storage account create` + 3x `az storage container create` (courses/public, avatars/public, backups/private) (AC: 5)
  - [ ] Adicionar comando `az containerapp env create` (AC: 6)
- [ ] Task 2: Executar script e validar criação (AC: 1-6)
  - [ ] Executar `bash infra/setup-azure.sh`
  - [ ] Validar com `az group show`, `az acr show`, `az sql db show`, `az storage account show`, `az containerapp env show`
- [ ] Task 3: Criar Container Apps (backend + frontend) (AC: 7, 8)
  - [ ] `az containerapp create --name harven-backend` com config: Port 8000, ingress external, 0.5vCPU/1Gi, replicas 1-3
  - [ ] `az containerapp create --name harven-frontend` com config: Port 80, ingress external, 0.25vCPU/0.5Gi, replicas 1-2
  - [ ] Validar com `az containerapp show --name harven-backend` e `az containerapp show --name harven-frontend`

---

## Dev Notes

**Arquivo de referência:** `infra/setup-azure.sh` (a ser criado)

**Script base da arquitetura:**
```bash
#!/bin/bash
RESOURCE_GROUP="harven-ai-rg"
LOCATION="brazilsouth"
ACR_NAME="harvenacr"
SQL_SERVER="harven-sql-server"
SQL_DB="harven-db"
SQL_ADMIN="harvenadmin"
SQL_PASSWORD="<DEFINIR_SENHA_FORTE>"
STORAGE_ACCOUNT="harvenstorage"
CONTAINER_ENV="harven-env"

az group create --name $RESOURCE_GROUP --location $LOCATION
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az sql server create --resource-group $RESOURCE_GROUP --name $SQL_SERVER --location $LOCATION --admin-user $SQL_ADMIN --admin-password $SQL_PASSWORD
az sql db create --resource-group $RESOURCE_GROUP --server $SQL_SERVER --name $SQL_DB --service-objective S0
az sql server firewall-rule create --resource-group $RESOURCE_GROUP --server $SQL_SERVER --name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
az storage account create --resource-group $RESOURCE_GROUP --name $STORAGE_ACCOUNT --location $LOCATION --sku Standard_LRS
az storage container create --account-name $STORAGE_ACCOUNT --name courses --public-access blob
az storage container create --account-name $STORAGE_ACCOUNT --name avatars --public-access blob
az storage container create --account-name $STORAGE_ACCOUNT --name backups --public-access off
az containerapp env create --name $CONTAINER_ENV --resource-group $RESOURCE_GROUP --location $LOCATION
```

**Container Apps specs (arquitetura):**
- Backend: Port 8000, ingress external, 0.5 vCPU / 1 Gi RAM, replicas 1-3
- Frontend: Port 80, ingress external, 0.25 vCPU / 0.5 Gi RAM, replicas 1-2

**Importante:** SQL_PASSWORD deve ser definido como variável de ambiente ou parâmetro, NUNCA hardcoded no script.

### Testing

- Validar cada recurso com `az <resource> show`
- Script deve ser idempotente (re-executável sem erros)
- Validar naming conventions Azure (lowercase, hyphens)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Fix referência AC Task 1 (7→9) | River (SM) |

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
