# Initiative: Migração Harven.AI → Azure

> **ID:** AZM
> **Status:** Planning
> **Data:** 2026-02-27
> **Owner:** Morgan (PM)
> **Docs:** [Project Brief](../project-brief-azure-migration.md) | [Architecture](../architecture/azure-migration-architecture.md)

---

## Visão Geral

Migrar a plataforma Harven.AI de Supabase/Coolify para Azure Container Apps + Azure SQL + Azure Blob Storage, com CI/CD via GitHub Actions.

**Constraint:** Azure SQL (SQL Server engine) — exigência organizacional.
**Contexto:** Supabase era prototipagem. Sem dados de produção a migrar. Schema recriado limpo.

### Dependency Graph

```
Epic 1 (Infra) ──────┐
                      ├──→ Epic 3 (Backend Refactor) ──→ Epic 5 (Validação E2E)
Epic 2 (Schema) ──────┘          ↑                              ↑
                                 │                              │
                          Epic 4 (Frontend) ────────────────────┘
                                 ↑
                          Epic 6 (CI/CD) ───────────────────────┘
```

**Paralelização possível:**
- Epic 1 + Epic 2 + Epic 3 (stories 3.1-3.3) podem iniciar em paralelo
- Epic 4 pode iniciar em paralelo com Epic 3
- Epic 6 pode iniciar assim que Epic 1 estiver concluído
- Epic 5 é o gate final — só após todos os outros

---

## Epic 1: Provisionamento de Infraestrutura Azure

**Goal:** Provisionar todos os recursos Azure necessários para hospedar a aplicação, com identidades e permissões configuradas.

**Owner:** @devops
**Risk:** LOW — recursos provisionados são deletáveis, sem impacto no sistema atual

### Story AZM-1.1: Provisionar Recursos Azure

**Descrição:** Criar o Resource Group, Azure Container Registry, Azure SQL Server + Database, Azure Blob Storage com 3 containers, e o Container Apps Environment usando Azure CLI.

**Predicted Agents:** @devops
**Quality Gates:**
- Pre-Commit: Validar script de provisionamento
- Pre-PR: Verificar naming conventions e região

**Acceptance Criteria:**
- [ ] Resource Group `harven-ai-rg` criado em `brazilsouth`
- [ ] ACR `harvenacr` criado (Basic tier)
- [ ] Azure SQL Server + Database `harven-db` criado (S0 tier)
- [ ] Firewall do SQL Server permite Azure Services
- [ ] Storage Account `harvenstorage` com containers: `courses` (public), `avatars` (public), `backups` (private)
- [ ] Container Apps Environment `harven-env` criado
- [ ] Script `infra/setup-azure.sh` versionado no repo

**Reference:** Architecture doc seção 9 (Provisionamento Azure — Script)

---

### Story AZM-1.2: Configurar Identidades e Permissões

**Descrição:** Configurar Managed Identity nos Container Apps para pull de imagens do ACR, e criar Service Principal para GitHub Actions com role Contributor no Resource Group.

**Predicted Agents:** @devops
**Quality Gates:**
- Pre-Commit: Verificar que nenhum secret está hardcoded

**Acceptance Criteria:**
- [ ] System-assigned Managed Identity habilitada em ambos os Container Apps
- [ ] Role `AcrPull` atribuída às Managed Identities no ACR
- [ ] Container Apps configurados para usar Managed Identity no registry pull
- [ ] Service Principal `harven-github-actions` criado com role `Contributor`
- [ ] JSON de credenciais do SP documentado (para configurar no GitHub)

**Depends on:** AZM-1.1

---

## Epic 2: Database Schema Azure SQL

**Goal:** Criar o schema completo da aplicação em T-SQL no Azure SQL Database, com indexes, constraints, stored procedures e seed data.

**Owner:** @dev (com review de @architect)
**Risk:** MEDIUM — conversão PostgreSQL → T-SQL requer validação de cada tipo e constraint

### Story AZM-2.1: Criar Schema DDL T-SQL

**Descrição:** Converter o schema PostgreSQL do Supabase para T-SQL compatível com Azure SQL. Inclui todas as 20 tabelas, foreign keys, unique constraints e indexes de performance.

**Predicted Agents:** @dev, @architect (review de schema)
**Quality Gates:**
- Pre-Commit: Validar syntax T-SQL
- Pre-PR: Review de tipos, indexes e constraints

**Acceptance Criteria:**
- [ ] Arquivo `sql/schema.sql` criado com DDL completo
- [ ] 20 tabelas criadas: users, disciplines, discipline_teachers, discipline_students, courses, chapters, contents, questions, chat_sessions, chat_messages, system_settings, system_logs, system_backups, user_activities, user_stats, user_achievements, certificates, course_progress, notifications, token_usage
- [ ] Todos os tipos mapeados: UUID→NVARCHAR(36), BOOLEAN→BIT, TEXT→NVARCHAR(MAX), TIMESTAMPTZ→DATETIME2, SERIAL→IDENTITY
- [ ] Indexes de performance criados (19 indexes conforme arquitetura)
- [ ] Unique constraints: uq_discipline_teacher, uq_discipline_student, uq_users_ra, uq_user_course_progress, uq_user_usage_date
- [ ] Stored Procedure `sp_increment_message_count` criada
- [ ] Schema executado com sucesso no Azure SQL Database

**Reference:** Architecture doc seção 3 (Schema Azure SQL)

---

### Story AZM-2.2: Criar Seed Data

**Descrição:** Criar script de dados iniciais com admin user padrão e system_settings default.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Verificar que nenhuma senha real está no seed

**Acceptance Criteria:**
- [ ] Arquivo `sql/seed.sql` criado
- [ ] Admin user default inserido (ra='admin', role='ADMIN', password hash temporário)
- [ ] System settings default inserido (platform_name, ai_daily_token_limit=500000)
- [ ] Seed executado com sucesso no Azure SQL Database

**Depends on:** AZM-2.1

---

## Epic 3: Backend — Data Layer Refactor

**Goal:** Substituir toda a dependência do `supabase-py` por SQLAlchemy + Azure Blob Storage, implementando repository pattern para isolar acesso a dados.

**Owner:** @dev (com review de @architect)
**Risk:** HIGH — epicentro da migração. 193 operações Supabase em main.py precisam ser reescritas (168 table + 24 storage + 1 rpc).
**Mitigation:** Refactor mecânico rota-a-rota com padrão documentado. Repository genérico cobre 80% dos casos.

### Story AZM-3.1: Criar Camada de Banco (database.py + models)

**Descrição:** Criar a engine SQLAlchemy com connection pool para Azure SQL via `mssql+pyodbc`, e os ORM models mapeando todas as 20 tabelas com relationships.

**Predicted Agents:** @dev, @architect (review de patterns)
**Quality Gates:**
- Pre-Commit: Validar que models correspondem ao DDL da Story AZM-2.1
- Pre-PR: Review de relationships e mixins

**Acceptance Criteria:**
- [ ] `backend/database.py` criado com engine, SessionLocal e `get_db()` dependency
- [ ] `backend/models/__init__.py` exportando todos os models
- [ ] `backend/models/base.py` com Base, TimestampMixin, UUIDPrimaryKeyMixin
- [ ] 14 arquivos de model criados cobrindo as 20 tabelas (agrupados por domínio)
- [ ] Todos os relationships bidirecionais definidos (teacher↔discipline, user↔chat_sessions, etc.)
- [ ] Models possuem método `to_dict()` para serialização em JSON
- [ ] Conexão testada com Azure SQL Database

**Reference:** Architecture doc seções 2.2, 2.3, 2.4

**Depends on:** AZM-2.1

---

### Story AZM-3.2: Criar Repositories

**Descrição:** Implementar BaseRepository com operações CRUD genéricas e 11 repositories especializados que substituem os padrões Supabase.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Validar cobertura dos 168 padrões Supabase
- Pre-PR: Review de query patterns (pagination, joins, ilike, upsert)

**Acceptance Criteria:**
- [ ] `backend/repositories/base.py` com BaseRepository (get_by_id, get_all, create, create_many, update, delete, delete_where, upsert)
- [ ] `backend/repositories/user_repo.py` — UserRepository (auth por RA, busca por role, avatar update)
- [ ] `backend/repositories/discipline_repo.py` — DisciplineRepository (com get_teachers, get_students via joinedload)
- [ ] `backend/repositories/course_repo.py` — CourseRepository (filtro por discipline, paginação, export hierarchy)
- [ ] `backend/repositories/chapter_repo.py` — ChapterRepository (ordenação por order field)
- [ ] `backend/repositories/content_repo.py` — ContentRepository (busca ilike, audio/text URL updates)
- [ ] `backend/repositories/question_repo.py` — QuestionRepository (bulk insert, status transitions, delete by status)
- [ ] `backend/repositories/chat_repo.py` — ChatRepository (sessions com joinedload de contents/chapters/courses, increment_message_count via SP)
- [ ] `backend/repositories/admin_repo.py` — AdminRepository (settings singleton, logs insert, backups CRUD)
- [ ] `backend/repositories/gamification_repo.py` — GamificationRepository (activities, stats, achievements, certificates, progress)
- [ ] `backend/repositories/notification_repo.py` — NotificationRepository (unread count, mark all read)
- [ ] Mapeamento 1:1 documentado: cada padrão Supabase → método repository

**Reference:** Architecture doc seções 2.5, 2.8, 2.9

**Depends on:** AZM-3.1

---

### Story AZM-3.3: Criar Azure Blob Storage Wrapper

**Descrição:** Implementar `storage.py` com classe AzureBlobStorage que substitui todas as 24 operações de supabase.storage (upload, get_public_url, create_signed_url, remove).

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Validar que todos os padrões de storage estão cobertos
- Pre-PR: Review de autenticação (connection string vs Managed Identity)

**Acceptance Criteria:**
- [ ] `backend/storage.py` criado com classe AzureBlobStorage
- [ ] Métodos: `upload()`, `get_public_url()`, `create_signed_url()`, `remove()`, `upload_with_fallback()`
- [ ] Suporte a autenticação via connection string (dev) e Managed Identity (prod)
- [ ] upload(): substitui `supabase.storage.from_(bucket).upload()` (11 usos)
- [ ] get_public_url(): substitui `supabase.storage.from_(bucket).get_public_url()` (10 usos)
- [ ] create_signed_url(): substitui `create_signed_url()` com SAS token (1 uso — backups)
- [ ] remove(): substitui `supabase.storage.from_(bucket).remove()` (2 usos)
- [ ] upload_with_fallback(): substitui padrão de try/except entre múltiplos buckets
- [ ] Singleton `blob_storage` exportado para uso direto nas rotas

**Reference:** Architecture doc seção 2.6

---

### Story AZM-3.4: Migrar Rotas do main.py — Auth, Users, Disciplines

**Descrição:** Refatorar as rotas de autenticação, gestão de usuários e disciplinas para usar repositories ao invés de supabase.table(). Inclui login (RA), CRUD users, avatar upload, CRUD disciplines, assignment de teachers e students.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Validar que login flow funciona end-to-end
- Pre-PR: Security review (JWT, password hashing mantidos)

**Acceptance Criteria:**
- [ ] Rotas de auth: `POST /auth/login` usando UserRepository
- [ ] Rotas de users: GET/POST/PUT users usando UserRepository
- [ ] Rota de avatar: `POST /users/{id}/avatar` usando blob_storage
- [ ] Rotas de disciplines: GET/POST/PUT disciplines usando DisciplineRepository
- [ ] Rotas de teachers: GET/POST/DELETE discipline_teachers usando DisciplineRepository.get_teachers()
- [ ] Rotas de students: GET/POST/DELETE discipline_students usando DisciplineRepository.get_students()
- [ ] `Depends(get_db)` injetado em todas as rotas migradas
- [ ] Todas as rotas retornam mesma estrutura JSON que antes

**Depends on:** AZM-3.2, AZM-3.3

---

### Story AZM-3.5: Migrar Rotas do main.py — Courses, Chapters, Contents, Questions

**Descrição:** Refatorar as rotas do core educacional (cursos, capítulos, conteúdos, questões) para usar repositories. Inclui CRUD, paginação, upload de arquivos, e geração AI de questões.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Validar paginação (offset/limit vs range)
- Pre-PR: Verificar que export de cursos funciona com joins

**Acceptance Criteria:**
- [ ] Rotas de courses: GET/POST/PUT/DELETE usando CourseRepository (com paginação)
- [ ] Rotas de chapters: GET/POST/PUT/DELETE usando ChapterRepository (com ordenação)
- [ ] Rotas de contents: GET/POST/PUT/DELETE usando ContentRepository
- [ ] Upload de conteúdo: `POST /chapters/{id}/upload` usando blob_storage
- [ ] Upload de imagem de curso: `POST /courses/{id}/image` usando blob_storage
- [ ] Rotas de questions: GET/POST/PUT/DELETE usando QuestionRepository
- [ ] Geração de questões: flow AI → QuestionRepository.create_many() mantido
- [ ] Status transitions de questions (active/replacing) funcionando
- [ ] Export de curso completo (course → chapters → contents → questions) via repository joins

**Depends on:** AZM-3.2, AZM-3.3

---

### Story AZM-3.6: Migrar Rotas do main.py — Chat, Notifications, Gamification, Admin

**Descrição:** Refatorar as rotas restantes: chat socrático, notificações, gamificação e admin console. Inclui backup/restore e settings management.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: Validar que chat session creation/message flow funciona
- Pre-PR: Verificar stored procedure call (increment_message_count)

**Acceptance Criteria:**
- [ ] Rotas de chat_sessions: GET/POST/PUT usando ChatRepository (com joinedload)
- [ ] Rotas de chat_messages: GET/POST usando ChatRepository
- [ ] Chamada de SP: `sp_increment_message_count` via `db.execute()` substituindo `supabase.rpc()`
- [ ] Rotas de notifications: GET/POST/PUT/DELETE usando NotificationRepository
- [ ] Unread count e mark-all-read funcionando
- [ ] Rotas de gamification: activities, stats, achievements, certificates, progress
- [ ] Rotas de admin settings: GET/POST/PUT usando AdminRepository (singleton pattern)
- [ ] Upload de logos/backgrounds: usando blob_storage
- [ ] Rotas de admin logs: GET/POST usando AdminRepository
- [ ] Rotas de admin backups: GET/POST/DELETE usando AdminRepository + blob_storage
- [ ] Backup download: signed URL via `blob_storage.create_signed_url()`
- [ ] Rotas de admin stats: GET usando queries de contagem

**Depends on:** AZM-3.2, AZM-3.3

---

### Story AZM-3.7: Atualizar Dockerfile e Dependencies

**Descrição:** Atualizar o Dockerfile do backend para instalar ODBC Driver 18 para SQL Server, atualizar requirements.txt (remover supabase, adicionar sqlalchemy/pyodbc/azure-storage-blob), e atualizar .env.example.

**Predicted Agents:** @dev, @devops (review do Dockerfile)
**Quality Gates:**
- Pre-Commit: Docker build com sucesso
- Pre-PR: Verificar que imagem não cresceu excessivamente

**Acceptance Criteria:**
- [ ] `backend/Dockerfile` atualizado com instalação de ODBC Driver 18 (Microsoft packages)
- [ ] `backend/requirements.txt` atualizado: -supabase, +sqlalchemy, +pyodbc, +azure-storage-blob, +azure-identity
- [ ] `backend/.env.example` atualizado: -SUPABASE_URL, -SUPABASE_KEY, +DATABASE_URL, +AZURE_STORAGE_CONNECTION_STRING
- [ ] `backend/setup_supabase.py` deletado
- [ ] Todos os imports de `supabase` removidos do codebase
- [ ] `docker build` executa com sucesso
- [ ] Container inicia e conecta ao Azure SQL

**Depends on:** AZM-3.4, AZM-3.5, AZM-3.6

---

## Epic 4: Frontend Cleanup

**Goal:** Remover a dependência do Supabase JS do frontend e limpar referências hardcoded.

**Owner:** @dev
**Risk:** LOW — frontend não usa Supabase para operações; apenas cleanup cosmético.

### Story AZM-4.1: Remover Supabase do Frontend

**Descrição:** Deletar `lib/supabase.ts`, remover `@supabase/supabase-js` do package.json, limpar as 3 URLs Supabase hardcoded em SettingsContext.tsx, e remover variáveis de ambiente VITE_SUPABASE_*.

**Predicted Agents:** @dev
**Quality Gates:**
- Pre-Commit: `npm run build` sem erros
- Pre-PR: Zero referências a "supabase" no codebase frontend

**Acceptance Criteria:**
- [ ] `lib/supabase.ts` deletado
- [ ] `@supabase/supabase-js` removido do package.json
- [ ] `npm install` executado (lockfile atualizado)
- [ ] 3 URLs Supabase em `contexts/SettingsContext.tsx` substituídas por strings vazias
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` removidos de `.env.example`
- [ ] `npm run build` executa com sucesso sem warnings de Supabase
- [ ] Zero referências a "supabase" em qualquer arquivo .ts/.tsx

---

## Epic 5: CI/CD Pipeline

**Goal:** Automatizar build e deploy de ambos os containers via GitHub Actions, usando a action oficial da Microsoft.

**Owner:** @devops (com review de @dev)
**Risk:** MEDIUM — primeiro setup de CI/CD; requer secrets e permissões corretos.

### Story AZM-5.1: Criar GitHub Actions Workflows

**Descrição:** Criar 2 workflows (deploy-backend.yml e deploy-frontend.yml) usando `azure/container-apps-deploy-action@v2`, com path triggers para deploy seletivo.

**Predicted Agents:** @devops, @dev (review)
**Quality Gates:**
- Pre-Commit: YAML válido
- Pre-PR: Verificar que secrets estão referenciados corretamente

**Acceptance Criteria:**
- [ ] `.github/workflows/deploy-backend.yml` criado
  - Trigger: push to main, paths: `backend/**`
  - Steps: checkout → azure/login → container-apps-deploy-action
  - Image tag: `harvenacr.azurecr.io/harven-backend:${{ github.sha }}`
- [ ] `.github/workflows/deploy-frontend.yml` criado
  - Trigger: push to main, paths: `harven.ai-platform-mockup/**`
  - Steps: checkout → azure/login → container-apps-deploy-action
  - Build arg: `VITE_API_URL=${{ secrets.BACKEND_URL }}`
  - Image tag: `harvenacr.azurecr.io/harven-frontend:${{ github.sha }}`
- [ ] Workflows usam actions/checkout@v4 e azure/login@v2

**Reference:** Architecture doc seção 8

**Depends on:** AZM-1.1, AZM-1.2

---

### Story AZM-5.2: Configurar Secrets e Validar Pipeline

**Descrição:** Configurar os GitHub Secrets necessários e fazer o primeiro push para validar que o pipeline completo funciona (build → push ACR → deploy Container Apps).

**Predicted Agents:** @devops
**Quality Gates:**
- Pre-Deployment: Verificar que imagens corretas estão no ACR
- Post-Deployment: Health check dos containers

**Acceptance Criteria:**
- [ ] GitHub Secret `AZURE_CREDENTIALS` configurado (JSON do Service Principal)
- [ ] GitHub Secret `BACKEND_URL` configurado (URL do backend no Container Apps)
- [ ] Push de teste para `main` dispara workflow correto
- [ ] Backend image construída e pushada para ACR
- [ ] Frontend image construída e pushada para ACR
- [ ] Container Apps atualizados com novas revisões
- [ ] Health checks passando em ambos os containers

**Depends on:** AZM-5.1, AZM-3.7, AZM-4.1

---

## Epic 6: Validação End-to-End

**Goal:** Validar que toda a aplicação funciona corretamente na infraestrutura Azure, cobrindo todos os fluxos críticos.

**Owner:** @qa
**Risk:** Encontrar bugs da migração — esperado e desejável nesta fase.

### Story AZM-6.1: Teste E2E Completo

**Descrição:** Executar teste end-to-end de todos os fluxos da aplicação no ambiente Azure, validando que a migração não introduziu regressões.

**Predicted Agents:** @qa, @dev (para fixes)
**Quality Gates:**
- Pre-Deployment: Todos os épicos anteriores concluídos
- Post-Deployment: Todos os fluxos validados

**Acceptance Criteria:**
- [ ] **Auth:** Login com RA funciona, JWT gerado corretamente
- [ ] **Users:** CRUD de usuários funcional (admin, instructor, student)
- [ ] **Avatar:** Upload de avatar salva no Azure Blob Storage e URL retornada
- [ ] **Disciplines:** CRUD funcional, assignment de teachers/students
- [ ] **Courses:** CRUD com paginação, filtro por discipline
- [ ] **Chapters:** CRUD com ordenação
- [ ] **Contents:** CRUD, upload de PDF/vídeo para Azure Blob Storage
- [ ] **Questions:** Geração AI funcional, bulk operations, status transitions
- [ ] **Chat Socrático:** Criar sessão, enviar mensagens, AI responde, message count incrementa
- [ ] **Notifications:** Criar, listar, marcar como lida, deletar
- [ ] **Admin Settings:** Salvar/carregar configurações, upload de logos
- [ ] **Admin Logs:** Logs sendo registrados
- [ ] **Admin Backups:** Criar backup, download com signed URL, deletar
- [ ] **Admin Stats:** Dashboard com contagens corretas
- [ ] **Gamification:** Activities registradas, stats atualizados
- [ ] **Rate Limiting:** Funcional (100 req/min)
- [ ] **Health Checks:** Ambos os containers respondendo
- [ ] **CORS:** Frontend acessa backend sem erros de cross-origin

**Depends on:** AZM-3.7, AZM-4.1, AZM-5.2

---

### Story AZM-6.2: Desligar Supabase e Documentar

**Descrição:** Após validação completa, desligar o projeto Supabase e atualizar toda a documentação do projeto para refletir a nova infraestrutura.

**Predicted Agents:** @devops, @dev
**Quality Gates:**
- Pre-Execution: Todos os testes E2E passaram

**Acceptance Criteria:**
- [ ] Supabase project desligado/pausado
- [ ] `.env.production` atualizado com variáveis Azure
- [ ] `CLAUDE.md` atualizado com nova stack e comandos
- [ ] `DEPLOY.md` criado/atualizado com instruções Azure
- [ ] `docker-compose.yml` atualizado para dev local (opcional: Azure SQL ou SQLite para dev)
- [ ] Nenhuma referência a Supabase restante em qualquer doc ou config

**Depends on:** AZM-6.1

---

## Resumo de Effort

| Epic | Stories | Owner | Risk | Paralelizável com |
|------|---------|-------|------|-------------------|
| **1. Infra Azure** | 2 | @devops | LOW | Epic 2, Epic 3 (3.1-3.3) |
| **2. Schema T-SQL** | 2 | @dev | MEDIUM | Epic 1, Epic 3 (3.1-3.3) |
| **3. Backend Refactor** | 7 | @dev | HIGH | Epic 4 (após 3.2) |
| **4. Frontend Cleanup** | 1 | @dev | LOW | Epic 3 |
| **5. CI/CD Pipeline** | 2 | @devops | MEDIUM | Após Epic 1 |
| **6. Validação E2E** | 2 | @qa | - | Gate final |
| **TOTAL** | **16 stories** | | | |

### Critical Path

```
AZM-1.1 → AZM-1.2 → AZM-5.1 → AZM-5.2 ──────────────────────→ AZM-6.1 → AZM-6.2
AZM-2.1 → AZM-2.2 → AZM-3.1 → AZM-3.2 → AZM-3.4/3.5/3.6 → AZM-3.7 ↗
                      AZM-3.3 ↗                                AZM-4.1 ↗
```

**Bottleneck:** Epic 3 (Backend Refactor) — 7 stories, rota mais longa do critical path.

---

## Rollback Plan

Se a migração falhar após go-live:
1. DNS aponta de volta para Coolify/VPS
2. Supabase reativado (dados de teste, não produção)
3. Containers originais com supabase-py voltam a rodar
4. Zero perda — não houve migração de dados de produção

---

## Definition of Done (Iniciativa completa)

- [ ] Todos os 6 épicos concluídos
- [ ] Zero referências a Supabase em todo o codebase
- [ ] CI/CD funcional (push → deploy automático)
- [ ] Todos os fluxos E2E validados no Azure
- [ ] Documentação atualizada
- [ ] Supabase desligado
