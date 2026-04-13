# Project Brief: Migração Harven.AI para Azure Container Apps + Azure SQL

> **Status:** Draft v1.0
> **Data:** 2026-02-27
> **Autor:** Atlas (Analyst Agent)
> **Próximo passo:** Revisão → Handoff para @architect + @dev

---

## 1. Executive Summary

O Harven.AI é uma plataforma educacional com diálogo socrático baseado em IA, atualmente rodando em containers Docker sobre VPS (Coolify) com Supabase como banco de dados de prototipagem. O projeto precisa ser migrado para infraestrutura Azure de produção: **Azure Container Apps** para orquestração de containers, **Azure SQL Database** (SQL Server) como banco relacional, e **Azure Blob Storage** para armazenamento de arquivos. O ambiente Supabase será desligado — não há dados de produção a preservar.

**Problema central:** A infraestrutura atual é de prototipagem e não atende requisitos corporativos de produção, governança e escalabilidade.

**Valor da migração:** Infraestrutura enterprise-grade, CI/CD automatizado, integração nativa com ecossistema Azure da organização, e base sólida para escalar o produto.

---

## 2. Problem Statement

### Estado Atual
- Backend FastAPI (5.012 linhas) acoplado ao SDK `supabase-py` — lock-in em serviço de prototipagem
- Frontend React usa `@supabase/supabase-js` para chamadas diretas ao banco
- Zero automação de CI/CD — deploy é manual via Docker Compose
- Sem secrets management formal — credenciais em arquivos `.env`
- Supabase é PostgreSQL; o alvo Azure SQL é SQL Server — engines **incompatíveis**
- Storage de arquivos (PDFs, vídeos, avatares) acoplado ao Supabase Storage

### Por que agir agora
- O Supabase foi usado exclusivamente para validar o produto e levantar requisitos — missão cumprida
- A organização opera no ecossistema Azure — alinhamento estratégico
- Sem CI/CD, cada deploy é um risco operacional
- Não há monitoring, logging centralizado, ou backup automatizado

---

## 3. Proposed Solution

Migrar toda a stack para Azure mantendo a arquitetura de containers existente:

```
GitHub (código-fonte)
  │
  ├─ GitHub Actions (CI/CD)
  │   ├─ Build backend image → Push ACR
  │   └─ Build frontend image → Push ACR
  │
  └─ Azure Container Apps Environment
      ├─ harven-backend (FastAPI container)
      │   ├─ Conecta → Azure SQL Database
      │   └─ Conecta → Azure Blob Storage
      │
      ├─ harven-frontend (React/Nginx container)
      │   └─ Chama → harven-backend via ingress
      │
      ├─ Azure Container Registry (ACR)
      ├─ Managed Identity (autenticação sem secrets)
      └─ Azure SQL Database (SQL Server engine)
```

### Diferenciadores da abordagem
- **Dockerfiles existentes são reaproveitados** — não é rebuild do zero
- **Managed Identity** elimina secrets para comunicação inter-serviços Azure
- **GitHub Actions** com `azure/container-apps-deploy-action@v1` é a via oficial documentada pela Microsoft
- **Repository pattern** no backend desacopla lógica de negócio da engine de banco

---

## 4. Target Users

### Segmento Primário: Equipe de Desenvolvimento Harven.AI
- **Perfil:** Desenvolvedores e DevOps que mantêm a plataforma
- **Necessidade:** Pipeline automatizado, ambiente confiável, deploys sem risco
- **Dor atual:** Deploy manual, sem rollback, sem monitoring

### Segmento Secundário: Usuários Finais (Alunos, Instrutores, Admins)
- **Perfil:** Usuários da plataforma educacional
- **Necessidade:** Plataforma estável, performática, disponível
- **Impacto da migração:** Transparente — mesma experiência, melhor infraestrutura

---

## 5. Goals & Success Metrics

### Business Objectives
- Migrar 100% da stack para Azure sem perda de funcionalidade
- Estabelecer pipeline CI/CD funcional (push → deploy automático)
- Eliminar dependência do Supabase completamente
- Manter custo Azure dentro do budget definido

### User Success Metrics
- Zero downtime percebido pelo usuário final após go-live
- Tempo de resposta da API equivalente ou melhor que o atual
- Todas as funcionalidades existentes operacionais pós-migração

### KPIs
- **Deploy time:** < 10 minutos (push to live)
- **API latency P95:** < 500ms
- **Uptime:** 99.5%+
- **Rollback time:** < 5 minutos (revision swap no Container Apps)

---

## 6. MVP Scope (Migração)

### Core Features (Must Have)

- **Azure SQL Database:** Schema completo migrado de PostgreSQL para T-SQL, com todas as tabelas (users, disciplines, courses, chapters, contents, questions, system_settings, system_logs, token_usage)
- **Backend refactor:** Remover `supabase-py`, implementar camada de dados com SQLAlchemy + `mssql+pyodbc` para Azure SQL
- **Azure Blob Storage:** Containers `courses` e `avatars` com mesmas regras de upload (tipos MIME, limites de tamanho)
- **Frontend cleanup:** Remover `@supabase/supabase-js`, todas as chamadas passam pelo backend API
- **GitHub Actions CI/CD:** 2 workflows (backend + frontend) usando `azure/container-apps-deploy-action@v1`
- **Azure Container Registry:** Registry privado para imagens Docker
- **Azure Container Apps:** 2 container apps (backend + frontend) com ingress configurado
- **Managed Identity:** Autenticação ACR pull sem credentials
- **GitHub Secrets:** `AZURE_CREDENTIALS` (service principal) configurado
- **Health checks:** Mantidos nos containers (já existem)
- **Environment variables:** Migrados para Container Apps secrets/env

### Out of Scope para MVP
- Monitoring stack (Prometheus/Grafana) — fase posterior
- Redis caching layer — fase posterior
- Custom domain + SSL — configurável depois do deploy funcional
- Migração de dados do Supabase — não há dados de produção
- Azure Key Vault — usar Container Apps secrets inicialmente
- Multiple environments (staging/production) — começar com production only
- Azure Front Door / CDN — otimização posterior
- Sentry integration — configurável depois

### MVP Success Criteria
- Ambos os containers (frontend + backend) rodando no Azure Container Apps
- Todas as rotas da API operacionais com Azure SQL como data store
- Upload/download de arquivos funcional via Azure Blob Storage
- Push para `main` dispara build e deploy automático
- Login, CRUD de cursos, chat socrático — tudo funcional end-to-end

---

## 7. Post-MVP Vision

### Phase 2: Hardening
- Custom domains com SSL (harven.eximiaventures.com.br)
- Azure Key Vault para secrets management
- Staging environment separado
- Monitoring com Azure Monitor / Application Insights
- Alertas de custo e budget caps

### Phase 3: Otimização
- Azure CDN para assets estáticos do frontend
- Redis Cache para sessões e rate limiting
- Database performance tuning (indexação, query plans)
- Auto-scaling rules para containers

### Long-term Vision
- Multi-region deployment para alta disponibilidade
- Azure API Management como gateway
- Integração com Azure AD para SSO institucional

---

## 8. Technical Considerations

### Platform Requirements
- **Target Platform:** Azure (região Brazil South preferencialmente)
- **Container Runtime:** Azure Container Apps (Kubernetes-based, serverless)
- **Database Engine:** Azure SQL Database (SQL Server) — **não PostgreSQL**
- **Performance:** API latency < 500ms P95, suporte a 100+ usuários simultâneos

### Technology Stack (Pós-Migração)

| Layer | Tecnologia |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind (sem mudança) |
| **Frontend Container** | Node 20-alpine (build) + Nginx alpine (serve) |
| **Backend** | FastAPI + Python 3.11 (sem mudança no framework) |
| **Backend Container** | Python 3.11-slim |
| **ORM/DB Layer** | SQLAlchemy 2.x + pyodbc (NOVO) |
| **Database** | Azure SQL Database (SQL Server engine) |
| **File Storage** | Azure Blob Storage + azure-storage-blob SDK |
| **Container Registry** | Azure Container Registry (ACR) |
| **Orchestration** | Azure Container Apps |
| **CI/CD** | GitHub Actions |
| **Auth** | JWT custom (python-jose + passlib) — sem mudança |
| **AI** | OpenAI API (GPT-4o-mini) — sem mudança |

### Architecture Considerations
- **Repository Structure:** Monorepo mantido (frontend + backend no mesmo repo)
- **Service Architecture:** 2 containers independentes com ingress interno
- **Backend Refactor:** Introduzir repository pattern para isolar queries SQL do código das rotas
- **DDL Migration:** Reescrever schema PostgreSQL para T-SQL (IDENTITY, BIT, NVARCHAR, GETUTCDATE, etc.)
- **Security:** Managed Identity para ACR pull, Service Principal para GitHub Actions, JWT para users

### Dependências a Adicionar (Backend)

```
# requirements.txt — ADICIONAR
sqlalchemy>=2.0.0
pyodbc>=5.0.0
azure-storage-blob>=12.19.0
azure-identity>=1.15.0

# requirements.txt — REMOVER
supabase>=2.3.0
```

### Dependências a Remover (Frontend)

```
# package.json — REMOVER
@supabase/supabase-js
```

---

## 9. Mudanças no Código — Mapa Detalhado

### Backend (Alta Complexidade)

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `backend/main.py` | **Refatorar** | Extrair todas as queries Supabase → Repository classes com SQLAlchemy |
| `backend/models/` | **Criar** | SQLAlchemy models para todas as tabelas (T-SQL compatible) |
| `backend/repositories/` | **Criar** | Repository pattern: UserRepo, CourseRepo, DisciplineRepo, etc. |
| `backend/database.py` | **Criar** | Engine/session factory para Azure SQL (`mssql+pyodbc://`) |
| `backend/storage.py` | **Criar** | Azure Blob Storage wrapper (upload, download, delete, URL generation) |
| `backend/services/ai_service.py` | Sem mudança | OpenAI API é cloud-agnostic |
| `backend/agents/*` | Sem mudança | Agentes AI não tocam banco diretamente |
| `backend/requirements.txt` | **Atualizar** | +sqlalchemy, +pyodbc, +azure-storage-blob, -supabase |
| `backend/Dockerfile` | **Atualizar** | Adicionar ODBC driver para SQL Server |
| `backend/setup_supabase.py` | **Remover** | Substituído por setup Azure Blob |

### Frontend (Média Complexidade)

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `frontend/lib/supabase.ts` | **Remover** | Eliminar client Supabase |
| `frontend/package.json` | **Atualizar** | Remover `@supabase/supabase-js` |
| `frontend/services/*` | **Revisar** | Garantir que todas as chamadas vão via API backend |
| `frontend/Dockerfile` | Sem mudança | Build multi-stage já funciona |
| `frontend/nginx.conf` | **Ajustar** | Proxy para novo backend URL no Container Apps |

### Infra (Criar do Zero)

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `.github/workflows/deploy-backend.yml` | **Criar** | CI/CD backend → ACR → Container Apps |
| `.github/workflows/deploy-frontend.yml` | **Criar** | CI/CD frontend → ACR → Container Apps |
| `infra/setup-azure.sh` | **Criar** | Script de provisionamento Azure CLI |
| `sql/schema.sql` | **Criar** | DDL completo em T-SQL para Azure SQL |
| `sql/seed.sql` | **Criar** | Dados iniciais (roles, settings, admin user) |

---

## 10. Incompatibilidades PostgreSQL → Azure SQL (T-SQL)

| PostgreSQL | Azure SQL (T-SQL) | Impacto |
|-----------|-------------------|---------|
| `SERIAL` / `BIGSERIAL` | `INT IDENTITY(1,1)` | DDL rewrite |
| `BOOLEAN` | `BIT` | DDL + queries |
| `TEXT` | `NVARCHAR(MAX)` | DDL |
| `TIMESTAMPTZ` | `DATETIMEOFFSET` | DDL |
| `NOW()` | `GETUTCDATE()` | Queries |
| `ILIKE` | `LIKE` com `COLLATE` | Queries |
| `->`, `->>` (JSON) | `JSON_VALUE()`, `OPENJSON()` | Queries |
| `gen_random_uuid()` | `NEWID()` | DDL + queries |
| `ON CONFLICT DO UPDATE` | `MERGE` statement | Queries (upserts) |
| `LIMIT x OFFSET y` | `OFFSET y ROWS FETCH NEXT x ROWS ONLY` | Queries (pagination) |
| `string_agg()` | `STRING_AGG()` | Compatível (SQL Server 2017+) |
| RPC functions | Stored Procedures | Rewrite |
| Supabase Realtime | Não aplicável | Avaliar se usado |

---

## 11. Recursos Azure Necessários

```
Azure Resource Group: harven-ai-rg
│
├── Azure Container Registry (ACR)
│   └── harvenacr (Basic tier — suficiente para início)
│
├── Azure Container Apps Environment
│   ├── harven-backend
│   │   ├── Image: harvenacr.azurecr.io/harven-backend:latest
│   │   ├── Ingress: internal + external (API)
│   │   ├── Min replicas: 1
│   │   ├── Max replicas: 3
│   │   └── Resources: 0.5 vCPU, 1Gi memory
│   │
│   └── harven-frontend
│       ├── Image: harvenacr.azurecr.io/harven-frontend:latest
│       ├── Ingress: external (HTTPS)
│       ├── Min replicas: 1
│       ├── Max replicas: 2
│       └── Resources: 0.25 vCPU, 0.5Gi memory
│
├── Azure SQL Database
│   ├── Server: harven-sql-server
│   ├── Database: harven-db
│   ├── Tier: Basic/S0 (5 DTU — escalar conforme necessidade)
│   └── Firewall: Allow Azure services
│
├── Azure Blob Storage
│   ├── Account: harvenstorage
│   ├── Container: courses (public read)
│   └── Container: avatars (public read)
│
├── Managed Identity (System-assigned)
│   └── Role: AcrPull no ACR
│
└── Service Principal (GitHub Actions)
    └── Role: Contributor no Resource Group
```

---

## 12. GitHub Actions Workflows

### deploy-backend.yml (Baseado na documentação oficial)

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: [backend/**]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Log in to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v1
        with:
          appSourcePath: ${{ github.workspace }}/backend
          acrName: harvenacr
          containerAppName: harven-backend
          resourceGroup: harven-ai-rg
```

### deploy-frontend.yml

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths: [harven.ai-platform-mockup/**]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Log in to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and deploy Container App
        uses: azure/container-apps-deploy-action@v1
        with:
          appSourcePath: ${{ github.workspace }}/harven.ai-platform-mockup
          acrName: harvenacr
          containerAppName: harven-frontend
          resourceGroup: harven-ai-rg
```

---

## 13. Constraints & Assumptions

### Constraints
- **Database Engine:** Azure SQL (SQL Server) — exigência organizacional, não negociável
- **Cloud Provider:** Azure — alinhamento com infraestrutura corporativa
- **Timeline:** A definir com stakeholders
- **Budget:** A definir — tier selection depende disto
- **Code Freeze:** Backend terá refactor significativo durante migração

### Key Assumptions
- Supabase será desligado — não há migração de dados, apenas de schema/estrutura
- O repositório continuará no GitHub (não Azure DevOps Repos)
- CI/CD será via GitHub Actions (não Azure Pipelines)
- DNS e domínios serão reconfigurados após deploy funcional
- Ambiente single (production only) no MVP — staging é post-MVP

---

## 14. Risks & Open Questions

### Key Risks

- **Rewrite da camada de dados (ALTO):** `main.py` tem 5.012 linhas com queries Supabase embutidas em todas as rotas. Risco de introduzir bugs durante refactor. **Mitigação:** Repository pattern + testes unitários por rota.
- **Incompatibilidades T-SQL (MÉDIO):** PostgreSQL e SQL Server têm diferenças sintáticas significativas. **Mitigação:** Tabela de mapeamento (seção 10) + SQLAlchemy como abstração.
- **Dockerfile ODBC driver (BAIXO):** Container Python precisa do ODBC Driver 18 para SQL Server. **Mitigação:** Instalação documentada pela Microsoft.
- **Custo Azure (MÉDIO):** Sem baseline de uso, difícil estimar custo. **Mitigação:** Começar com tiers mínimos, configurar budget alerts.
- **Storage URL migration (BAIXO):** URLs de arquivos no Supabase Storage mudam para Azure Blob URLs. **Mitigação:** Não há dados de produção — schema limpo.

### Open Questions

- Qual a região Azure preferida? (Brazil South?)
- Qual o budget mensal disponível para infraestrutura Azure?
- O repositório GitHub é público ou privado? (afeta ACR authentication flow)
- Existe Azure AD/Entra ID disponível para SSO futuro?
- Precisamos de Azure DevOps Boards para gestão ou continuamos com ferramentas atuais?
- Quem terá acesso admin ao Azure Portal?

### Areas Needing Further Research

- Pricing exato dos tiers Azure para o perfil de uso esperado
- ODBC Driver 18 compatibility com Python 3.11-slim Docker image
- Azure Container Apps custom domain + managed certificate setup
- Azure SQL backup/restore automation
- Latency benchmarks Brazil South region

---

## 15. Execution Phases

```
FASE 1: Provisionamento Azure (Infra)
├── Criar Resource Group
├── Criar ACR (Container Registry)
├── Criar Azure SQL Database + Server
├── Criar Azure Blob Storage + Containers
├── Criar Container Apps Environment
├── Configurar Managed Identity + AcrPull
├── Criar Service Principal para GitHub Actions
└── Configurar GitHub Secrets (AZURE_CREDENTIALS)

FASE 2: Database Schema (Data Layer)
├── Converter DDL PostgreSQL → T-SQL
├── Criar schema.sql completo
├── Criar seed.sql (dados iniciais)
├── Executar no Azure SQL
└── Validar estrutura

FASE 3: Backend Refactor (Code)
├── Criar database.py (SQLAlchemy engine)
├── Criar models/ (SQLAlchemy ORM models)
├── Criar repositories/ (data access layer)
├── Criar storage.py (Azure Blob wrapper)
├── Refatorar main.py (trocar supabase → repositories)
├── Atualizar requirements.txt
├── Atualizar Dockerfile (ODBC driver)
└── Testes locais com Azure SQL

FASE 4: Frontend Cleanup (Code)
├── Remover @supabase/supabase-js
├── Remover lib/supabase.ts
├── Verificar todas as chamadas via API
├── Ajustar nginx.conf se necessário
└── Build test

FASE 5: CI/CD Pipeline (Automation)
├── Criar deploy-backend.yml
├── Criar deploy-frontend.yml
├── Push test → validar pipeline
├── Validar imagens no ACR
└── Validar deploy no Container Apps

FASE 6: Validação End-to-End
├── Login + Auth flow
├── CRUD cursos/capítulos/conteúdos
├── Upload/download de arquivos
├── Chat socrático (AI agents)
├── Admin console
├── Rate limiting
└── Health checks

FASE 7: Go-Live
├── DNS cutover (se custom domain)
├── Desligar Supabase
├── Monitoramento intensivo 72h
└── Documentação atualizada
```

---

## 16. Next Steps

### Immediate Actions
1. **Revisar este brief** — Alinhar com stakeholders sobre scope e constraints
2. **Responder Open Questions** — Especialmente região, budget e acessos
3. **Handoff para @architect** — Desenhar a arquitetura detalhada (repository pattern, models, infra-as-code)
4. **Handoff para @dev** — Executar as fases de código (3, 4, 5)
5. **Handoff para @devops** — Provisionamento Azure (fase 1)

### PM Handoff
Este Project Brief fornece o contexto completo para a migração do Harven.AI para Azure. O @pm deve usar este documento como base para criar o PRD detalhado, quebrando as fases em épicos e stories para execução.

---

> *Documento gerado por Atlas (Analyst Agent) com base na análise do codebase atual, documentação Azure Container Apps (Microsoft Learn), e requisitos levantados em sessão.*

— Atlas, investigando a verdade 🔎
