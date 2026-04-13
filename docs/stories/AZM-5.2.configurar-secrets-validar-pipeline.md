# Story AZM-5.2: Configurar Secrets e Validar Pipeline

> **Epic:** Epic 5 — CI/CD Pipeline
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 2
> **Owner:** @devops
> **Depends on:** AZM-5.1, AZM-3.7, AZM-4.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** DevOps engineer,
**I want** configurar os GitHub Secrets e fazer o primeiro deploy completo,
**so that** o pipeline CI/CD funcione end-to-end e os containers estejam rodando no Azure.

---

## Acceptance Criteria

1. [ ] GitHub Secret `AZURE_CREDENTIALS` configurado (JSON do Service Principal)
2. [ ] GitHub Secret `BACKEND_URL` configurado (URL do backend no Container Apps)
3. [ ] Push de teste para `main` dispara workflow correto
4. [ ] Backend image construída e pushada para ACR
5. [ ] Frontend image construída e pushada para ACR
6. [ ] Container Apps atualizados com novas revisões
7. [ ] Health checks passando em ambos os containers

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Configurar GitHub Secrets (AC: 1, 2)
  - [ ] `gh secret set AZURE_CREDENTIALS` com JSON do Service Principal (de AZM-1.2)
  - [ ] Obter backend URL: `az containerapp show --name harven-backend --resource-group harven-ai-rg --query 'properties.configuration.ingress.fqdn' -o tsv`
  - [ ] `gh secret set BACKEND_URL` com a URL completa (https://...)
- [ ] Task 2: Trigger deploy backend (AC: 3, 4, 6)
  - [ ] Push mudança em `backend/` para main
  - [ ] Verificar que workflow `deploy-backend.yml` é triggerado
  - [ ] Verificar que image aparece no ACR: `az acr repository show-tags --name harvenacr --repository harven-backend`
  - [ ] Verificar que Container App tem nova revision
- [ ] Task 3: Trigger deploy frontend (AC: 3, 5, 6)
  - [ ] Push mudança em `harven.ai-platform-mockup/` para main
  - [ ] Verificar workflow `deploy-frontend.yml`
  - [ ] Verificar image no ACR e nova revision no Container App
- [ ] Task 4: Validar health checks (AC: 7)
  - [ ] `curl https://harven-backend.REGION.azurecontainerapps.io/` → 200
  - [ ] `curl https://harven-frontend.REGION.azurecontainerapps.io/` → 200
  - [ ] Verificar logs: `az containerapp logs show --name harven-backend --resource-group harven-ai-rg`

---

## Dev Notes

**Configurar secrets via GitHub CLI:**
```bash
# AZURE_CREDENTIALS — JSON do Service Principal
gh secret set AZURE_CREDENTIALS < /path/to/sp-credentials.json

# BACKEND_URL
BACKEND_FQDN=$(az containerapp show --name harven-backend --resource-group harven-ai-rg --query 'properties.configuration.ingress.fqdn' -o tsv)
gh secret set BACKEND_URL --body "https://$BACKEND_FQDN"
```

**Verificar deploy:**
```bash
# Verificar images no ACR
az acr repository show-tags --name harvenacr --repository harven-backend --output table
az acr repository show-tags --name harvenacr --repository harven-frontend --output table

# Verificar revisions
az containerapp revision list --name harven-backend --resource-group harven-ai-rg --output table

# Verificar logs
az containerapp logs show --name harven-backend --resource-group harven-ai-rg --tail 50
```

**Troubleshooting comum:**
- Se workflow falha em `azure/login`: verificar JSON do AZURE_CREDENTIALS
- Se build falha: verificar Dockerfile syntax
- Se deploy falha: verificar que ACR está acessível pelo Container App (AcrPull role)
- Se health check falha: verificar env vars no Container App

### Testing

- Workflow executa sem erros no GitHub Actions
- Images com tags de git SHA aparecem no ACR
- Container Apps respondem em seus FQDNs
- Logs mostram startup normal
- Health checks HTTP 200

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Nenhuma correção necessária (validação PO aprovada) | River (SM) |

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
