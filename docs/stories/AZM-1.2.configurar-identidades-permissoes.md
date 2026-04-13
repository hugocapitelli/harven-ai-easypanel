# Story AZM-1.2: Configurar Identidades e Permissões

> **Epic:** Epic 1 — Provisionamento de Infraestrutura Azure
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 2
> **Owner:** @devops
> **Depends on:** AZM-1.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** DevOps engineer,
**I want** configurar Managed Identities e Service Principal,
**so that** os Container Apps possam fazer pull do ACR sem secrets e o GitHub Actions possa fazer deploy com credenciais seguras.

---

## Acceptance Criteria

1. [ ] System-assigned Managed Identity habilitada em ambos os Container Apps
2. [ ] Role `AcrPull` atribuída às Managed Identities no ACR
3. [ ] Container Apps configurados para usar Managed Identity no registry pull
4. [ ] Service Principal `harven-github-actions` criado com role `Contributor` no Resource Group
5. [ ] JSON de credenciais do SP documentado (para configurar no GitHub Secrets)

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Habilitar Managed Identity nos Container Apps (AC: 1)
  - [ ] `az containerapp identity assign --system-assigned` no harven-backend
  - [ ] `az containerapp identity assign --system-assigned` no harven-frontend
- [ ] Task 2: Atribuir AcrPull role (AC: 2, 3)
  - [ ] Obter principalId de cada Container App
  - [ ] `az role assignment create --role AcrPull --assignee <principalId> --scope <ACR_RESOURCE_ID>`
  - [ ] Configurar Container Apps para usar identity no registry: `az containerapp registry set --server harvenacr.azurecr.io --identity system`
- [ ] Task 3: Criar Service Principal para GitHub Actions (AC: 4, 5)
  - [ ] `az ad sp create-for-rbac --name harven-github-actions --role Contributor --scopes /subscriptions/{sub}/resourceGroups/harven-ai-rg --json-auth`
  - [ ] Documentar output JSON (será usado como AZURE_CREDENTIALS no GitHub)

---

## Dev Notes

**Comandos de identidade:**
```bash
# Habilitar Managed Identity
az containerapp identity assign --name harven-backend --resource-group harven-ai-rg --system-assigned
az containerapp identity assign --name harven-frontend --resource-group harven-ai-rg --system-assigned

# Obter Principal IDs
BACKEND_PRINCIPAL=$(az containerapp identity show --name harven-backend --resource-group harven-ai-rg --query principalId -o tsv)
FRONTEND_PRINCIPAL=$(az containerapp identity show --name harven-frontend --resource-group harven-ai-rg --query principalId -o tsv)

# Obter ACR Resource ID
ACR_ID=$(az acr show --name harvenacr --resource-group harven-ai-rg --query id -o tsv)

# AcrPull role
az role assignment create --role AcrPull --assignee $BACKEND_PRINCIPAL --scope $ACR_ID
az role assignment create --role AcrPull --assignee $FRONTEND_PRINCIPAL --scope $ACR_ID

# Registry com identity
az containerapp registry set --name harven-backend --resource-group harven-ai-rg --server harvenacr.azurecr.io --identity system
az containerapp registry set --name harven-frontend --resource-group harven-ai-rg --server harvenacr.azurecr.io --identity system

# Service Principal
az ad sp create-for-rbac --name harven-github-actions --role Contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/harven-ai-rg --json-auth
```

**Output do SP (formato esperado):**
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  ...
}
```
Este JSON inteiro vai no GitHub Secret `AZURE_CREDENTIALS`.

**Importante:** Nunca commitar o JSON do SP no repo. Documentar em local seguro.

### Testing

- Verificar identity: `az containerapp identity show --name harven-backend --resource-group harven-ai-rg`
- Verificar role: `az role assignment list --assignee <principalId>`
- Testar pull do ACR: `az containerapp up` com imagem de teste
- Validar SP existe: `az sql db query --name harven-db --server harven-sql-server --resource-group harven-ai-rg --query "SELECT name FROM sys.procedures WHERE name = 'sp_increment_message_count'"` (se schema já aplicado)

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
