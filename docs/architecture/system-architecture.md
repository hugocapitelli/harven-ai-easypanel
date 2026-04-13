# System Architecture - Harven.AI Platform

**Data:** 2026-02-25
**Fase:** Brownfield Discovery — FASE 1 (Coleta: Sistema)
**Agente:** @architect
**Versão:** 2.0

---

## 1. Visão Geral

**Harven.AI** é uma plataforma educacional inteligente que utiliza diálogo socrático alimentado por IA para aprimorar o aprendizado. Projetada para instituições de ensino com três perfis de acesso: Estudante, Instrutor e Administrador.

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript | React 19.2, TS 5.8 |
| **Build Tool** | Vite | 6.2 |
| **Styling** | Tailwind CSS | v4.1 |
| **Backend** | FastAPI (Python) | 0.110+ |
| **Database** | Supabase (PostgreSQL) | 2.3+ |
| **AI** | OpenAI API | gpt-4o-mini |
| **TTS** | ElevenLabs | 1.0+ |
| **Deploy** | Docker + Docker Compose | Multi-stage |
| **Web Server** | Nginx (frontend) | Alpine |
| **Runtime** | Node 20 / Python 3.11 | LTS |

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                   │
│  Port: 3000 (dev) / 80 (prod via Nginx)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐           │
│  │  Views   │ │Components│ │  Services    │           │
│  │  (23)    │ │  (UI Kit)│ │  (api.ts)    │           │
│  └──────────┘ └──────────┘ └──────┬───────┘           │
│                                    │ Axios + JWT        │
└────────────────────────────────────┼────────────────────┘
                                     │ HTTP/REST
┌────────────────────────────────────┼────────────────────┐
│                    BACKEND (FastAPI)                     │
│  Port: 8000                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐           │
│  │  Routes  │ │  Auth    │ │  AI Agents   │           │
│  │  (81)    │ │  (JWT)   │ │  (6 agents)  │           │
│  └──────────┘ └──────────┘ └──────┬───────┘           │
│                                    │                    │
│  ┌──────────┐ ┌──────────┐        │                    │
│  │ Services │ │Integration│       │                    │
│  │(ai,integ)│ │(JACAD/   │       │                    │
│  │          │ │ Moodle)  │       │                    │
│  └──────────┘ └──────────┘       │                    │
└────────────────────────────────────┼────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────┐
        │           SUPABASE         │                │
        │  ┌──────────┐ ┌───────────┴──┐             │
        │  │PostgreSQL │ │   Storage    │             │
        │  │(22 tables)│ │  (buckets)   │             │
        │  └──────────┘ └──────────────┘             │
        └─────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas

```
harven-ai-app/
├── backend/                          # FastAPI backend
│   ├── main.py                       # Monolito (4.779 linhas, 81 rotas)
│   ├── requirements.txt              # 15 dependências Python
│   ├── Dockerfile                    # Python 3.11-slim
│   ├── setup_supabase.py             # Script de inicialização DB
│   ├── agents/                       # 6 agentes IA (system prompts)
│   │   ├── harven_creator.py
│   │   ├── harven_socrates.py
│   │   ├── harven_analyst.py
│   │   ├── harven_editor.py
│   │   ├── harven_tester.py
│   │   └── harven_organizer.py
│   └── services/
│       ├── ai_service.py             # Orquestrador OpenAI (590 linhas)
│       └── integration_service.py    # JACAD/Moodle (932 linhas)
│
├── harven.ai-platform-mockup/        # React frontend
│   ├── App.tsx                       # Router + auth + idle timeout
│   ├── routes.tsx                    # Lazy-loaded routes
│   ├── types.ts                      # TypeScript interfaces
│   ├── index.css                     # Tailwind v4 theme
│   ├── Dockerfile                    # Multi-stage (Node → Nginx)
│   ├── nginx.conf                    # Produção (gzip, headers, SPA)
│   ├── views/                        # 23 page components
│   ├── components/                   # UI components + design system
│   │   ├── ui/                       # 8 componentes base
│   │   ├── chapter-reader/           # 4 sub-componentes
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ErrorBoundary.tsx
│   ├── contexts/
│   │   └── SettingsContext.tsx        # Configurações globais
│   ├── services/
│   │   └── api.ts                    # Axios client + interceptors
│   └── lib/
│       ├── supabase.ts               # Cliente Supabase
│       ├── utils.ts                  # Helpers (cn, safeJsonParse)
│       └── formatExtractedText.ts    # Formatação de texto
│
├── supabase/                         # Schema e documentação DB
│   └── docs/
│       ├── SCHEMA.md
│       └── DB-AUDIT.md
│
├── docker-compose.yml                # Orquestração (backend + frontend)
├── .env.production                   # Credenciais produção
└── .env.example                      # Template de variáveis
```

---

## 3. Frontend — Análise Detalhada

### 3.1 Navegação e Roteamento

- **React Router v7** com lazy loading via `React.lazy()`
- **Role-based routing**: rotas protegidas por papel do usuário
- **Code splitting**: cada view é carregada sob demanda

**Rotas principais:**

| Rota | View | Papel |
|------|------|-------|
| `/dashboard` | StudentDashboard | STUDENT |
| `/courses` | CourseList | ALL |
| `/course/:id/chapter/:id/content/:id` | ChapterReader | ALL |
| `/instructor` | InstructorList | INSTRUCTOR |
| `/admin` | AdminConsole | ADMIN |
| `/admin/settings` | SystemSettings | ADMIN |
| `/admin/users` | UserManagement | ADMIN |

### 3.2 Estado Global

- **SettingsContext**: configurações de plataforma (nome, cores, módulos habilitados)
- **localStorage**: preferência de tema (dark mode)
- **sessionStorage**: tokens de autenticação (`sb-access-token`, `user-data`)
- **Sem Redux/Zustand**: estado gerenciado via Context API + useState local

### 3.3 API Client (services/api.ts)

- **Axios** com interceptors de request/response
- **Request interceptor**: adiciona JWT automaticamente
- **Response interceptor**: auto-logout em 401
- **Timeout padrão**: 10 segundos (60s para AI, 5min para uploads)

### 3.4 Design System (components/ui/)

8 componentes base: `Button`, `Card`, `Input`, `Badge`, `Progress`, `Select`, `Tabs`, `Avatar`

- Variantes de Button: `primary`, `outline`, `ghost`, `destructive`
- Card com efeito hover opcional
- Input com suporte a ícones
- Fontes: Lexend (display) + Noto Sans (body)
- Cores: Primary `#d0ff00` (lime), Accent `#1c2d1b` (dark green), Gold `#c0ac6f`

### 3.5 Dependências Frontend

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| react | 19.2 | Framework |
| react-dom | 19.2 | Rendering |
| react-router-dom | 7.12 | Routing |
| @supabase/supabase-js | 2.90 | DB client |
| axios | 1.13 | HTTP client |
| dompurify | 3.3 | Sanitização HTML |
| html2canvas | 1.4 | Screenshots |
| sonner | 2.0 | Toast notifications |
| tailwindcss | 4.1 | Styling |
| vite | 6.2 | Build tool |
| typescript | 5.8 | Type system |

---

## 4. Backend — Análise Detalhada

### 4.1 Estrutura das Rotas (81 total)

| Namespace | Rotas | Endpoints |
|-----------|-------|-----------|
| Health | 3 | `/`, `/health`, `/test-db` |
| Auth | 1 | `POST /auth/login` |
| Disciplines | 13 | CRUD + teachers + students + image |
| Courses | 8 | CRUD + chapters + image |
| Chapters | 4 | CRUD + contents + upload |
| Contents | 5 | CRUD + questions |
| Questions | 3 | CRUD + batch update |
| Users | 9 | CRUD + avatar + stats + activities |
| Progress | 4 | Achievements, certificates, progress |
| Dashboard | 3 | Stats + admin stats + performance |
| Settings | 7 | Get/save + uploads + actions + storage |
| Admin Security | 5 | Force-logout, cache, logs |
| Backups | 2 | List + create |
| Notifications | 6 | CRUD + count + read-all |
| Search | 1 | Global search |
| Chat Sessions | 8 | CRUD + messages + export |
| AI Services | 14 | 6 agents + TTS + cost estimation |
| Integrations | 16 | JACAD + Moodle sync |

### 4.2 Autenticação

- **JWT HS256** com expiração configurável (padrão: 8 horas)
- **Bcrypt** para hashing de senhas (com fallback plaintext legado)
- **Role-based access**: dependencies `require_role(*roles)`
- **Rate limiting**: Login (5/min), Upload (10/min), AI (10/min)

### 4.3 Agentes IA

6 agentes especializados orquestrados pelo `ai_service.py`:

| Agente | Função |
|--------|--------|
| Creator | Gera perguntas socráticas a partir do conteúdo |
| Socrates | Conduz diálogo socrático com respostas do aluno |
| Analyst | Detecta se aluno usou IA (ChatGPT detection) |
| Editor | Refina e polisha respostas da IA |
| Tester | Valida qualidade das respostas |
| Organizer | Gerencia sessões e exportação LMS |

### 4.4 Integrações

- **JACAD**: Sistema acadêmico (importação de alunos/disciplinas)
- **Moodle**: LMS (exportação de sessões, sync bidirecional)
- **ElevenLabs**: Text-to-Speech (geração de áudio)
- **OpenAI**: GPT-4o-mini para agentes IA

### 4.5 Dependências Backend

| Pacote | Propósito |
|--------|-----------|
| fastapi | Web framework |
| uvicorn | ASGI server |
| supabase | Database client |
| openai | AI API client |
| elevenlabs | TTS |
| python-jose | JWT tokens |
| bcrypt / passlib | Password hashing |
| slowapi | Rate limiting |
| pdfplumber | PDF extraction |
| pydantic | Data validation |
| httpx | HTTP client |
| psutil | System monitoring |

---

## 5. Database (Supabase/PostgreSQL)

### 5.1 Schema — 22 Tabelas

**Core:**
- `users` — Contas (id, name, email, ra, role, password, avatar_url)
- `disciplines` — Disciplinas/turmas
- `discipline_teachers` — Professores por disciplina (pivot)
- `discipline_students` — Alunos por disciplina (pivot)
- `courses` — Cursos/módulos dentro de disciplinas
- `chapters` — Capítulos dentro de cursos
- `contents` — Conteúdos (video, text, pdf, quiz, audio)
- `questions` — Perguntas socráticas por conteúdo

**Gamificação:**
- `user_activities` — Log de atividades
- `user_stats` — Estatísticas agregadas
- `user_achievements` — Conquistas desbloqueadas
- `certificates` — Certificados de conclusão
- `course_progress` — Progresso por curso

**Chat/IA:**
- `chat_sessions` — Sessões de diálogo socrático
- `chat_messages` — Mensagens dentro das sessões

**Sistema:**
- `system_settings` — Configurações globais (singleton)
- `system_logs` — Logs de auditoria
- `system_backups` — Registros de backup
- `notifications` — Notificações do usuário

**Integração:**
- `moodle_ratings` — Avaliações Moodle
- `integration_logs` — Logs de sync
- `external_mappings` — Mapeamento IDs externos

### 5.2 Storage Buckets

| Bucket | Limite | Tipos |
|--------|--------|-------|
| courses | 500MB | PDF, vídeo, apresentações |
| avatars | 5MB | JPEG, PNG, GIF, WebP |
| system | — | Logos, backgrounds |

---

## 6. Deploy e Infraestrutura

### 6.1 Docker Compose

```yaml
services:
  backend:
    build: ./backend/Dockerfile
    port: 8000
    health_check: urllib (30s interval)
    user: appuser (non-root)

  frontend:
    build: ./harven.ai-platform-mockup/Dockerfile (multi-stage)
    port: 80 (Nginx)
    depends_on: backend (service_healthy)
    health_check: wget /health
```

### 6.2 Domínios Produção

- Frontend: `https://harven.eximiaventures.com.br`
- Backend: `https://api.harven.eximiaventures.com.br`
- Database: `https://kllkgrkjmxqdlsrhyrun.supabase.co`

### 6.3 Nginx (Frontend Prod)

- Gzip habilitado
- Security headers (X-Frame-Options, CSP, X-Content-Type-Options)
- SPA fallback para `/index.html`
- Cache: assets 1 ano, index.html never-cache
- Health endpoint em `/health`

---

## 7. Débitos Técnicos Identificados

### 🔴 CRÍTICOS (5)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| SYS-C1 | JWT secret hardcoded como fallback (`"harven-dev-secret-change-in-production"`) | Backend/Security | Comprometimento total de tokens JWT |
| SYS-C2 | CORS com wildcard em methods e headers (`["*"]`) | Backend/Security | Aumento de risco CSRF |
| SYS-C3 | Fallback de senha plaintext legada na autenticação | Backend/Security | Timing attacks, senhas não-hashadas |
| SYS-C4 | Backend monolítico (4.779 linhas em `main.py`, 81 rotas) | Backend/Architecture | Manutenibilidade, testabilidade |
| SYS-C5 | Zero testes automatizados (frontend e backend) | Quality | Sem cobertura, regressões invisíveis |

### 🟡 ALTOS (8)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| SYS-H1 | Sem rate limiting na maioria dos endpoints (só login, upload, AI) | Backend/Security | Brute force, DoS |
| SYS-H2 | Sem mecanismo de revogação/blacklist de tokens JWT | Backend/Security | Tokens válidos após logout |
| SYS-H3 | Sem refresh token flow (token único de 8h) | Backend/Security | Janela de comprometimento longa |
| SYS-H4 | Credenciais de produção em `.env.production` no repositório | DevOps/Security | Exposição de API keys, DB keys |
| SYS-H5 | Inconsistência de storage: sessionStorage + localStorage misturados | Frontend | Dados desincronizados entre abas |
| SYS-H6 | Database não valida conexão no startup (falha silenciosa) | Backend | Backend inicia sem DB |
| SYS-H7 | Sem validação de tamanho global de request (só em uploads) | Backend/Security | DDoS via payloads grandes |
| SYS-H8 | Webhook Moodle sem secret obrigatório | Backend/Security | Aceita qualquer POST |

### 🟠 MÉDIOS (10)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| SYS-M1 | Sem endpoint de reset/troca de senha | Backend | Usuários presos com senha inicial |
| SYS-M2 | Sem structured logging (JSON) | Backend/DevOps | Dificuldade em monitoramento |
| SYS-M3 | Uvicorn sem workers em produção (single-threaded) | DevOps | Performance limitada |
| SYS-M4 | Código duplicado: pagination, role normalization, error handling | Backend | Manutenibilidade |
| SYS-M5 | Sem loading skeleton pattern consistente | Frontend/UX | Experiência inconsistente |
| SYS-M6 | Dependências sem versão máxima (semver ranges abertos) | DevOps | Breaking changes inesperados |
| SYS-M7 | Admin operations sem audit logging completo | Backend/Security | Sem rastreabilidade |
| SYS-M8 | Dados sensíveis podem vazar em respostas (masking inconsistente) | Backend/Security | Exposição de dados |
| SYS-M9 | File upload: sanitização de nome de arquivo poderia ser mais forte | Backend/Security | Path traversal potencial |
| SYS-M10 | Sem caching layer (nem Redis, nem in-memory) | Backend/Performance | Queries repetitivas ao DB |

### 🔵 BAIXOS (5)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| SYS-L1 | Normalização TEACHER→INSTRUCTOR no backend (hack) | Backend | Confusão de terminologia |
| SYS-L2 | Hardcoded default TTS voice ID e placeholder images | Backend | Configurabilidade |
| SYS-L3 | Nomes de variáveis em português misturado com inglês | Backend | Consistência de código |
| SYS-L4 | Scripts .bat só para Windows (sem scripts Unix) | DevOps | Portabilidade |
| SYS-L5 | `html2canvas` importado mas uso mínimo | Frontend | Bundle size desnecessário |

---

## 8. Padrões de Código

### 8.1 Padrões Positivos

- **AbortController**: Cleanup correto em useEffect async
- **Lazy Loading**: Code splitting em todas as rotas
- **TypeScript**: Cobertura completa com interfaces tipadas
- **Error Boundary**: Captura de erros React com UI fallback
- **Dark Mode**: Suporte completo via Tailwind
- **Health Checks**: Docker healthchecks configurados
- **Non-root user**: Container backend roda como appuser
- **Gzip + Security Headers**: Nginx bem configurado
- **Rate Limiting**: Presente nos endpoints mais sensíveis
- **Password Hashing**: bcrypt com auto-migração

### 8.2 Anti-Padrões

- Monolito de 4.779 linhas no backend
- Sem testes automatizados
- Credenciais no repositório
- Fallback de segurança silencioso (JWT secret)
- Lógica de negócio misturada com rotas
- Modelos Pydantic inline (não reutilizáveis)
- Sem dependency injection para DB client

---

## 9. Pontos de Integração

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   JACAD     │◄────│   Backend   │────►│   Moodle    │
│  (Academic) │     │  (FastAPI)  │     │   (LMS)     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  OpenAI   │ │Supabase│ │ElevenLabs │
        │(GPT-4o-m) │ │  (DB)  │ │  (TTS)    │
        └───────────┘ └───────┘ └───────────┘
```

---

## 10. Configuração de Ambiente

### Variáveis Obrigatórias

| Variável | Descrição | Onde |
|----------|-----------|------|
| `SUPABASE_URL` | URL do projeto Supabase | Backend |
| `SUPABASE_KEY` | Anon key do Supabase | Backend |
| `JWT_SECRET_KEY` | Secret para assinatura JWT | Backend |
| `OPENAI_API_KEY` | Chave API OpenAI | Backend |
| `VITE_API_URL` | URL do backend | Frontend |

### Variáveis Opcionais

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OPENAI_MODEL` | gpt-4o-mini | Modelo OpenAI |
| `JWT_EXPIRATION_HOURS` | 8 | Expiração do token |
| `ELEVENLABS_API_KEY` | — | Para TTS |
| `FRONTEND_URL` | localhost:3000 | Para CORS |
| `MOODLE_WEBHOOK_SECRET` | — | Webhook auth |

---

## 11. Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Linhas de código (Backend main.py) | 4.779 |
| Linhas de código (AI Service) | 590 |
| Linhas de código (Integration Service) | 932 |
| Total de rotas API | 81 |
| Tabelas no banco | 22 |
| Views (páginas) | 23 |
| Componentes UI | 8 (design system) + 7 (feature) |
| Agentes IA | 6 |
| Dependências Frontend | 10 |
| Dependências Backend | 15 |
| Testes automatizados | 0 |
| Débitos Críticos | 5 |
| Débitos Altos | 8 |
| Débitos Médios | 10 |
| Débitos Baixos | 5 |
| **Total Débitos** | **28** |

---

*Documento gerado pelo workflow Brownfield Discovery — FASE 1*
*@architect — Orion (Orchestrator)*
