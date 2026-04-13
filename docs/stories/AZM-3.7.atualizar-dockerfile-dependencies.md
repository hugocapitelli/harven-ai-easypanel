# Story AZM-3.7: Atualizar Dockerfile e Dependencies

> **Epic:** Epic 3 — Backend Data Layer Refactor
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 3
> **Owner:** @dev (review: @devops)
> **Depends on:** AZM-3.4, AZM-3.5, AZM-3.6
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** atualizar o Dockerfile do backend com ODBC Driver 18, atualizar requirements.txt e .env.example,
**so that** o container possa conectar ao Azure SQL e todas as dependências estejam corretas.

---

## Acceptance Criteria

1. [ ] `backend/Dockerfile` atualizado com instalação de ODBC Driver 18 (Microsoft packages)
2. [ ] `backend/requirements.txt` atualizado: -supabase, +sqlalchemy, +pyodbc, +azure-storage-blob, +azure-identity
3. [ ] `backend/.env.example` atualizado: -SUPABASE_URL, -SUPABASE_KEY, +DATABASE_URL, +AZURE_STORAGE_CONNECTION_STRING
4. [ ] `backend/setup_supabase.py` deletado (se existir)
5. [ ] Todos os imports de `supabase` removidos do codebase backend
6. [ ] `docker build` executa com sucesso
7. [ ] Container inicia e conecta ao Azure SQL

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Atualizar `backend/Dockerfile` (AC: 1)
  - [ ] Adicionar bloco de instalação do ODBC Driver 18:
    ```
    RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc curl gnupg2 unixodbc-dev \
        && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
        && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
        && apt-get update \
        && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
        && rm -rf /var/lib/apt/lists/*
    ```
  - [ ] Manter: python:3.11-slim base, appuser, healthcheck, uvicorn CMD
- [ ] Task 2: Atualizar `backend/requirements.txt` (AC: 2)
  - [ ] Remover: `supabase>=2.3.0`
  - [ ] Adicionar: `sqlalchemy>=2.0.0`, `pyodbc>=5.0.0`, `azure-storage-blob>=12.19.0`, `azure-identity>=1.15.0`
  - [ ] Manter todas as outras dependências (fastapi, uvicorn, openai, bcrypt, etc.)
- [ ] Task 3: Atualizar `backend/.env.example` (AC: 3)
  - [ ] Remover: `SUPABASE_URL=`, `SUPABASE_KEY=`
  - [ ] Adicionar: `DATABASE_URL=mssql+pyodbc://user:pass@server.database.windows.net/harven-db?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no`
  - [ ] Adicionar: `AZURE_STORAGE_CONNECTION_STRING=`, `AZURE_STORAGE_ACCOUNT_NAME=harvenstorage`, `AZURE_STORAGE_ACCOUNT_KEY=`
- [ ] Task 4: Limpar supabase do codebase (AC: 4, 5)
  - [ ] Deletar `backend/setup_supabase.py` (se existir)
  - [ ] Remover `from supabase import ...` e `supabase = ...` do `main.py`
  - [ ] Remover lifespan context que inicializa supabase
  - [ ] Buscar `grep -r "supabase" backend/` e remover todas as referências
- [ ] Task 5: Build e test (AC: 6, 7)
  - [ ] `docker build -t harven-backend-test ./backend`
  - [ ] `docker run` com env vars Azure e verificar startup
  - [ ] Verificar logs: "Application startup complete"
  - [ ] Verificar que engine conecta ao Azure SQL

---

## Dev Notes

**Dockerfile completo (da arquitetura):**
```dockerfile
FROM python:3.11-slim

LABEL maintainer="Harven.AI Team"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Instalar ODBC Driver 18 para SQL Server + dependências
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    gnupg2 \
    unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**requirements.txt completo (da arquitetura):**
```
# Core Framework
fastapi>=0.110.0
uvicorn[standard]>=0.27.0

# Database (Azure SQL via SQLAlchemy)
sqlalchemy>=2.0.0
pyodbc>=5.0.0

# Azure Storage
azure-storage-blob>=12.19.0
azure-identity>=1.15.0

# Environment & Configuration
python-dotenv>=1.0.1
pydantic>=2.6.0
pydantic-settings>=2.2.1

# File Upload
python-multipart>=0.0.9

# PDF Text Extraction
pdfplumber>=0.10.0

# AI & OpenAI
openai>=1.12.0

# Text-to-Speech (ElevenLabs)
elevenlabs>=1.0.0

# Security
bcrypt>=4.1.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Rate Limiting
slowapi>=0.1.9

# HTTP Client
httpx>=0.26.0

# Utilities
python-dateutil>=2.8.2

# System Monitoring
psutil>=5.9.0
```

**Environment variables (da arquitetura):**
```bash
# Azure SQL Database
DATABASE_URL=mssql+pyodbc://harvenadmin:PASSWORD@harven-sql-server.database.windows.net/harven-db?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=harvenstorage;AccountKey=KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=harvenstorage
AZURE_STORAGE_ACCOUNT_KEY=KEY
```

**Supabase cleanup — o que remover do main.py:**
```python
# REMOVER estes padrões:
from supabase import create_client, Client
supabase: Client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    ...

if not supabase:
    raise HTTPException(status_code=503, detail="Database not connected")
```

**Source tree:**
- `backend/Dockerfile` — atualizar
- `backend/requirements.txt` — atualizar
- `backend/.env.example` — atualizar
- `backend/main.py` — limpar imports e lifespan
- `backend/setup_supabase.py` — deletar (se existir)

### Testing

- `docker build -t harven-backend-test ./backend` — sem erros
- `docker run` com DATABASE_URL válida — container inicia
- `grep -r "supabase" backend/` — zero resultados
- Health check endpoint responde 200

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |

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
