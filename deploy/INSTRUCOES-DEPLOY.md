# Harven.AI — Deploy no EasyPanel

## Visao Geral

| Servico | Tecnologia | Porta Interna | Dominio |
|---------|-----------|---------------|---------|
| **backend** | Python 3.11 + FastAPI | 8000 | api.harven.eximiaventures.com.br |
| **frontend** | React + Vite + Nginx | 80 | harven.eximiaventures.com.br |

Banco de dados: **Supabase** (PostgreSQL externo)

---

## 1. Criar Projeto no EasyPanel

1. Acesse o painel EasyPanel da VPS
2. Crie um novo projeto → tipo **Docker Compose**
3. Aponte para o repositorio Git (ou cole o `docker-compose.yml` da raiz)

---

## 2. Configurar Variaveis de Ambiente

Na aba **Ambiente** do EasyPanel, adicione as variaveis abaixo.

O EasyPanel injeta essas variaveis via `docker-compose.override.yml` automatico.

### Obrigatorias

| Variavel | Descricao | Como gerar |
|----------|-----------|------------|
| `DATABASE_URL` | Connection string Supabase | `postgresql://postgres:SENHA@db.REF.supabase.co:5432/postgres` |
| `JWT_SECRET_KEY` | Chave secreta para tokens JWT | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Chave da API OpenAI | Painel da OpenAI |

### Opcionais

| Variavel | Descricao | Default |
|----------|-----------|---------|
| `OPENAI_MODEL` | Modelo de IA | `gpt-4o-mini` |
| `FRONTEND_URL` | URL do frontend (CORS) | `https://harven.eximiaventures.com.br` |
| `ELEVENLABS_API_KEY` | Text-to-speech | — |
| `MOODLE_URL` | Integracao Moodle | — |
| `MOODLE_TOKEN` | Token Moodle | — |
| `JACAD_URL` | Integracao JACAD | — |
| `JACAD_API_KEY` | Chave API JACAD | — |

> **VITE_API_URL** e um build arg (usado pelo Vite no build do frontend).
> O default e `https://api.harven.eximiaventures.com.br`.
> So altere se usar dominio diferente.

---

## 3. Configurar Dominios

No EasyPanel, configure os dominios para cada servico:

- **frontend**: `harven.eximiaventures.com.br` → porta **80**
- **backend**: `api.harven.eximiaventures.com.br` → porta **8000**

O EasyPanel gera SSL automaticamente via Let's Encrypt.

---

## 4. Build e Deploy

Apos configurar variaveis e dominios, clique em **Deploy** no EasyPanel.

O processo:
1. Builda imagem do backend (Python + FastAPI)
2. Builda imagem do frontend (React → Nginx)
3. Inicia backend, aguarda healthcheck (20s start_period)
4. Inicia frontend apos backend estar saudavel

---

## 5. Verificar Status

```bash
# Testar backend
curl https://api.harven.eximiaventures.com.br/health

# Testar frontend
curl https://harven.eximiaventures.com.br
```

Ou verifique os logs diretamente no painel do EasyPanel.

---

## 6. Troubleshooting

| Problema | Solucao |
|----------|---------|
| Backend nao conecta ao banco | Verifique `DATABASE_URL` na aba Ambiente. Formato: `postgresql://postgres:SENHA@db.REF.supabase.co:5432/postgres` |
| Frontend retorna 502 | Backend pode nao ter iniciado. Aguarde o healthcheck (~20s). Verifique logs do backend. |
| IA nao funciona | Verifique `OPENAI_API_KEY` e que a chave tem credito. |
| CORS error | Verifique que `FRONTEND_URL` bate com o dominio real do frontend. |
| Uploads nao funcionam | O volume `harven-uploads` deve estar montado. Verifique no EasyPanel. |

---

## 7. Atualizacoes

Para atualizar: push no repositorio e clique **Redeploy** no EasyPanel.

Se houver mudancas no banco, execute migrations via terminal do EasyPanel:
```bash
docker compose exec backend alembic upgrade head
```
