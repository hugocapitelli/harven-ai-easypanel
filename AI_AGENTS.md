# Harven.AI - Arquitetura de Agentes de IA

## Visão Geral

A plataforma Harven.AI utiliza **6 agentes especializados** de IA que trabalham em conjunto para criar uma experiência de aprendizado socrático completa.

```
┌─────────────────────────────────────────────────────────────────┐
│                     HARVEN.AI - AI PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATOR          →  Gera perguntas socráticas              │
│     (Criador)            a partir do conteúdo                   │
│                                                                 │
│  2. SOCRATES         →  Conduz diálogo socrático               │
│     (Orientador)         com o aluno (3 turnos)                │
│                                                                 │
│  3. ANALYST          →  Detecta se resposta do aluno           │
│     (Analista)           foi gerada por IA                      │
│                                                                 │
│  4. EDITOR           →  Refina respostas do tutor              │
│     (Editor)             (remove rótulos, 2 parágrafos)        │
│                                                                 │
│  5. TESTER           →  Valida qualidade das respostas         │
│     (Validador)          (6 critérios socráticos)              │
│                                                                 │
│  6. ORGANIZER        →  Gerencia sessões e exporta             │
│     (Organizador)        dados para Moodle                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Os 6 Agentes

### 1. Harven_Creator (CreatorOS)
**Função:** Gera perguntas socráticas a partir do conteúdo educacional.

**Características:**
- Máximo de 3 perguntas por requisição
- Nunca gera perguntas de definição ("O que é...?")
- Sempre inclui cenários práticos
- Metadados pedagógicos completos (skill, intention, difficulty)

**Endpoint:**
```typescript
POST /api/ai/creator/generate
{
  "chapter_content": "string",
  "chapter_title": "string (opcional)",
  "learning_objective": "string (opcional)",
  "difficulty": "iniciante|intermediario|avancado",
  "max_questions": 3
}
```

**Exemplo de Output:**
```json
{
  "analysis": {
    "main_concepts": ["Gestão de Riscos", "Previsibilidade", "Sustentabilidade"],
    "key_relationships": ["Risco vs Retorno"],
    "potential_angles": ["Aplicação prática", "Trade-offs"]
  },
  "questions": [
    {
      "text": "Imagine que você é um gestor de agronegócio...",
      "skill": "aplicacao",
      "intention": "Fazer o aluno pensar em cenários reais",
      "expected_depth": "Análise de múltiplos fatores",
      "difficulty": "intermediario"
    }
  ]
}
```

---

### 2. Harven_Socrates (SocratesOS)
**Função:** Conduz diálogo socrático com o aluno (3 interações).

**Características:**
- NUNCA dá respostas diretas
- Sempre termina com pergunta aberta
- Feedback construtivo + provocação
- Respostas de 1-2 parágrafos

**Endpoint:**
```typescript
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

**Exemplo de Output:**
```json
{
  "response": {
    "content": "Você levanta um ponto interessante sobre...\n\nComo você aplicaria isso em...?",
    "has_question": true,
    "is_final_interaction": false
  },
  "session_status": {
    "interactions_remaining": 2,
    "should_finalize": false
  }
}
```

---

### 3. Harven_Analyst (AnalystOS)
**Função:** Detecta se a resposta do aluno foi gerada por IA.

**Características:**
- Probabilidade de 0.0 a 1.0
- Detecta frases típicas de LLMs
- Copy/paste NÃO é considerado fraude
- Nunca bloqueia envio da mensagem

**Endpoint:**
```typescript
POST /api/ai/analyst/detect
{
  "text": "string",
  "context": {},
  "interaction_metadata": {}
}
```

**Exemplo de Output:**
```json
{
  "ai_detection": {
    "probability": 0.85,
    "confidence": "high",
    "verdict": "likely_ai",
    "indicators": [
      {
        "type": "artificial_connectors",
        "description": "Detectado: 'É importante ressaltar', 'Nesse sentido'",
        "weight": 0.30
      }
    ],
    "flag": "alta_probabilidade_texto_IA"
  },
  "metrics": {
    "text": {
      "message_length_chars": 520,
      "message_length_words": 82
    }
  },
  "recommendation": "Revisar manualmente"
}
```

---

### 4. Harven_Editor (EditorOS)
**Função:** Refina respostas do tutor para soarem naturais.

**Características:**
- Remove rótulos como [Feedback], [Pergunta]
- Garante estrutura de exatamente 2 parágrafos
- Preserva 100% do significado original
- 80-200 palavras

**Endpoint:**
```typescript
POST /api/ai/editor/edit
{
  "orientador_response": "string",
  "context": {}
}
```

**Exemplo de Output:**
```json
{
  "edited_text": "Sua resposta demonstra compreensão inicial...\n\nComo você avaliaria uma empresa que...?",
  "word_count": 142,
  "paragraph_count": 2,
  "ends_with_question": true
}
```

---

### 5. Harven_Tester (TesterOS)
**Função:** Valida qualidade das respostas contra 6 critérios.

**Características:**
- C1: Sem resposta direta (CRITICAL)
- C2: Pergunta aberta ao final (CRITICAL)
- C3: Feedback construtivo (MAJOR)
- C4: Sem rótulos artificiais (MAJOR)
- C5: Texto fluido e natural (MINOR)
- C6: Conexão com tema (MINOR)

**Endpoint:**
```typescript
POST /api/ai/tester/validate
{
  "edited_response": "string",
  "context": {}
}
```

**Exemplo de Output:**
```json
{
  "verdict": "APPROVED",
  "score": 1.0,
  "criteria_results": {
    "C1_no_direct_answer": {
      "passed": true,
      "severity": "CRITICAL",
      "notes": "Resposta oferece nuance sem entregar informação"
    },
    "C2_open_question": {
      "passed": true,
      "severity": "CRITICAL",
      "notes": "Pergunta aberta presente"
    }
  },
  "summary": {
    "passed_count": 6,
    "failed_count": 0,
    "critical_failures": []
  },
  "recommendation": "Pronto para envio ao aluno"
}
```

---

### 6. Harven_Organizer (OrganizerOS)
**Função:** Gerencia persistência de dados e exportação para Moodle.

**Características:**
- Salva TODAS as mensagens (aluno + IA)
- Gerencia ciclo de vida das sessões
- Exporta automaticamente para Moodle
- Fila de retry para falhas

**Endpoint:**
```typescript
POST /api/ai/organizer/session
{
  "action": "save_message",
  "payload": {
    "session_id": "uuid",
    "role": "student|tutor",
    "content": "string"
  },
  "metadata": {}
}
```

**Ações disponíveis:**
- `save_message` - Salva mensagem no banco
- `finalize_session` - Finaliza sessão
- `export_to_moodle` - Exporta para Moodle
- `get_session_status` - Consulta status
- `validate_export_payload` - Valida payload

---

## Fluxo Completo de Uso

### Etapa 1: Criação de Conteúdo (Professor)
```typescript
// 1. Professor faz upload de PDF/vídeo
await contentsApi.uploadFile(chapterId, file);

// 2. AI gera perguntas automaticamente
const result = await aiApi.generateQuestions({
  chapter_content: extractedText,
  chapter_title: "Gestão de Riscos",
  difficulty: "intermediario",
  max_questions: 3
});

// 3. Salva perguntas no banco
await questionsApi.create(contentId, result.questions);
```

### Etapa 2: Interação do Aluno
```typescript
// 1. Aluno responde à pergunta
const studentMessage = "Eu acho que gestão de riscos é importante porque...";

// 2. Analyst detecta se é IA
const analysis = await aiApi.detectAI({
  text: studentMessage,
  context: { chapter_id: chapterId }
});

// 3. Organizer salva mensagem com metadados
await aiApi.organizeSession({
  action: "save_message",
  payload: {
    session_id: sessionId,
    role: "student",
    content: studentMessage,
    turn_number: 1
  },
  metadata: {
    ai_probability: analysis.ai_detection.probability,
    ai_verdict: analysis.ai_detection.verdict
  }
});

// 4. Socrates gera resposta
const dialogue = await aiApi.socraticDialogue({
  student_message: studentMessage,
  chapter_content: chapterContent,
  initial_question: question,
  interactions_remaining: 3
});

// 5. Editor refina resposta
const edited = await aiApi.editResponse({
  orientador_response: dialogue.response.content
});

// 6. Tester valida qualidade
const validation = await aiApi.validateResponse({
  edited_response: edited.edited_text
});

// 7. Se aprovado, envia para aluno
if (validation.verdict === "APPROVED") {
  await aiApi.organizeSession({
    action: "save_message",
    payload: {
      session_id: sessionId,
      role: "tutor",
      content: edited.edited_text,
      turn_number: 1
    }
  });
}
```

### Etapa 3: Finalização e Exportação
```typescript
// Após 3 interações
if (interactions_remaining === 0) {
  // 1. Finaliza sessão
  await aiApi.organizeSession({
    action: "finalize_session",
    payload: { session_id: sessionId }
  });

  // 2. Prepara exportação
  const exportData = await aiApi.prepareMoodleExport(sessionData);

  // 3. Exporta para Moodle
  await aiApi.organizeSession({
    action: "export_to_moodle",
    payload: { session_id: sessionId, export_payload: exportData }
  });
}
```

---

## Arquivos Criados

### Backend
```
backend/
├── agents/
│   ├── __init__.py              # Registro dos 6 agentes
│   ├── harven_creator.py        # Gerador de perguntas
│   ├── harven_socrates.py       # Diálogo socrático
│   ├── harven_analyst.py        # Detector de IA
│   ├── harven_editor.py         # Refinador de respostas
│   ├── harven_tester.py         # Validador de qualidade
│   └── harven_organizer.py      # Gerenciador de sessões
│
├── services/
│   └── ai_service.py            # Serviço de integração OpenAI
│
└── main.py                      # Endpoints da API (10 novos)
```

### Frontend
```
harven.ai-platform-mockup/
└── services/
    └── api.ts                   # API client com todos os agentes
```

---

## Configuração

### 1. Instalar Dependências
```bash
cd backend
pip install openai
```

### 2. Configurar Variáveis de Ambiente
```bash
# backend/.env
OPENAI_API_KEY=sk-sua-chave-aqui
OPENAI_MODEL=gpt-4o-mini
```

### 3. Reiniciar Backend
```bash
cd backend
python main.py
```

### 4. Testar
```bash
# Verificar status
curl http://localhost:8002/api/ai/status

# Gerar perguntas
curl -X POST http://localhost:8002/api/ai/creator/generate \
  -H "Content-Type: application/json" \
  -d '{
    "chapter_content": "A gestão de riscos é fundamental...",
    "max_questions": 2
  }'
```

---

## Endpoints da API

| Agente | Endpoint | Método | Descrição |
|--------|----------|--------|-----------|
| Status | `/api/ai/status` | GET | Verifica se IA está disponível |
| Creator | `/api/ai/creator/generate` | POST | Gera perguntas socráticas |
| Socrates | `/api/ai/socrates/dialogue` | POST | Conduz diálogo socrático |
| Analyst | `/api/ai/analyst/detect` | POST | Detecta conteúdo de IA |
| Editor | `/api/ai/editor/edit` | POST | Refina respostas |
| Tester | `/api/ai/tester/validate` | POST | Valida qualidade |
| Organizer | `/api/ai/organizer/session` | POST | Gerencia sessões |
| Organizer | `/api/ai/organizer/prepare-export` | POST | Prepara exportação Moodle |
| Utilidade | `/api/ai/estimate-cost` | GET | Estima custo de chamadas |

---

## Custos Estimados (OpenAI)

### Modelo Recomendado: gpt-4o-mini
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

### Cenário de Uso: 1000 interações/mês
- Creator: 1000 × ~1500 tokens = **~$0.90**
- Socrates: 3000 × ~500 tokens = **~$0.90**
- Analyst: 1000 × ~800 tokens = **~$0.48**
- Editor: 3000 × ~300 tokens = **~$0.54**
- Tester: 3000 × ~800 tokens = **~$1.44**

**Total estimado: ~$4-5/mês** para 1000 interações completas.

---

## Próximos Passos

1. ✅ Todos os 6 agentes implementados
2. ✅ Endpoints do backend criados
3. ✅ Frontend API atualizado
4. ⏳ Testar integração end-to-end
5. ⏳ Implementar interface de diálogo socrático no frontend
6. ⏳ Configurar exportação real para Moodle

---

## Suporte

Para dúvidas sobre os agentes, consulte os prompts originais em:
`Z_Squad/outputs/Harven_*/03_prompt/prompt_operacional.md`
