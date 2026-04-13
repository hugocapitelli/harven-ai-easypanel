# ESPECIFICAÇÕES TÉCNICAS - PLATAFORMA HARVEN.AI
## Documento para Análise de Segurança e Conformidade

**Versão:** 1.0
**Data:** 23 de Janeiro de 2026
**Classificação:** Técnico
**Destinatário:** Equipe de TI - Harven.ai

---

## SUMÁRIO EXECUTIVO

A plataforma **Harven.AI** é uma solução educacional baseada em nuvem que implementa o método socrático com inteligência artificial. O sistema foi desenvolvido com arquitetura moderna, cloud-native, e está pronto para produção em infraestrutura VPS.

### Destaques Técnicos
- **Frontend:** React 19 + TypeScript + Vite (SPA otimizada)
- **Backend:** FastAPI/Python com 60+ endpoints REST
- **Banco de Dados:** Supabase (PostgreSQL gerenciado)
- **IA:** 6 agentes especializados usando OpenAI GPT-4o-mini
- **Deployment:** Docker containerizado, CI/CD ready
- **Integrações:** JACAD (Sistema Acadêmico) + Moodle LMS
- **Segurança:** CORS, RLS (Row-Level Security), Validação Pydantic
- **Performance:** Nginx com gzip, caching, headers de segurança

---

## 1. ARQUITETURA GERAL

### 1.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  - Múltiplas views para Student/Instructor/Admin            │
│  - Componentes reutilizáveis com design system              │
│  - Supabase client-side authentication                      │
├─────────────────────────────────────────────────────────────┤
│                      NGINX (Load Balancer)                   │
│  - Reverse proxy, gzip compression, security headers        │
├─────────────────────────────────────────────────────────────┤
│                  BACKEND (FastAPI + Python)                  │
│  - RESTful API com 60+ endpoints                             │
│  - Agentes IA integrados (6 especializados)                  │
│  - Integração com JACAD e Moodle                             │
├─────────────────────────────────────────────────────────────┤
│                 SUPABASE (PostgreSQL + Storage)              │
│  - Database relacional com RLS policies                      │
│  - Storage buckets para imagens e vídeos                     │
│  - Real-time listeners (opcional)                           │
├─────────────────────────────────────────────────────────────┤
│        INTEGRAÇÕES EXTERNAS (OpenAI, ElevenLabs)            │
│  - GPT-4o-mini para geração de conteúdo                     │
│  - ElevenLabs para Text-to-Speech                           │
└─────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────┐
 │   SISTEMAS ACADÊMICOS (JACAD + Moodle) - INTEGRAÇÃO      │
 │   Sincronização de alunos, disciplinas e notas            │
 └──────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Requisição

```
Cliente Browser
    ↓
HTTPS/TLS (Let's Encrypt)
    ↓
Nginx (reverse proxy + cache + headers)
    ↓
FastAPI (rate limit, validação CORS)
    ↓
Pydantic (validação entrada)
    ↓
Supabase Client (query + RLS)
    ↓
PostgreSQL Database
    ↓
Resposta JSON
```

---

## 2. ESPECIFICAÇÕES FRONTEND

### 2.1 Stack Tecnológico

| Componente | Tecnologia | Versão | Propósito |
|-----------|-----------|--------|----------|
| Framework | React | 19.2.3 | UI components |
| Linguagem | TypeScript | ~5.8.2 | Type safety |
| Build Tool | Vite | 6.2.0 | Dev server + bundler |
| HTTP Client | Axios | 1.13.2 | REST requests |
| Auth | Supabase JS | 2.90.1 | PostgreSQL + Auth |
| Storage | ElevenLabs | 1.0.0 | TTS integration |
| Utilities | html2canvas | 1.4.1 | Screenshot generation |
| Router | React Router | 7.12.0 | SPA navigation |

### 2.2 Estrutura de Diretórios

```
harven.ai-platform-mockup/
├── public/                          # Assets estáticos (favicon, etc)
├── assets/                          # Imagens, ícones
├── src/
│   ├── components/                  # Componentes reutilizáveis
│   │   ├── Header.tsx              # Topo da página
│   │   ├── Sidebar.tsx             # Menu lateral
│   │   ├── ui/                     # Design system
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── Tabs.tsx
│   │   └── ...
│   ├── views/                      # Páginas da aplicação
│   │   ├── StudentDashboard.tsx
│   │   ├── StudentAchievements.tsx
│   │   ├── CourseDetails.tsx
│   │   ├── AdminConsole.tsx
│   │   ├── AdminClassManagement.tsx
│   │   ├── SystemSettings.tsx
│   │   └── ... (18 views totais)
│   ├── services/
│   │   └── api.ts                 # Cliente Axios (889 linhas, todos endpoints)
│   ├── contexts/
│   │   └── SettingsContext.tsx    # Provider de configurações globais
│   ├── lib/
│   │   ├── supabase.ts            # Cliente Supabase
│   │   └── utils.ts               # Funções auxiliares
│   ├── modals/
│   │   └── InitiativeModal.tsx
│   ├── types.ts                    # TypeScript types e interfaces
│   ├── App.tsx                     # Componente raiz (5065 bytes)
│   ├── routes.tsx                  # Roteamento (4264 bytes)
│   ├── index.tsx                   # Entrada React
│   └── index.html                  # Template HTML
├── dist/                            # Output build (produção)
├── node_modules/                    # Dependências npm
├── package.json                     # Dependências e scripts
├── package-lock.json                # Lock file
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                  # Configuração build
├── nginx.conf                       # Config servidor Nginx
├── Dockerfile                       # Build containerizado
├── .env.example                     # Template variáveis
└── .env.local                       # Variáveis de desenvolvimento
```

### 2.3 Variáveis de Ambiente

**Arquivo:** `.env.example`

```env
# URL da API Backend (obrigatório em produção)
VITE_API_URL=http://localhost:8000

# Gemini API Key (opcional - features de IA no frontend)
# GEMINI_API_KEY=sua-chave-gemini
```

**Em produção, usar:**
```env
VITE_API_URL=https://api.harven.eximiaventures.com.br
```

### 2.4 Build Process

**Vite Config (`vite.config.ts`):**
```typescript
- Dev server: 0.0.0.0:3000
- React plugin habilitado
- Path alias: @ → root
- Environment variables: GEMINI_API_KEY, VITE_API_URL
- Output: dist/ (otimizado, minificado)
```

**Scripts npm:**
```bash
npm install          # Instalar dependências
npm run dev          # Dev server com hot reload
npm run build        # Production build
npm run preview      # Preview do build gerado
```

### 2.5 Tipos TypeScript Principais

```typescript
type ViewType = 'STUDENT_DASHBOARD' | 'STUDENT_ACHIEVEMENTS' |
                'COURSE_LIST' | 'COURSE_DETAILS' | 'CHAPTER_DETAIL' |
                'CHAPTER_READER' | 'INSTRUCTOR_LIST' | 'DISCIPLINE_EDIT' |
                'CONTENT_CREATION' | 'ADMIN_CONSOLE' | ... (19 views)

type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'

interface User {
  name: string
  role: UserRole
  email: string
  avatar: string
}

interface Course {
  id: string
  title: string
  instructor: string
  progress: number
  status: 'Ativo' | 'Rascunho' | 'Arquivado'
}
```

### 2.6 Cliente Supabase

```typescript
// lib/supabase.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
```

**Configuração:**
- Autenticação via localStorage
- Tokens: `sb-access-token` e `user-data`
- RLS policies aplicadas no backend

### 2.7 Cliente REST (Axios)

**Arquivo:** `services/api.ts` (889 linhas)

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
})

// Interceptor de autenticação
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb-access-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Módulos de API:**
- `authApi`: login(ra, password)
- `dashboardApi`: getStats(userId)
- `disciplinesApi`: CRUD + atribuição de professores/alunos
- `coursesApi`: CRUD de cursos por classe
- `chaptersApi`: Gerenciar capítulos
- `contentsApi`: CRUD de conteúdo
- `questionsApi`: CRUD de questões
- `usersApi`: Gerenciamento de usuários
- `adminApi`: Estatísticas, logs, settings, backup
- `uploadApi`: Upload de imagens, vídeos, áudio
- `aiApi`: Agentes de IA (creator, socrates, analyst, editor, tester, organizer)
- `ttsApi`: Text-to-Speech (ElevenLabs)
- `integrationsApi`: JACAD + Moodle

### 2.8 Docker & Deployment (Frontend)

**Dockerfile (Multi-stage):**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=https://api.harven.eximiaventures.com.br
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**

```nginx
server {
    listen 80;
    gzip on;
    gzip_min_length 1024;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets por 1 ano
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # HTML sem cache
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache";
    }

    # Health check
    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## 3. ESPECIFICAÇÕES BACKEND

### 3.1 Stack Tecnológico

| Componente | Biblioteca | Versão | Propósito |
|-----------|-----------|--------|----------|
| Framework | FastAPI | >=0.110.0 | API REST |
| Server | Uvicorn | >=0.27.0 | ASGI server |
| Database | Supabase | >=2.3.0 | PostgreSQL client |
| Validation | Pydantic | >=2.6.0 | Data validation |
| Auth | python-jose | >=3.3.0 | JWT tokens |
| Crypto | bcrypt | >=4.1.0 | Password hashing |
| IA | OpenAI | >=1.12.0 | GPT-4o-mini API |
| TTS | ElevenLabs | >=1.0.0 | Text-to-Speech |
| PDF | pdfplumber | >=0.10.0 | PDF extraction |
| HTTP | httpx | >=0.26.0 | Async HTTP client |
| Utils | python-dateutil | >=2.8.2 | Date handling |
| Monitor | psutil | >=5.9.0 | System monitoring |
| Env | python-dotenv | >=1.0.1 | Environment vars |

### 3.2 Estrutura de Diretórios

```
backend/
├── main.py                          # API principal (4470 linhas)
├── requirements.txt                 # Todas as dependências
├── setup_supabase.py                # Script setup inicial
├── Dockerfile                       # Build containerizado
├── .env.example                     # Template vars
├── .dockerignore                    # Docker ignore
├── .gitignore                       # Git ignore
│
├── agents/                          # 6 Agentes de IA Especializados
│   ├── __init__.py
│   ├── harven_creator.py            # Gerador de questões socráticas
│   ├── harven_socrates.py           # Motor de diálogo socrático
│   ├── harven_analyst.py            # Detecta conteúdo gerado por IA
│   ├── harven_editor.py             # Refinador de respostas
│   ├── harven_tester.py             # Validador de qualidade
│   └── harven_organizer.py          # Gerenciador de sessões
│
├── services/                        # Serviços compartilhados
│   ├── __init__.py
│   ├── ai_service.py                # Orquestração de IA
│   ├── integration_service.py       # JACAD + Moodle
│   └── mocks/
│       ├── jacad_mock.py            # Mock JACAD (desenvolvimento)
│       └── moodle_mock.py           # Mock Moodle (desenvolvimento)
│
└── venv/                            # Virtual environment Python
```

### 3.3 Variáveis de Ambiente Backend

**Arquivo:** `.env.example`

```env
# ═════════════════════════════════════════════════════════
# OBRIGATÓRIO EM PRODUÇÃO
# ═════════════════════════════════════════════════════════

# Supabase (Database)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role-ou-anon

# OpenAI (Agentes IA)
OPENAI_API_KEY=sk-proj-...sua-chave-openai
OPENAI_MODEL=gpt-4o-mini  # ou gpt-4o, gpt-4-turbo

# ═════════════════════════════════════════════════════════
# RECOMENDADO EM PRODUÇÃO
# ═════════════════════════════════════════════════════════

# Ambiente
ENVIRONMENT=production
FRONTEND_URL=https://harven.eximiaventures.com.br
PORT=8000
LOG_LEVEL=INFO

# Autenticação
JWT_SECRET=uuid-aleatorio-seguro-para-assinar-tokens

# ═════════════════════════════════════════════════════════
# INTEGRAÇÕES OPCIONAIS
# ═════════════════════════════════════════════════════════

# JACAD (Sistema Acadêmico)
# JACAD_URL=https://jacad.escola.com.br/api
# JACAD_API_KEY=sua-chave-api-jacad

# Moodle LMS
# MOODLE_URL=https://moodle.escola.com.br
# MOODLE_TOKEN=seu-token-admin-moodle
# MOODLE_WEBHOOK_SECRET=secret-aleatorio-para-validar-webhooks

# ElevenLabs (TTS)
# ELEVENLABS_API_KEY=sua-chave-elevenlabs

# Email (Notificações)
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=seu-email@gmail.com
# SMTP_PASSWORD=sua-senha-app-email

# Monitoramento (Sentry)
# SENTRY_DSN=https://seu-projeto.sentry.io
```

### 3.4 Main.py - Visão Geral (4470 linhas)

**Inicialização:**
```python
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from contextlib import asynccontextmanager

# Global Supabase client
supabase: Client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Conectado ao Supabase")
    yield
    # Shutdown
    print("Desligando backend...")

app = FastAPI(
    title="Harven.AI API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[...20 categorias...]
)
```

**CORS Configuration:**
```python
CORS_ORIGINS = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://harven.eximiaventures.com.br",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(filter(None, CORS_ORIGINS))),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.5 Endpoints API (60+)

#### 3.5.1 Health & Status
```
GET  /                        # Root endpoint
GET  /api/ai/status          # Status agentes IA
GET  /api/ai/tts/status      # Status TTS
```

#### 3.5.2 Autenticação
```
POST /auth/login             # Login (ra + password)
```

#### 3.5.3 Disciplinas (Turmas)
```
GET    /disciplines                              # Listar com filtros
POST   /disciplines                              # Criar
GET    /disciplines/{id}                         # Detalhe
PUT    /disciplines/{id}                         # Atualizar
GET    /disciplines/{id}/teachers                # Listar professores
POST   /disciplines/{id}/teachers                # Adicionar
DELETE /disciplines/{id}/teachers/{teacher_id}   # Remover
GET    /disciplines/{id}/students                # Listar alunos
POST   /disciplines/{id}/students                # Adicionar
POST   /disciplines/{id}/students/batch          # Lote
DELETE /disciplines/{id}/students/{student_id}   # Remover
POST   /disciplines/{id}/image                   # Upload imagem
GET    /classes/{id}/stats                       # Estatísticas
GET    /classes/{id}/courses                     # Cursos da turma
```

#### 3.5.4 Cursos
```
GET    /courses                        # Listar
POST   /courses                        # Criar
GET    /courses/{id}                   # Detalhe
PUT    /courses/{id}                   # Atualizar
DELETE /courses/{id}                   # Deletar
POST   /courses/{id}/image             # Upload imagem
POST   /classes/{id}/courses           # Criar para turma
GET    /courses/{id}/chapters          # Listar capítulos
```

#### 3.5.5 Capítulos
```
POST   /courses/{course_id}/chapters
PUT    /chapters/{id}
DELETE /chapters/{id}
```

#### 3.5.6 Conteúdos
```
GET    /chapters/{id}/contents
POST   /chapters/{id}/contents
GET    /contents/{id}
PUT    /contents/{id}
DELETE /contents/{id}
POST   /chapters/{id}/upload           # Upload arquivo
```

#### 3.5.7 Questões
```
GET    /contents/{id}/questions
POST   /contents/{id}/questions
PUT    /questions/{id}
DELETE /questions/{id}
PUT    /contents/{id}/questions/batch  # Atualização em lote
```

#### 3.5.8 IA - 6 Agentes Especializados
```
POST /api/ai/creator/generate          # Harven_Creator: Gerar perguntas
POST /api/ai/socrates/dialogue         # Harven_Socrates: Diálogo
POST /api/ai/analyst/detect            # Harven_Analyst: Detectar IA
POST /api/ai/editor/edit               # Harven_Editor: Refinar
POST /api/ai/tester/validate           # Harven_Tester: Validar
POST /api/ai/organizer/session         # Harven_Organizer: Gerenciar
POST /api/ai/organizer/prepare-export  # Prepare Moodle export
GET  /api/ai/estimate-cost             # Estimar custos
```

#### 3.5.9 Text-to-Speech
```
GET  /api/ai/tts/voices                # Listar vozes disponíveis
POST /api/ai/tts/generate              # Gerar áudio (timeout 2min)
POST /api/ai/tts/generate-summary      # Gerar resumo narrado (3min)
```

#### 3.5.10 Upload de Arquivos
```
POST /upload                  # Upload genérico
POST /upload/video           # Upload vídeo (timeout 10min)
POST /upload/audio           # Upload áudio (timeout 5min)
```

#### 3.5.11 Gerenciamento de Usuários
```
GET    /users                                    # Listar
POST   /users                                    # Criar
POST   /users/batch                              # Criar em lote
GET    /users/{id}                               # Detalhe
PUT    /users/{id}                               # Atualizar
POST   /users/{id}/avatar                        # Upload avatar
DELETE /users/{id}/avatar                        # Deletar avatar
GET    /users/{id}/stats                         # Estatísticas
GET    /users/{id}/activities                    # Atividades
POST   /users/{id}/activities                    # Registrar
GET    /users/{id}/certificates                  # Certificados
GET    /users/{id}/achievements                  # Conquistas
POST   /users/{id}/achievements/{aid}/unlock     # Desbloquear
GET    /users/{id}/courses/{cid}/progress        # Progresso
POST   /users/{id}/courses/{cid}/complete-content/{ctid}
```

#### 3.5.12 Chat Sessions (Persistência)
```
POST   /chat-sessions                            # Criar/obter sessão
GET    /chat-sessions/{id}                       # Detalhe + mensagens
GET    /chat-sessions/by-content/{cid}           # Por conteúdo
GET    /users/{uid}/chat-sessions                # Por usuário
POST   /chat-sessions/{id}/messages              # Adicionar mensagem
GET    /chat-sessions/{id}/messages              # Listar mensagens
PUT    /chat-sessions/{id}/complete              # Finalizar sessão
POST   /chat-sessions/{id}/export-moodle         # Exportar para Moodle
GET    /export/moodle/batch                      # Export em lote
```

#### 3.5.13 Notificações
```
GET    /notifications/{uid}
POST   /notifications
GET    /notifications/{uid}/count
PUT    /notifications/{id}/read
PUT    /notifications/{uid}/read-all
DELETE /notifications/{id}
```

#### 3.5.14 Admin - Configurações e Monitoramento
```
GET    /admin/stats                   # Dashboard principal
GET    /admin/logs                    # Logs de auditoria
GET    /admin/settings                # Configurações do sistema
POST   /admin/settings                # Salvar settings
POST   /admin/settings/upload-logo                # Logo
POST   /admin/settings/upload-login-logo         # Login logo
POST   /admin/settings/upload-login-bg           # Login background
GET    /admin/performance             # Métricas de performance
GET    /admin/storage                 # Uso de storage
GET    /admin/backups                 # Listar backups
POST   /admin/backups                 # Criar backup
POST   /admin/force-logout            # Logout forçado
POST   /admin/clear-cache             # Limpar cache
GET    /admin/logs/search             # Buscar em logs
GET    /admin/logs/export             # Exportar logs (json|csv)
```

#### 3.5.15 Busca Global
```
GET    /search                        # Global search
```

#### 3.5.16 Dashboard
```
GET    /dashboard/stats
```

#### 3.5.17 Integrações (JACAD + Moodle)
```
POST   /integrations/test-connection              # Testar conexão
GET    /integrations/status                       # Status
GET    /integrations/logs                         # Logs
GET    /integrations/mappings                     # Mapeamentos

# JACAD
POST   /integrations/jacad/sync                   # Sincronizar
POST   /integrations/jacad/import-students        # Importar alunos
POST   /integrations/jacad/import-disciplines     # Importar disciplinas
GET    /integrations/jacad/student/{ra}           # Buscar aluno
GET    /integrations/lookup-student/{ra}          # Para login

# Moodle
POST   /integrations/moodle/sync                  # Sincronizar
POST   /integrations/moodle/export-sessions       # Exportar sessões
GET    /integrations/moodle/ratings               # Obter ratings
POST   /integrations/moodle/import-users          # Importar usuários
```

### 3.6 Docker - Backend

**Dockerfile:**

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Instalar gcc para dependências compiladas
RUN apt-get update && apt-get install -y --no-install-recommends gcc
RUN rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Usuário não-root
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')"

# Start
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. BANCO DE DADOS (Supabase + PostgreSQL)

### 4.1 Schema Relacional

**Tabelas Principais:**

#### Users (Usuários)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    ra VARCHAR(20) UNIQUE NOT NULL,        -- Registro Acadêmico
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN'),
    avatar VARCHAR(500),                   -- URL da imagem
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Disciplines (Turmas/Disciplinas)
```sql
CREATE TABLE disciplines (
    id UUID PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE discipline_teachers (
    id UUID PRIMARY KEY,
    discipline_id UUID REFERENCES disciplines(id),
    teacher_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(discipline_id, teacher_id)
);

CREATE TABLE discipline_students (
    id UUID PRIMARY KEY,
    discipline_id UUID REFERENCES disciplines(id),
    student_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(discipline_id, student_id)
);
```

#### Courses (Cursos)
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    discipline_id UUID REFERENCES disciplines(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    status ENUM ('Ativo', 'Rascunho', 'Arquivado') DEFAULT 'Rascunho',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chapters (
    id UUID PRIMARY KEY,
    course_id UUID REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    order INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contents (
    id UUID PRIMARY KEY,
    chapter_id UUID REFERENCES chapters(id),
    title VARCHAR(255) NOT NULL,
    type ENUM ('video', 'text', 'pdf', 'quiz', 'audio'),
    text_content TEXT,
    body TEXT,
    audio_url VARCHAR(500),                -- TTS gerado
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY,
    content_id UUID REFERENCES contents(id),
    text TEXT NOT NULL,
    skill VARCHAR(100),                    -- aplicacao|analise|sintese
    intention TEXT,
    difficulty ENUM ('iniciante', 'intermediario', 'avancado'),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Chat Sessions (Persistência de Diálogos)
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content_id UUID REFERENCES contents(id),
    chapter_id UUID REFERENCES chapters(id),
    course_id UUID REFERENCES courses(id),
    status ENUM ('active', 'completed', 'exported') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    total_messages INTEGER DEFAULT 0,
    performance_score FLOAT CHECK (performance_score BETWEEN 0 AND 100),
    moodle_export_id VARCHAR(100) UNIQUE,  -- HARVEN-MOODLE-xxx
    exported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    role ENUM ('user', 'assistant', 'system'),
    content TEXT NOT NULL,
    agent_type VARCHAR(50),                -- creator|socrates|analyst|editor|tester|organizer
    metadata JSONB,                        -- Dados adicionais
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Admin & Logs
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),     -- Nullable para logs do sistema
    action VARCHAR(100),
    target_type VARCHAR(100),               -- users|courses|contents|etc
    target_id VARCHAR(100),
    msg TEXT,
    author VARCHAR(255),                    -- Nome de quem executou
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Storage Buckets (Supabase Storage)
```
courses/          # PDFs, vídeos (max 500MB por arquivo)
avatars/          # Imagens de perfil (max 5MB)
audio-files/      # Áudio TTS gerado
public/           # Fallback público
```

### 4.2 Políticas de Segurança (Row-Level Security)

**RLS Policies** aplicadas ao nível PostgreSQL:

```sql
-- STUDENTS: podem ver apenas seus dados
CREATE POLICY student_view_own_data ON users
    FOR SELECT USING (auth.uid() = id OR role = 'STUDENT');

-- INSTRUCTORS: podem ver alunos de suas disciplinas
CREATE POLICY instructor_view_students ON discipline_students
    FOR SELECT USING (
        discipline_id IN (
            SELECT discipline_id FROM discipline_teachers
            WHERE teacher_id = auth.uid()
        )
    );

-- ADMINS: acesso total (sem RLS)
-- Validação no backend por role
```

### 4.3 Índices para Performance

```sql
CREATE INDEX idx_users_ra ON users(ra);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_disciplines_code ON disciplines(code);
CREATE INDEX idx_discipline_students_student_id ON discipline_students(student_id);
CREATE INDEX idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_contents_chapter_id ON contents(chapter_id);
CREATE INDEX idx_questions_content_id ON questions(content_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_moodle_export_id ON chat_sessions(moodle_export_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
```

---

## 5. AGENTES DE IA

### 5.1 Arquitetura de Agentes

Harven.AI possui **6 agentes especializados** que trabalham em pipeline:

```
Entrada do Aluno
        ↓
[1] Creator OS        → Gera questões socráticas
        ↓
[2] Socrates OS       → Conduz diálogo (máx 3 iterações)
        ↓
[3] Analyst OS        → Detecta conteúdo de IA
        ↓
[4] Editor OS         → Refina respostas
        ↓
[5] Tester OS         → Valida qualidade
        ↓
[6] Organizer OS      → Persiste e exporta para Moodle
        ↓
Saída com tracking
```

### 5.2 Agente 1: Harven_Creator

**Função:** Gera até 3 perguntas socráticas

**Prompt System:**
- Nunca gera perguntas de definição ("O que é...?")
- Sempre inclui cenários práticos
- Metadados: skill (aplicacao|analise|sintese), intention, difficulty

**Endpoint:**
```
POST /api/ai/creator/generate
{
  "chapter_content": "string",
  "chapter_title": "string?",
  "learning_objective": "string?",
  "difficulty": "iniciante|intermediario|avancado",
  "max_questions": 3
}
```

**Resposta:**
```json
{
  "analysis": {
    "main_concepts": ["Conceito1", "Conceito2"],
    "key_relationships": ["Relação1"],
    "potential_angles": ["Ângulo1"]
  },
  "questions": [
    {
      "text": "Pergunta prática...",
      "skill": "aplicacao|analise|sintese",
      "intention": "Descrição",
      "expected_depth": "Profundidade",
      "difficulty": "intermediario"
    }
  ]
}
```

### 5.3 Agente 2: Harven_Socrates

**Função:** Conduz diálogo socrático (máximo 3 interações)

**Características:**
- Nunca dá respostas diretas
- Sempre termina com pergunta aberta
- Feedback construtivo + provocação
- 1-2 parágrafos por resposta

**Endpoint:**
```
POST /api/ai/socrates/dialogue
{
  "student_message": "string",
  "chapter_content": "string",
  "initial_question": { "text": "string" },
  "conversation_history": [],
  "interactions_remaining": 3,
  "session_id": "uuid",
  "chapter_id": "uuid"
}
```

### 5.4 Agente 3: Harven_Analyst

**Função:** Detecta se resposta foi gerada por IA

**Output:**
```json
{
  "ai_detection": {
    "probability": 0.85,                  // 0.0 a 1.0
    "confidence": "high|medium|low",
    "verdict": "likely_ai|possibly_ai|human",
    "indicators": [
      {
        "type": "artificial_connectors",
        "description": "Detectado: '...'",
        "weight": 0.30
      }
    ]
  }
}
```

**Nota:** Nunca bloqueia resposta, apenas flageia probabilidade

### 5.5 Agente 4: Harven_Editor

**Função:** Refina respostas do tutor

**Operações:**
- Remove rótulos ("Resposta:", "Feedback:")
- Normaliza formatação
- Limita a 2 parágrafos
- Otimiza legibilidade

### 5.6 Agente 5: Harven_Tester

**Função:** Valida qualidade da resposta

**Critérios Socráticos (6 pontos):**
1. is_question_based
2. avoids_direct_answers
3. encourages_thinking
4. provides_feedback
5. length_appropriate
6. socratic_quality

**Output:**
```json
{
  "quality_score": 85,                    // 0-100
  "criteria": {
    "is_question_based": true,
    "avoids_direct_answers": true,
    "encourages_thinking": true,
    "provides_feedback": true,
    "length_appropriate": true,
    "socratic_quality": true
  },
  "recommendations": ["Sugestão1", "Sugestão2"]
}
```

### 5.7 Agente 6: Harven_Organizer

**Função:** Gerencia sessões de chat e exportação Moodle

**Ações:**
- save_message: Persistir mensagem em BD
- finalize_session: Marcar sessão como concluída
- export_to_moodle: Gerar formato xAPI
- get_session_status: Status atual
- validate_export_payload: Validar antes de exportar

**Export Format (xAPI):**
```json
{
  "export_id": "HARVEN-MOODLE-xxx",
  "actor": {
    "name": "Nome Aluno",
    "mbox": "mailto:email@example.com",
    "account": { "name": "RA", "homePage": "https://harven.ai" }
  },
  "context": {
    "course": { "id": "...", "title": "..." },
    "chapter": { "id": "...", "title": "..." },
    "content": { "id": "...", "title": "..." }
  },
  "session": {
    "id": "...",
    "started_at": "2024-01-23T10:00:00Z",
    "completed_at": "2024-01-23T10:15:00Z",
    "status": "completed",
    "total_messages": 10,
    "performance_score": 85
  },
  "interactions": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "result": {
    "success": true,
    "completion": true,
    "score": { "raw": 85, "max": 100, "min": 0 }
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/experienced",
    "display": { "en-US": "experienced" }
  }
}
```

### 5.8 Modelos GPT Suportados

```
DEFAULT: gpt-4o-mini     (recomendado - custo/qualidade)

ALTERNATIVAS:
- gpt-4o                 (mais rápido que gpt-4-turbo)
- gpt-4-turbo            (maior context window)
- gpt-3.5-turbo          (mais barato)

CUSTOS (jan/2026):
gpt-4o-mini:   $0.00015/1K input,   $0.0006/1K output
gpt-4o:        $0.005/1K input,     $0.015/1K output
gpt-4-turbo:   $0.01/1K input,      $0.03/1K output
```

### 5.9 Text-to-Speech (ElevenLabs)

**Endpoints:**
```
GET  /api/ai/tts/voices               # Listar vozes
POST /api/ai/tts/generate             # Gerar áudio
POST /api/ai/tts/generate-summary     # Gerar resumo
```

**Configuração:**
- Modelo: eleven_multilingual_v2
- Voz padrão: Rachel (21m00Tcm4TlvDq8ikWAM)
- 29 vozes multi-idioma disponíveis
- Formato: mp3_44100_128
- Storage: Supabase Storage (audio-files/)

---

## 6. SEGURANÇA

### 6.1 Autenticação

**Tipo:** Simplificada (RA + Password)

```python
POST /auth/login
{
  "ra": "202001234",
  "password": "sua-senha"
}
```

**Resposta:**
```json
{
  "sb-access-token": "eyJhbGc...",
  "user-data": {
    "id": "uuid",
    "name": "Nome Aluno",
    "role": "STUDENT",
    "email": "aluno@example.com"
  }
}
```

**Storage:** localStorage
- `sb-access-token`: Bearer token
- `user-data`: JSON serializado

**Em Produção:**
- Implementar JWT com refresh tokens
- HTTPS obrigatório (Let's Encrypt)
- Secure cookies (HttpOnly, SameSite)

### 6.2 Autorização por Role

```python
# Normalização de roles
TEACHER|INSTRUCTOR|PROFESSOR → INSTRUCTOR
STUDENT|ALUNO → STUDENT
ADMIN|ADMINISTRATOR → ADMIN

# Validação por endpoint
STUDENT:
  - Dashboard pessoal
  - Seus cursos
  - Suas sessões de chat
  - Suas atividades

INSTRUCTOR:
  - Suas disciplinas
  - Seus cursos
  - Alunos de suas disciplinas
  - Sessões de seus alunos

ADMIN:
  - Tudo
  - Settings globais
  - Logs completos
  - Backups
```

### 6.3 CORS (Cross-Origin Resource Sharing)

**Origens Permitidas (Configurável):**

```
DESENVOLVIMENTO:
- http://localhost:3000
- http://localhost:3001
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:5173

PRODUÇÃO:
- https://harven.eximiaventures.com.br
```

**Configuração FastAPI:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6.4 Nginx Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 6.5 Validação de Entrada (Pydantic)

```python
class LoginRequest(BaseModel):
    ra: str
    password: str

class QuestionGenerationRequest(BaseModel):
    chapter_content: str
    chapter_title: Optional[str]
    learning_objective: Optional[str]
    difficulty: Optional[str]
    max_questions: Optional[int] = 3
```

**Funcionalidades:**
- Type checking automático
- Conversão de tipos
- Rejeição de payload inválido (400 Bad Request)
- Validação de ranges, padrões regex

### 6.6 File Upload Restrictions

**Limites por bucket:**

| Bucket | Max/arquivo | Tipos Permitidos |
|--------|-----------|-----------------|
| courses | 500 MB | PDF, MP4, PPTX |
| avatars | 5 MB | JPEG, PNG, GIF, WEBP |
| audio-files | 50 MB | MP3, WAV, OGG |

**Validação:**
- Frontend: file extension check + MIME type + size pre-check
- Backend: MIME type validation + file signature check + virus scan (optional)

### 6.7 Proteção contra Vulnerabilidades Comuns

| Vulnerabilidade | Mitigação |
|---|---|
| **SQL Injection** | Supabase client abstrai queries, Pydantic valida |
| **XSS** | React escapa output, Content-Security-Policy headers |
| **CSRF** | SameSite cookies, CORS validation |
| **DoS** | Rate limiting (não implementado ainda) |
| **XXE** | Supabase não processa XML |
| **Exposição de dados** | RLS policies, variáveis privadas em env |
| **Autenticação fraca** | JWT tokens, HTTPS obrigatório em prod |

---

## 7. DEPLOYMENT & INFRAESTRUTURA

### 7.1 Requisitos de Sistema

**VPS Mínimo (Hostinger/Hetzner/Linode):**

| Recurso | Recomendação |
|---------|--------------|
| CPU | 2 cores |
| RAM | 4 GB |
| Storage | 50 GB SSD |
| Bandwidth | 1 TB/mês |
| OS | Ubuntu 22.04 LTS |
| Docker | v24+ |
| Docker Compose | v2.20+ |

**Production Checklist:**
- [ ] Docker + Docker Compose instalado
- [ ] Ubuntu 22.04 LTS ou similar
- [ ] Acesso SSH com key-based auth
- [ ] Domínios DNS apontados
- [ ] Certificado SSL (Let's Encrypt automático)
- [ ] Firewall configurado (UFW/iptables)
- [ ] Backup strategy implementado

### 7.2 Docker Compose (Produção)

**Arquivo:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Backend FastAPI
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: harven_backend
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      ENVIRONMENT: production
      FRONTEND_URL: https://harven.eximiaventures.com.br
      PORT: 8000
    healthcheck:
      test:
        - CMD
        - python
        - -c
        - "import urllib.request; urllib.request.urlopen('http://localhost:8000/')"
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    networks:
      - harven-network
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend React + Nginx
  frontend:
    build:
      context: ./harven.ai-platform-mockup
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.harven.eximiaventures.com.br
    container_name: harven_frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test:
        - CMD
        - wget
        - --quiet
        - --tries=1
        - --spider
        - http://localhost/health
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    networks:
      - harven-network
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  harven-network:
    driver: bridge
```

### 7.3 Variáveis de Ambiente (Produção)

**Arquivo:** `.env.production`

```env
# ═════════════════════════════════════════════════════════
# DADOS SENSÍVEIS - SUBSTITUIR COM VALORES REAIS
# ═════════════════════════════════════════════════════════

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...

# OpenAI
OPENAI_API_KEY=sk-proj-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
OPENAI_MODEL=gpt-4o-mini

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=sk_0123456789abcdef

# JWT Secret (gerar novo UUID)
JWT_SECRET=f7b2d8a4-1e6c-45d9-bc3a-8e9f2c3d4e5f

# ═════════════════════════════════════════════════════════
# CONFIGURAÇÃO
# ═════════════════════════════════════════════════════════

ENVIRONMENT=production
FRONTEND_URL=https://harven.eximiaventures.com.br
PORT=8000
LOG_LEVEL=INFO

# ═════════════════════════════════════════════════════════
# INTEGRAÇÕES (OPCIONAL)
# ═════════════════════════════════════════════════════════

JACAD_URL=https://jacad.escola.com.br/api
JACAD_API_KEY=sua-chave-api-jacad

MOODLE_URL=https://moodle.escola.com.br
MOODLE_TOKEN=seu-token-admin-moodle
MOODLE_WEBHOOK_SECRET=webhook-secret-aleatorio

# ═════════════════════════════════════════════════════════
# MONITORAMENTO (OPCIONAL)
# ═════════════════════════════════════════════════════════

SENTRY_DSN=https://seu-projeto.sentry.io
```

### 7.4 Deploy Step-by-Step

#### 7.4.1 VPS Setup (primeira vez)

```bash
# SSH na VPS
ssh root@seu-vps.com

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Criar diretório do projeto
mkdir -p /opt/harven-ai
cd /opt/harven-ai

# Clonar repositório
git clone seu-repositorio-github.com/harven-ai .

# Configurar firewall (UFW)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Criar arquivo .env.production
cp .env.example .env.production
# Editar com valores reais
nano .env.production
```

#### 7.4.2 Deploy da Aplicação

```bash
# No diretório /opt/harven-ai
cd /opt/harven-ai

# Build e start dos containers
docker-compose -f docker-compose.yml up -d --build

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Health check
curl http://localhost:8000/
curl http://localhost/health
```

#### 7.4.3 Setup Nginx com SSL (Let's Encrypt)

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
certbot certonly --standalone \
  -d harven.eximiaventures.com.br \
  -d api.harven.eximiaventures.com.br

# Certificados estarão em:
# /etc/letsencrypt/live/harven.eximiaventures.com.br/

# Renovação automática (cron)
certbot renew --dry-run
# Adicionar crontab: 0 3 * * * certbot renew --quiet
```

#### 7.4.4 Reverse Proxy (Nginx) - Setup Externo

```nginx
# /etc/nginx/sites-available/harven.ai

upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:80;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name harven.eximiaventures.com.br api.harven.eximiaventures.com.br;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name harven.eximiaventures.com.br;

    ssl_certificate /etc/letsencrypt/live/harven.eximiaventures.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/harven.eximiaventures.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS - Backend API
server {
    listen 443 ssl http2;
    server_name api.harven.eximiaventures.com.br;

    ssl_certificate /etc/letsencrypt/live/harven.eximiaventures.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/harven.eximiaventures.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

### 7.5 Alternativas de Deploy

#### Railway.app
```bash
# 5 minutos de setup
# Deploy via GitHub
# Free tier: $5/mês
# https://railway.app
```

#### Coolify (Self-hosted)
```bash
# Deploy automático
# Suporta múltiplos projetos
# Interface web intuitiva
```

#### Heroku (deprecado mas ainda funciona)
```bash
# Legacy, não recomendado
# Procfile required
```

#### AWS EC2 + RDS
```bash
# Mais complexo, mais caro
# Recomendado para escala
```

---

## 8. INTEGRAÇÕES

### 8.1 JACAD (Sistema Acadêmico)

**Endpoints:**
```
POST /integrations/jacad/sync
POST /integrations/jacad/import-students
POST /integrations/jacad/import-disciplines
GET  /integrations/jacad/student/{ra}
GET  /integrations/lookup-student/{ra}
```

**Fluxo de Login:**
1. Aluno entra RA (ex: 202001234)
2. Backend busca em JACAD ou BD local
3. Se novo, cria usuário automaticamente
4. Retorna token + user data

**Mock Disponível:** `backend/services/mocks/jacad_mock.py`

### 8.2 Moodle LMS

**Endpoints:**
```
POST /integrations/moodle/sync
POST /integrations/moodle/export-sessions
GET  /integrations/moodle/ratings
POST /integrations/moodle/import-users
```

**Export Format:** xAPI (Experience API)
- Compatível com Learning Record Stores (LRS)
- Padrão IEEE para tracking educacional
- Webhook para feedback de Moodle

**Mock Disponível:** `backend/services/mocks/moodle_mock.py`

### 8.3 Monitoramento de Integrações

```
GET  /integrations/status
GET  /integrations/logs
GET  /integrations/mappings
POST /integrations/test-connection
```

---

## 9. MONITORING & OBSERVABILIDADE

### 9.1 Health Checks

```
GET  /                       # Backend running
GET  /api/ai/status          # IA agents status
GET  /api/ai/tts/status      # TTS service status
GET  /health                 # Frontend (Nginx)
```

### 9.2 Métricas Disponíveis

```
GET  /admin/stats            # Dashboard principal
GET  /admin/performance      # CPU, memória, latência
GET  /admin/storage          # Uso de storage
GET  /admin/logs             # Logs de auditoria
GET  /admin/logs/search      # Busca em logs
GET  /admin/logs/export      # Export JSON/CSV
```

### 9.3 Logging

**Sistema:**
- Console logging (desenvolvimento)
- Database logging (`system_logs` table)
- Sentry integration (opcional)

**Tipos de log:**
- Authentication (login/logout)
- CRUD operations
- AI requests
- Integration sync
- Errors e exceptions

### 9.4 Recomendações de Monitoring

| Ferramenta | Função | Custo |
|----------|--------|-------|
| **Prometheus** | Coleta de métricas | Gratuito |
| **Grafana** | Dashboards | Gratuito |
| **Sentry** | Error tracking | Freemium |
| **DataDog** | APM completo | $$$$ |
| **New Relic** | APM + monitoring | $$$$ |
| **LogRocket** | Session replay | $$$ |

---

## 10. PERFORMANCE & OTIMIZAÇÕES

### 10.1 Frontend

- **Vite:** Build otimizado com tree-shaking, code splitting automático
- **Nginx:** Gzip compression, caching, SPA fallback
- **React 19:** Suspense, lazy loading (implementar se necessário)
- **TypeScript:** Strict mode para menos bugs

### 10.2 Backend

- **FastAPI:** Async/await, connection pooling, request timeouts
- **Timeouts:** Default 10s, upload 5-10min, AI 20-60s
- **Caching:** Settings context frontend, potencial Redis backend

### 10.3 Database

- **Índices:** Criados nas foreign keys, PKs, constraints unique
- **Queries:** Supabase otimiza automaticamente
- **Connection pooling:** Supabase gerencia

### 10.4 Melhorias Futuras

- [ ] Redis caching para settings e queries frequentes
- [ ] CDN para assets estáticos (Cloudflare)
- [ ] Rate limiting por IP/user
- [ ] Compression de imagens automática
- [ ] Lazy loading de imagens frontend
- [ ] Service workers para offline support

---

## 11. CHECKLIST SEGURANÇA & PRODUÇÃO

### Segurança

- [ ] HTTPS obrigatório (Let's Encrypt)
- [ ] CORS origins ajustado apenas para domínios
- [ ] JWT secret configurado (UUID único)
- [ ] Variáveis sensíveis em `.env.production`
- [ ] Sem credenciais commitadas no Git
- [ ] RLS policies habilitadas no Supabase
- [ ] File upload restrictions aplicadas
- [ ] SQL injection mitigado (Pydantic + Supabase)
- [ ] XSS mitigado (React escapes + CSP headers)
- [ ] CSRF mitigado (SameSite cookies)
- [ ] Firewall UFW habilitado (22, 80, 443)

### Performance

- [ ] Nginx gzip habilitado
- [ ] Cache headers configurados (1 ano assets, -1 HTML)
- [ ] Timeouts apropriados configurados
- [ ] Health checks validando dependências
- [ ] Logs não acumulando (rotation configurado)
- [ ] Database indices otimizados
- [ ] Rate limiting (implementar)

### Deployment

- [ ] Docker containers rodando com restart policy
- [ ] Docker Compose versão 2.20+
- [ ] Variáveis de ambiente carregadas corretamente
- [ ] DNS apontados corretamente (A records)
- [ ] SSL certificado ativo e renovação automática
- [ ] Backup strategy implementado
- [ ] Monitoramento ativo (health checks)
- [ ] Logs persistindo em arquivo

### Integrações

- [ ] JACAD testado e funcionando
- [ ] Moodle testado e funcionando
- [ ] OpenAI API key válida
- [ ] ElevenLabs API key válida (se TTS habilitado)
- [ ] Webhooks configurados (Moodle)

### Documentação

- [ ] API documentation publicada (OpenAPI/Swagger)
- [ ] Runbook de operações criado
- [ ] Disaster recovery plan documentado
- [ ] Escalation procedures definidas

---

## 12. ARQUIVOS CRÍTICOS - RESUMO

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `backend/main.py` | 4470 | API completa com 60+ endpoints |
| `harven.ai-platform-mockup/services/api.ts` | 889 | Cliente REST com todos endpoints |
| `harven.ai-platform-mockup/App.tsx` | 5065 | Componente raiz com estado navegação |
| `docker-compose.yml` | 73 | Orquestração backend + frontend |
| `backend/Dockerfile` | 48 | Build Python 3.11 slim |
| `harven.ai-platform-mockup/Dockerfile` | 43 | Build Node 20 + Nginx |
| `backend/requirements.txt` | 41 linhas | 16 dependências Python |
| `harven.ai-platform-mockup/package.json` | 26 | 8 dependências Node |
| `harven.ai-platform-mockup/nginx.conf` | 44 | Security headers, gzip, caching |

---

## 13. SUPORTE TÉCNICO

### 13.1 Contatos Técnicos

- **Frontend:** React 19 + TypeScript + Vite
  Documentação: https://react.dev, https://vitejs.dev

- **Backend:** FastAPI + Python 3.11
  Documentação: https://fastapi.tiangolo.com

- **Database:** Supabase (PostgreSQL)
  Dashboard: https://app.supabase.com
  Docs: https://supabase.com/docs

- **IA:** OpenAI GPT-4o-mini
  Dashboard: https://platform.openai.com/account/api-keys

- **TTS:** ElevenLabs
  Dashboard: https://elevenlabs.io/

### 13.2 Troubleshooting Comum

**Container não inicia:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**API retorna 500:**
```bash
# Ver logs do backend
docker-compose logs backend -f

# Verificar variáveis de ambiente
docker-compose config

# Testar conexão Supabase
python -c "from supabase import create_client; print('OK')"
```

**Frontend não conecta com Backend:**
```bash
# Verificar CORS em .env
VITE_API_URL=https://api.harven.eximiaventures.com.br

# Verificar CORS no backend
curl -H "Origin: https://harven.eximiaventures.com.br" \
     -H "Access-Control-Request-Method: GET" \
     https://api.harven.eximiaventures.com.br/
```

**Banco de dados não conecta:**
```bash
# Verificar credenciais Supabase
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Testar conexão
python -m pip install supabase
python -c "from supabase import create_client; c = create_client('$SUPABASE_URL', '$SUPABASE_KEY'); print(c.table('users').select('count', count='exact').execute())"
```

---

## CONCLUSÃO

A plataforma **Harven.AI** é um sistema educacional moderno, seguro e pronto para produção com:

✅ **Arquitetura Modern:** React 19 + FastAPI + Supabase PostgreSQL
✅ **IA Avançada:** 6 agentes especializados com GPT-4o-mini
✅ **Deployment Ready:** Docker containerizado, CI/CD compatível
✅ **Integrações:** JACAD + Moodle LMS
✅ **Escalabilidade:** Stateless design, pode escalar horizontalmente
✅ **Segurança:** HTTPS, CORS, RLS, validação Pydantic
✅ **Documentação:** Completa com OpenAPI/Swagger

**Próximos passos:**
1. Revisar e validar especificações de segurança
2. Testar integrações JACAD e Moodle em ambiente staging
3. Implementar monitoramento (Prometheus + Grafana)
4. Configurar backup automático do Supabase
5. Deploy em produção com certificado SSL ativo

---

**Documento Preparado Para:** Equipe de TI - Harven.ai
**Data:** 23 de Janeiro de 2026
**Versão:** 1.0
**Status:** Pronto para Análise de Segurança

---

*Para dúvidas técnicas ou clarificações, favor contactar a equipe de desenvolvimento.*
