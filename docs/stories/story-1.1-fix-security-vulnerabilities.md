# Story 1.1 — Fix Security Vulnerabilities

**Epic:** EPIC-TD-001 (Resolucao de Debitos Tecnicos)
**Sprint:** 1
**Estimativa:** 24 horas
**Prioridade:** CRITICAL
**Assignee:** @dev

---

## Objetivo

Eliminar todas as vulnerabilidades de seguranca criticas no backend que impedem deploy seguro em producao.

## Tasks

- [ ] **T1: Remover .env.production do git** (3h)
  - Remover arquivo do tracking: `git rm --cached .env.production`
  - Adicionar ao .gitignore
  - Usar `git filter-branch` ou `bfg` para remover do historico
  - Rotacionar TODAS as credenciais expostas:
    - Supabase anon key e service key
    - OpenAI API key
    - ElevenLabs API key
    - JWT secret

- [ ] **T2: Remover JWT secret hardcoded fallback** (2h)
  - Em `backend/main.py`: remover fallback `"harven-dev-secret-change-in-production"`
  - Fazer startup falhar se `JWT_SECRET_KEY` nao estiver definido
  - Atualizar documentacao de deploy

- [ ] **T3: Remover plaintext password fallback** (4h)
  - Em `backend/main.py`: remover comparacao legacy plaintext
  - Forcar password reset para usuarios com senhas nao-hashadas
  - Criar endpoint `POST /auth/reset-password` basico
  - Testar login com bcrypt-only

- [ ] **T4: Restringir CORS** (2h)
  - Substituir `allow_methods=["*"]` por lista explicita: `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
  - Substituir `allow_headers=["*"]` por lista explicita
  - Remover origens localhost em producao (usar FRONTEND_URL do env)

- [ ] **T5: Remover debug logging sensivel** (4h)
  - Buscar e remover todos `print(f"DEBUG:` em main.py
  - Remover logging de response.data do Supabase
  - Remover logging de passwords/tokens
  - Substituir por logger com nivel adequado

- [ ] **T6: Request size limit global** (2h)
  - Adicionar middleware de request size limit (10MB default)
  - Manter 50MB apenas para upload endpoints

- [ ] **T7: Webhook Moodle secret obrigatorio** (2h)
  - Fazer startup falhar se MOODLE_WEBHOOK_SECRET nao definido quando moodle habilitado
  - Ou desabilitar webhook endpoint se secret ausente

- [ ] **T8: Rate limiting expandido** (5h)
  - Adicionar rate limiting em endpoints admin (10/min)
  - Adicionar rate limiting em CRUD endpoints (30/min)
  - Adicionar rate limiting em search (20/min)

## Criterios de Aceite

- [ ] .env.production removido do git (incluindo historico)
- [ ] Todas as credenciais expostas rotacionadas
- [ ] Backend falha ao iniciar sem JWT_SECRET_KEY
- [ ] Login funciona APENAS com bcrypt (nenhum plaintext aceito)
- [ ] CORS restrito a metodos e headers explicitos
- [ ] Zero `print()` de debug no codigo
- [ ] Request size limit ativo (testar com payload > 10MB)
- [ ] Rate limiting em todos os endpoints

## Definition of Done

- [ ] Todos os tasks concluidos
- [ ] Testes manuais passando
- [ ] Deploy em staging sem erros
- [ ] Security review por segundo dev

## Arquivos Impactados

- `backend/main.py`
- `.gitignore`
- `.env.production` (removido)
- `.env.example` (atualizado)
- `DEPLOY.md` (atualizado)

---

*Story criada pelo workflow Brownfield Discovery*
