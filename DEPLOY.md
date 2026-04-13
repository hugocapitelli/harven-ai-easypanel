# Harven.AI - Guia de Deploy

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Harven.AI Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  Frontend   │    │   Backend   │    │  Supabase   │    │
│  │   (React)   │───>│  (FastAPI)  │───>│    (DB)     │    │
│  │   Nginx:80  │    │  Port 8000  │    │   (Cloud)   │    │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    │
│                            │                               │
│                            v                               │
│                    ┌─────────────┐                        │
│                    │   OpenAI    │                        │
│                    │    API      │                        │
│                    └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deploy no Coolify (Hostinger VPS)

### Dominios Configurados

| Servico | Dominio | Porta |
|---------|---------|-------|
| Frontend | `harven.eximiaventures.com.br` | 80 |
| Backend | `api.harven.eximiaventures.com.br` | 8000 |

### Pre-requisitos

- VPS Hostinger com Coolify instalado
- Dominio apontando para IP da VPS
- Conta Supabase configurada
- Chave API OpenAI

---

### Variaveis de Ambiente (Backend)

Configure no Coolify:

```env
# OBRIGATORIAS
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role
OPENAI_API_KEY=sk-proj-sua-chave
JWT_SECRET=gere-um-uuid-seguro

# OPCIONAIS
OPENAI_MODEL=gpt-4o-mini
FRONTEND_URL=https://harven.eximiaventures.com.br
ENVIRONMENT=production
```

### Build Arguments (Frontend)

Configure no Coolify como **Build Argument** (NAO environment variable):

```
VITE_API_URL=https://api.harven.eximiaventures.com.br
```

---

### Passo a Passo no Coolify

#### 1. Criar Projeto

1. Acesse o painel Coolify
2. **New Project** > Nome: `Harven.AI`

#### 2. Deploy do Backend

1. **New Resource** > **Docker** > **Dockerfile**
2. Configuracoes:
   - **Repository**: Seu repo Git
   - **Build Path**: `./backend`
   - **Dockerfile**: `Dockerfile`
3. **Environment Variables**: (adicione as variaveis acima)
4. **Domains**: `api.harven.eximiaventures.com.br`
5. **Enable HTTPS**: Sim (Let's Encrypt)
6. **Deploy**

#### 3. Deploy do Frontend

1. **New Resource** > **Docker** > **Dockerfile**
2. Configuracoes:
   - **Repository**: Seu repo Git
   - **Build Path**: `./harven.ai-platform-mockup`
   - **Dockerfile**: `Dockerfile`
3. **Build Arguments**:
   ```
   VITE_API_URL=https://api.harven.eximiaventures.com.br
   ```
4. **Domains**: `harven.eximiaventures.com.br`
5. **Enable HTTPS**: Sim (Let's Encrypt)
6. **Deploy**

---

### Configuracao DNS (Hostinger)

No painel DNS, adicione registros A:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | harven | IP_DA_VPS | 3600 |
| A | api.harven | IP_DA_VPS | 3600 |

---

### Verificacao Pos-Deploy

```bash
# Testar Backend
curl https://api.harven.eximiaventures.com.br/
# Esperado: {"message":"Harven.AI Backend está rodando!"}

# Testar Docs API
curl https://api.harven.eximiaventures.com.br/docs
# Abre documentacao Swagger

# Testar Status IA
curl https://api.harven.eximiaventures.com.br/api/ai/status
```

---

## Deploy Local (Desenvolvimento)

```bash
# Na raiz do projeto
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

Acesse:
- Frontend: http://localhost:80
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Troubleshooting

### Erro CORS
- Verifique `FRONTEND_URL` no backend
- O dominio deve estar na lista CORS em `main.py`

### Frontend nao conecta ao Backend
- `VITE_API_URL` deve ser **Build Argument**, nao env var
- Faca rebuild apos mudar

### Erro 502 Bad Gateway
- Verifique logs: `docker logs harven-backend`
- Confirme portas: backend=8000, frontend=80

### IA nao funciona
- Verifique `OPENAI_API_KEY`
- Teste: `curl .../api/ai/status`

---

## Seguranca - Checklist

- [ ] Rotacionar credenciais Supabase
- [ ] Gerar novo JWT_SECRET
- [ ] HTTPS habilitado
- [ ] `.env` NAO esta no Git
- [ ] Backup Supabase configurado

---

## Custos Estimados

| Servico | Custo |
|---------|-------|
| Supabase Free | $0/mes |
| OpenAI (uso moderado) | ~$10-30/mes |
| VPS Hostinger | ~$5-15/mes |
| **Total** | **~$15-45/mes** |

---

## Endpoints da API de IA

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/ai/status` | GET | Status do servico |
| `/api/ai/creator/generate` | POST | Gerar perguntas |
| `/api/ai/socrates/dialogue` | POST | Dialogo socratico |
| `/api/ai/analyst/detect` | POST | Detectar IA |

---

## Suporte

- **Docs API**: https://api.harven.eximiaventures.com.br/docs
- **Supabase**: https://supabase.com/dashboard
