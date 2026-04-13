# Story AZM-5.1: Criar GitHub Actions Workflows

> **Epic:** Epic 5 — CI/CD Pipeline
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 3
> **Owner:** @devops (review: @dev)
> **Depends on:** AZM-1.1, AZM-1.2
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** DevOps engineer,
**I want** criar workflows do GitHub Actions para deploy automático de backend e frontend,
**so that** cada push para main com mudanças nos paths corretos trigger um deploy automático.

---

## Acceptance Criteria

1. [ ] `.github/workflows/deploy-backend.yml` criado
   - Trigger: push to main, paths: `backend/**`
   - Steps: checkout → azure/login → container-apps-deploy-action
   - Image tag: `harvenacr.azurecr.io/harven-backend:${{ github.sha }}`
2. [ ] `.github/workflows/deploy-frontend.yml` criado
   - Trigger: push to main, paths: `harven.ai-platform-mockup/**`
   - Steps: checkout → azure/login → container-apps-deploy-action
   - Build arg: `VITE_API_URL=${{ secrets.BACKEND_URL }}`
   - Image tag: `harvenacr.azurecr.io/harven-frontend:${{ github.sha }}`
3. [ ] Workflows usam actions/checkout@v4 e azure/login@v2

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar diretório `.github/workflows/` (se não existir)
- [ ] Task 2: Criar `deploy-backend.yml` (AC: 1, 3)
  - [ ] on.push.branches: [main], paths: ['backend/**', '.github/workflows/deploy-backend.yml']
  - [ ] jobs.build-and-deploy.runs-on: ubuntu-latest
  - [ ] Step 1: actions/checkout@v4
  - [ ] Step 2: azure/login@v2 with creds: ${{ secrets.AZURE_CREDENTIALS }}
  - [ ] Step 3: azure/container-apps-deploy-action@v2 with appSourcePath, acrName, containerAppName, resourceGroup, imageToBuild
- [ ] Task 3: Criar `deploy-frontend.yml` (AC: 2, 3)
  - [ ] on.push.branches: [main], paths: ['harven.ai-platform-mockup/**', '.github/workflows/deploy-frontend.yml']
  - [ ] Same steps pattern as backend
  - [ ] Additional: buildArguments: VITE_API_URL=${{ secrets.BACKEND_URL }}
- [ ] Task 4: Validar YAML syntax

---

## Dev Notes

**deploy-backend.yml completo (da arquitetura):**
```yaml
name: Deploy Backend to Azure Container Apps

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v2
        with:
          appSourcePath: ${{ github.workspace }}/backend
          acrName: harvenacr
          containerAppName: harven-backend
          resourceGroup: harven-ai-rg
          imageToBuild: harvenacr.azurecr.io/harven-backend:${{ github.sha }}
```

**deploy-frontend.yml completo (da arquitetura):**
```yaml
name: Deploy Frontend to Azure Container Apps

on:
  push:
    branches: [main]
    paths:
      - 'harven.ai-platform-mockup/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v2
        with:
          appSourcePath: ${{ github.workspace }}/harven.ai-platform-mockup
          acrName: harvenacr
          containerAppName: harven-frontend
          resourceGroup: harven-ai-rg
          imageToBuild: harvenacr.azurecr.io/harven-frontend:${{ github.sha }}
          buildArguments: VITE_API_URL=${{ secrets.BACKEND_URL }}
```

**GitHub Secrets necessários (configurar em AZM-5.2):**
| Secret | Valor | Descrição |
|--------|-------|-----------|
| `AZURE_CREDENTIALS` | JSON do Service Principal | Output de `az ad sp create-for-rbac` |
| `BACKEND_URL` | `https://harven-backend.REGION.azurecontainerapps.io` | URL do backend |

**Nota:** A action `azure/container-apps-deploy-action@v2` faz build do Dockerfile, push para ACR e deploy para Container Apps em uma única step.

### Testing

- Validar YAML syntax com `yamllint` ou online validator
- Verificar que paths triggers estão corretos
- Verificar que secrets references estão corretas (${{ secrets.X }})
- Push de teste será feito na Story AZM-5.2

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
