# 🎓 Harven.AI - Plataforma de Aprendizagem Socrática com IA

> **Transforme conteúdo educacional em diálogos socráticos inteligentes com 6 agentes de IA especializados.**

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## 📖 Sobre o Projeto

Harven.AI é uma plataforma educacional que utiliza **inteligência artificial** para criar experiências de aprendizado baseadas no **método socrático**. Em vez de dar respostas prontas, a IA guia o aluno através de perguntas provocativas que estimulam o pensamento crítico.

### ✨ Principais Funcionalidades

- 🤖 **6 Agentes de IA Especializados** - Sistema multiagente para geração, validação e análise
- 📚 **Gestão de Cursos Completa** - Upload de PDF, vídeos, textos
- 💬 **Diálogo Socrático Inteligente** - 3 turnos de conversação guiada
- 🔍 **Detecção de IA** - Identifica se aluno usou ChatGPT/IA
- 📊 **Dashboard Administrativo** - Métricas, usuários, configurações
- 📦 **Exportação Moodle** - Integração com LMS existente
- 🎨 **Interface Moderna** - React + TypeScript + Material-UI

---

## 🚀 Quick Start (3 Opções)

### Opção 1: Railway (5 minutos) ⚡
```bash
1. Acesse: https://railway.app
2. Deploy from GitHub
3. Configure variáveis de ambiente
✅ Pronto! Seu site está no ar
```
👉 [Guia Completo](/QUICK_START.md)

### Opção 2: Docker Local/VPS 🐳
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/harven-ai.git
cd harven-ai

# Configure variáveis
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais

# Deploy
./deploy.sh  # Linux/Mac
deploy.bat   # Windows
```
👉 [Guia de Deploy VPS](/PRODUCTION_DEPLOY.md)

### Opção 3: Desenvolvimento Local 💻
```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (outra janela)
cd harven.ai-platform-mockup
npm install
npm run dev
```

---

## 🎯 Arquitetura

### Stack Tecnológico

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Material-UI (componentes)
- Axios (HTTP client)

**Backend:**
- FastAPI (Python)
- OpenAI API (GPT-4o-mini)
- Supabase (PostgreSQL + Storage)
- Docker + Nginx

**IA (6 Agentes):**
1. **Creator** - Gera perguntas socráticas
2. **Socrates** - Conduz diálogo com aluno
3. **Analyst** - Detecta conteúdo de IA
4. **Editor** - Refina respostas do tutor
5. **Tester** - Valida qualidade das respostas
6. **Organizer** - Gerencia sessões e exporta

👉 [Documentação Completa dos Agentes](/AI_AGENTS.md)

### Fluxo de Dados

```
┌─────────────┐
│   Professor │
│  Upload PDF │
└──────┬──────┘
       │
       v
┌─────────────┐     ┌─────────────┐
│   CREATOR   │────>│  Perguntas  │
│  (Gera Q's) │     │  Socráticas │
└─────────────┘     └──────┬──────┘
                           │
                           v
                    ┌─────────────┐
                    │    Aluno    │
                    │  Responde   │
                    └──────┬──────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                v                     v
         ┌─────────────┐       ┌─────────────┐
         │   ANALYST   │       │  SOCRATES   │
         │ (Detecta IA)│       │  (Dialoga)  │
         └─────────────┘       └──────┬──────┘
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                           v                     v
                    ┌─────────────┐       ┌─────────────┐
                    │   EDITOR    │       │   TESTER    │
                    │  (Refina)   │       │  (Valida)   │
                    └──────┬──────┘       └──────┬──────┘
                           │                     │
                           └──────────┬──────────┘
                                      │
                                      v
                               ┌─────────────┐
                               │  ORGANIZER  │
                               │ (Salva+LMS) │
                               └─────────────┘
```

---

## 📁 Estrutura do Projeto

```
harven-ai/
├── backend/                    # API FastAPI
│   ├── agents/                 # 6 agentes de IA
│   │   ├── harven_creator.py
│   │   ├── harven_socrates.py
│   │   ├── harven_analyst.py
│   │   ├── harven_editor.py
│   │   ├── harven_tester.py
│   │   └── harven_organizer.py
│   ├── services/
│   │   └── ai_service.py       # Integração OpenAI
│   ├── main.py                 # API endpoints
│   ├── requirements.txt
│   └── Dockerfile
│
├── harven.ai-platform-mockup/  # Frontend React
│   ├── components/
│   ├── views/
│   ├── services/
│   │   └── api.ts              # API client
│   ├── contexts/
│   ├── package.json
│   └── Dockerfile
│
├── nginx/                      # Reverse proxy
│   └── nginx.conf
│
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção
├── deploy.sh                   # Deploy Linux/Mac
├── deploy.bat                  # Deploy Windows
│
└── docs/
    ├── QUICK_START.md          # Guia rápido
    ├── PRODUCTION_DEPLOY.md    # Deploy detalhado
    ├── AI_AGENTS.md            # Arquitetura IA
    └── DEPLOY.md               # Deploy Docker
```

---

## 🔧 Configuração

### Pré-requisitos

- ✅ Node.js 18+
- ✅ Python 3.11+
- ✅ Docker + Docker Compose (para deploy)
- ✅ Conta Supabase (banco de dados)
- ✅ Chave API OpenAI (inteligência artificial)

### Variáveis de Ambiente

Crie `backend/.env`:

```bash
# Supabase (obrigatório)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon

# OpenAI (obrigatório para IA)
OPENAI_API_KEY=sk-sua-chave-openai
OPENAI_MODEL=gpt-4o-mini

# Ambiente
ENVIRONMENT=production
FRONTEND_URL=https://seu-dominio.com
```

👉 [Configuração Completa](/backend/.env.example)

---

## 💰 Custos

### Setup Básico (100 alunos)
- **Hospedagem:** $0-6/mês (Railway/VPS)
- **Supabase:** $0/mês (free tier)
- **OpenAI:** $5-10/mês
- **Total:** **~$5-16/mês**

### Setup Médio (500 alunos)
- **Hospedagem:** $12/mês (VPS 2GB)
- **Supabase:** $0/mês
- **OpenAI:** $20-40/mês
- **Total:** **~$32-52/mês**

### Setup Grande (2000+ alunos)
- **Hospedagem:** $24/mês (VPS 4GB)
- **Supabase Pro:** $25/mês
- **OpenAI:** $100-200/mês
- **Total:** **~$150-250/mês**

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [QUICK_START.md](/QUICK_START.md) | 🚀 Guia de início rápido (3 opções de deploy) |
| [PRODUCTION_DEPLOY.md](/PRODUCTION_DEPLOY.md) | 📦 Deploy detalhado em VPS/Cloud |
| [AI_AGENTS.md](/AI_AGENTS.md) | 🤖 Arquitetura dos 6 agentes de IA |
| [DEPLOY.md](/DEPLOY.md) | 🐳 Deploy com Docker Compose |

---

## 🎨 Screenshots

### Dashboard Administrativo
*Métricas, usuários, logs e configurações*

### Criação de Conteúdo
*Upload de PDF/vídeo + geração automática de perguntas com IA*

### Diálogo Socrático
*Aluno conversa com IA tutor em 3 turnos de perguntas provocativas*

### Detecção de IA
*Sistema analisa se resposta foi gerada por ChatGPT*

---

## 🛠️ Desenvolvimento

### Estrutura de Branches

- `main` - Produção (protegida)
- `develop` - Desenvolvimento
- `feature/*` - Novas funcionalidades

### Comandos Úteis

```bash
# Desenvolvimento local
docker-compose up

# Ver logs
docker-compose logs -f backend

# Rebuild após mudanças
docker-compose up --build

# Parar tudo
docker-compose down

# Produção
./deploy.sh  # Linux/Mac
deploy.bat   # Windows
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🆘 Suporte

### Problemas Comuns

**"Banco de dados desconectado"**
```bash
# Verifique suas credenciais Supabase
cat backend/.env | grep SUPABASE
```

**"OpenAI API key não configurada"**
```bash
# Adicione sua chave OpenAI
nano backend/.env
# OPENAI_API_KEY=sk-sua-chave-aqui
```

**"CORS Error"**
```bash
# Configure FRONTEND_URL no backend
# backend/.env: FRONTEND_URL=https://seu-dominio.com
```

### Links Úteis

- 📖 [Documentação](/docs)
- 🐛 [Issues](https://github.com/seu-usuario/harven-ai/issues)
- 💬 [Discussões](https://github.com/seu-usuario/harven-ai/discussions)

---

## 👥 Autores

**exímIA Ventures** - *Plataforma Harven.AI*

---

## 🙏 Agradecimentos

- OpenAI pela API
- Supabase pelo backend as a service
- Comunidade open source

---

<p align="center">
  <strong>🎉 Feito com ❤️ por exímIA Ventures</strong>
</p>

<p align="center">
  <a href="/QUICK_START.md">Quick Start</a> •
  <a href="/PRODUCTION_DEPLOY.md">Deploy Guide</a> •
  <a href="/AI_AGENTS.md">AI Architecture</a>
</p>
