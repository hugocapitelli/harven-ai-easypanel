# 05 - Chapter Reader (Leitor de Capítulo)

**Prioridade:** P0 (Sprint 1)
**Persona:** STUDENT
**Funcionalidade:** Ler conteúdo do capítulo e acessar chat socrático

---

## Prompt para Google Stitch

```
Crie um design de leitor de conteúdo educacional com chat lateral para plataforma de aprendizagem usando a seguinte paleta de cores:
- Preto (#000000) para texto principal
- Verde Escuro (#1c2d1b) para sidebar e topbar
- Verde Neon (#d2ff00) para botões primários e destaques
- Cinza Claro (#f5f5f0) para fundo principal
- Dourado (#c0ac6f) para acentos secundários

Layout:
- Sidebar esquerda 256px (já definida no 00-Layout-Components)
- Topbar superior 64px (já definida no 00-Layout-Components)
- Área principal dividida em 2 colunas:
  - Coluna esquerda (60%): Conteúdo do capítulo
  - Coluna direita (40%): Chat socrático lateral

Conteúdo da coluna esquerda:
1. Header do capítulo:
   - Breadcrumb de navegação
   - Título do capítulo grande
   - Tempo estimado de leitura
   - Navegação anterior/próximo capítulo

2. Área de conteúdo:
   - Texto do capítulo formatado (markdown)
   - Tipografia otimizada para leitura
   - Imagens e diagramas quando aplicável
   - Botão "Marcar como Concluído" no final

Coluna direita (Chat):
- Header com título "Chat Socrático"
- Contador de perguntas (3/3 disponíveis)
- Área de mensagens
- Input de texto
- Botão "Enviar Pergunta" (Verde Neon #d2ff00)

Estilo:
- Layout clean e focado em leitura
- Espaçamento generoso
- Tipografia hierárquica
- Design minimalista
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Curso > Módulo 1 > Cap. 1.2] [Progresso 2/6] [🔔] [🌓] [Avatar ▼]            │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬────────────────────────────────────────┬───────────────────────────────┐
│          │ COLUNA DE CONTEÚDO (60%)               │ COLUNA DE CHAT (40%)          │
│ SIDEBAR  │ Max-width 800px, Padding 48px          │ Width 480px fixed             │
│ (#1c2d1b)│                                        │                               │
│ 256px    │ ┌────────────────────────────────────┐ │ ┌───────────────────────────┐ │
│          │ │ HEADER DO CAPÍTULO                 │ │ │ CHAT HEADER (#1c2d1b)     │ │
│ [🏠 Início│ │                                    │ │ │ Padding 20px              │ │
│          │ │ Capítulo 1.2                       │ │ │                           │ │
│ [📚 Cursos│ │ H1: "História do Agronegócio      │ │ │ Chat Socrático            │ │
│  ATIVO]  │ │      no Brasil"                    │ │ │                           │ │
│          │ │ (#000000, 36px, bold)              │ │ │ [💬 3/3] (#d2ff00 badge) │ │
│ [💬 Chat  │ │                                    │ │ │ perguntas disponíveis     │ │
│          │ │ ⏱ 15 min de leitura • [← Anterior │ │ └───────────────────────────┘ │
│ [📖 Hist. │ │    [Próximo →]                    │ │                               │
│          │ └────────────────────────────────────┘ │ ┌───────────────────────────┐ │
│ [👤 Perfil│                                        │ │ ÁREA DE MENSAGENS         │ │
│          │ ┌────────────────────────────────────┐ │ │ Scroll, Padding 20px      │ │
│          │ │ CONTEÚDO DO CAPÍTULO               │ │ │ Height: calc(100vh-280px) │ │
│          │ │ (#ffffff card, padding 32px)       │ │ │                           │ │
│          │ │                                    │ │ │ [Mensagem IA - Gray]      │ │
│ [🚪 Sair] │ │ Introdução                         │ │ │ Olá! Estou aqui para     │ │
│          │ │                                    │ │ │ ajudá-lo a refletir...   │ │
│          │ │ O agronegócio brasileiro tem       │ │ │                           │ │
│          │ │ raízes profundas na história       │ │ │ [Mensagem User - Green]   │ │
│          │ │ colonial do país...                │ │ │ Qual foi o impacto da     │ │
│          │ │                                    │ │ │ colonização?              │ │
│          │ │ [Parágrafo 1]                      │ │ │                           │ │
│          │ │ Desde o período colonial, a        │ │ │ [Mensagem IA - Gray]      │ │
│          │ │ agricultura...                     │ │ │ Ótima pergunta! Em vez    │ │
│          │ │                                    │ │ │ de responder, reflita...  │ │
│          │ │ [Imagem ilustrativa]               │ │ │                           │ │
│          │ │ └──────────────────────────┘       │ │ │                           │ │
│          │ │                                    │ │ │ [Espaço para scroll]      │ │
│          │ │ [Parágrafo 2]                      │ │ │                           │ │
│          │ │ A economia colonial foi...         │ │ │                           │ │
│          │ │                                    │ │ │                           │ │
│          │ │ [... mais conteúdo ...]            │ │ └───────────────────────────┘ │
│          │ │                                    │ │                               │
│          │ │                                    │ │ ┌───────────────────────────┐ │
│          │ │ Conclusão                          │ │ │ INPUT AREA                │ │
│          │ │                                    │ │ │ Padding 20px, Border-top  │ │
│          │ │ Compreender essa história é        │ │ │ 1px #e0e0e0               │ │
│          │ │ fundamental para...                │ │ │                           │ │
│          │ │                                    │ │ │ ┌───────────────────────┐ │ │
│          │ │ [✓ Marcar como Concluído]          │ │ │ │ Digite sua pergunta   │ │ │
│          │ │ (#d2ff00 button, center)           │ │ │ │ aqui...               │ │ │
│          │ │                                    │ │ │ │ (textarea)            │ │ │
│          │ │ [← Anterior] [Próximo →]           │ │ │ └───────────────────────┘ │ │
│          │ └────────────────────────────────────┘ │ │                           │ │
│          │                                        │ │ [Enviar Pergunta ▶]       │ │
│          │                                        │ │ (#d2ff00, full width)     │ │
│          │                                        │ │                           │ │
│          │                                        │ │ Você tem 3 perguntas      │ │
│          │                                        │ │ disponíveis (#666, 12px)  │ │
│          │                                        │ └───────────────────────────┘ │
└──────────┴────────────────────────────────────────┴───────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Cap. 1.2        [💬] [🔔] [Avtr│
└─────────────────────────────────────┘
│ CONTEÚDO - Padding 16px             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Capítulo 1.2                    │ │
│ │                                 │ │
│ │ História do Agronegócio         │ │
│ │ no Brasil                       │ │
│ │                                 │ │
│ │ ⏱ 15 min                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CONTEÚDO (#fff card)            │ │
│ │                                 │ │
│ │ Introdução                      │ │
│ │                                 │ │
│ │ O agronegócio brasileiro tem    │ │
│ │ raízes profundas na história    │ │
│ │ colonial do país...             │ │
│ │                                 │ │
│ │ [Parágrafo 1]                   │ │
│ │ Desde o período colonial...     │ │
│ │                                 │ │
│ │ [Imagem]                        │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │                             │ │ │
│ │ │   [Ilustração]              │ │ │
│ │ │                             │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ [... mais conteúdo ...]         │ │
│ │                                 │ │
│ │ Conclusão                       │ │
│ │ Compreender essa história...    │ │
│ │                                 │ │
│ │ [✓ Concluir Capítulo]           │ │
│ │ (#d2ff00 button, full width)    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [← Anterior] [Próximo →]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ BOTÃO FLUTUANTE CHAT (fixed)    │ │
│ │ Bottom-right, 60px circle       │ │
│ │ [💬] (#d2ff00)                  │ │
│ │ Badge: [3] perguntas            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

MODAL DE CHAT (quando ativado):
┌─────────────────────────────────────┐
│ [×] Chat Socrático      [3/3] 💬    │
├─────────────────────────────────────┤
│                                     │
│ [Mensagem IA]                       │
│ Olá! Estou aqui para...             │
│                                     │
│              [Mensagem User]        │
│              Qual foi o impacto...  │
│                                     │
│ [Mensagem IA]                       │
│ Ótima pergunta! Reflita...          │
│                                     │
│ [Scroll de mensagens]               │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Digite sua pergunta...          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Enviar ▶] (#d2ff00 full width)    │
│                                     │
│ Você tem 3 perguntas disponíveis    │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Conteúdo do Capítulo
- **Fundo da área:** #f5f5f0
- **Card de conteúdo:** #ffffff
- **Títulos:** #000000
- **Texto corpo:** #333333
- **Subtítulos:** #000000
- **Links:** #d2ff00 (Verde Neon)
- **Blockquotes:** Border-left #c0ac6f 4px, background #f9f9f9

### Chat Socrático
- **Header do chat:** #1c2d1b (Verde Escuro)
- **Título do chat:** #ffffff
- **Badge contador:** #d2ff00 com texto #000000
- **Fundo área de mensagens:** #f5f5f0
- **Mensagem da IA:**
  - Background: #ffffff
  - Border-left: #c0ac6f 4px
  - Text: #333333
- **Mensagem do usuário:**
  - Background: #d2ff00 com opacity 0.15
  - Border-left: #d2ff00 4px
  - Text: #000000
- **Input área:**
  - Background: #ffffff
  - Border: 2px solid #e0e0e0
  - Focus: Border #d2ff00
- **Botão "Enviar":** Background #d2ff00, texto #000000

### Botões e Ações
- **"Marcar como Concluído":** Background #d2ff00, texto #000000
- **Navegação (Anterior/Próximo):** Outline #d2ff00 2px, texto #000000
- **Botão flutuante (mobile):** Background #d2ff00, ícone #000000

---

## Componentes e Especificações

### Header do Capítulo
**Dimensões:**
- Padding: 24px 0
- Border-bottom: 1px solid #e0e0e0

**Estrutura:**
- **Título:**
  - Font-size: 36px
  - Font-weight: 700
  - Color: #000000
  - Line-height: 1.3
  - Margin-bottom: 12px

- **Meta informações:**
  - Font-size: 14px
  - Color: #666666
  - Display: flex
  - Gap: 16px
  - Align-items: center

- **Tempo de leitura:**
  - Icon: ⏱
  - Format: "X min de leitura"

- **Navegação:**
  - Buttons: Height 36px, padding 8px 16px
  - Border: 2px solid #d2ff00
  - Color: #000000
  - Border-radius: 6px

### Card de Conteúdo
**Dimensões:**
- Background: #ffffff
- Padding: 32px (desktop), 20px (mobile)
- Border-radius: 8px
- Box-shadow: 0 2px 8px rgba(0,0,0,0.04)
- Max-width: 800px

**Tipografia:**
- **Parágrafos:**
  - Font-size: 18px
  - Line-height: 1.8
  - Color: #333333
  - Margin-bottom: 24px
  - Font-family: Georgia, serif (otimizada para leitura)

- **Subtítulos (h2):**
  - Font-size: 28px
  - Font-weight: 700
  - Color: #000000
  - Margin-top: 40px
  - Margin-bottom: 16px

- **Subtítulos (h3):**
  - Font-size: 22px
  - Font-weight: 600
  - Color: #000000
  - Margin-top: 32px
  - Margin-bottom: 12px

- **Links:**
  - Color: #d2ff00
  - Text-decoration: underline
  - Hover: Color #b8e600

- **Blockquotes:**
  - Padding-left: 20px
  - Border-left: 4px solid #c0ac6f
  - Background: #f9f9f9
  - Font-style: italic
  - Color: #555555

- **Imagens:**
  - Max-width: 100%
  - Height: auto
  - Border-radius: 8px
  - Margin: 24px 0
  - Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

### Chat Socrático (Desktop)
**Dimensões:**
- Width: 480px fixed
- Height: calc(100vh - 64px) (full height menos topbar)
- Position: sticky, top: 64px
- Background: #ffffff
- Border-left: 1px solid #e0e0e0

**Header:**
- Background: #1c2d1b
- Padding: 20px
- Color: #ffffff
- Display: flex
- Justify-content: space-between
- Align-items: center

**Badge Contador:**
- Background: #d2ff00
- Color: #000000
- Padding: 4px 12px
- Border-radius: 12px
- Font-size: 14px
- Font-weight: 600

**Área de Mensagens:**
- Height: calc(100vh - 280px)
- Overflow-y: auto
- Padding: 20px
- Background: #f5f5f0

**Mensagem (comum):**
- Margin-bottom: 16px
- Padding: 12px 16px
- Border-radius: 8px
- Max-width: 90%

**Mensagem IA:**
- Background: #ffffff
- Border-left: 4px solid #c0ac6f
- Align-self: flex-start
- Box-shadow: 0 2px 4px rgba(0,0,0,0.06)

**Mensagem Usuário:**
- Background: rgba(210,255,0,0.15)
- Border-left: 4px solid #d2ff00
- Align-self: flex-end
- Margin-left: auto

**Input Área:**
- Padding: 20px
- Border-top: 1px solid #e0e0e0
- Background: #ffffff

**Textarea:**
- Width: 100%
- Min-height: 80px
- Padding: 12px
- Border: 2px solid #e0e0e0
- Border-radius: 8px
- Font-size: 14px
- Resize: vertical
- Focus: Border-color #d2ff00, outline none

**Botão "Enviar Pergunta":**
- Width: 100%
- Height: 44px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Margin-top: 12px
- Border: none
- Cursor: pointer

**Texto de Ajuda:**
- Font-size: 12px
- Color: #666666
- Text-align: center
- Margin-top: 8px

### Botão "Marcar como Concluído"
**Dimensões:**
- Width: fit-content
- Height: 48px
- Padding: 0 32px
- Background: #d2ff00
- Color: #000000
- Font-size: 16px
- Font-weight: 600
- Border-radius: 8px
- Border: none
- Margin: 32px auto 0
- Display: block

### Botão Flutuante (Mobile)
**Dimensões:**
- Width: 60px
- Height: 60px
- Border-radius: 50%
- Background: #d2ff00
- Color: #000000
- Position: fixed
- Bottom: 24px
- Right: 24px
- Box-shadow: 0 4px 12px rgba(210,255,0,0.4)
- Z-index: 1000

**Badge:**
- Position: absolute
- Top: -4px
- Right: -4px
- Background: #000000
- Color: #d2ff00
- Width: 24px
- Height: 24px
- Border-radius: 50%
- Font-size: 12px
- Font-weight: 700
- Display: flex
- Align-items: center
- Justify-content: center

---

## Estados Interativos

### Botão "Marcar como Concluído" Hover
- Background: #b8e600
- Transform: translateY(-2px)
- Box-shadow: 0 6px 16px rgba(210,255,0,0.4)

### Links no Conteúdo Hover
- Color: #b8e600
- Text-decoration-thickness: 2px

### Mensagem no Chat Hover
- Box-shadow: 0 4px 8px rgba(0,0,0,0.1)

### Input Focus
- Border-color: #d2ff00
- Box-shadow: 0 0 0 3px rgba(210,255,0,0.1)

### Botão Flutuante Hover
- Transform: scale(1.05)
- Box-shadow: 0 6px 16px rgba(210,255,0,0.5)

---

## Comportamento Responsivo

### Desktop (>1200px)
- Layout 2 colunas (60% / 40%)
- Chat fixo lateral
- Conteúdo max-width 800px

### Tablet (768px - 1199px)
- Chat como drawer lateral (slide-in)
- Botão "Abrir Chat" visível
- Conteúdo ocupa 100% width

### Mobile (<768px)
- Layout 1 coluna
- Chat como modal full-screen
- Botão flutuante para abrir chat
- Padding reduzido (16px)
- Font-size do conteúdo: 16px

---

## Casos Especiais

### Capítulo sem Conteúdo
```
┌─────────────────────────────────┐
│ [Ícone 📄 grande, cinza claro]  │
│                                 │
│ Este capítulo está em construção│
│                                 │
│ [← Voltar ao curso]             │
└─────────────────────────────────┘
```

### Perguntas Esgotadas (0/3)
- Badge muda para "0/3" com background #cccccc
- Textarea desabilitada
- Botão "Enviar" desabilitado (opacity 0.5)
- Mensagem: "Você usou todas as 3 perguntas deste capítulo"
- Link: "Finalize o capítulo para continuar"

### Capítulo Já Concluído
- Checkbox ✓ verde ao lado do título
- Botão muda para "Revisar Novamente"
- Badge "Concluído" no breadcrumb

### Chat Vazio (primeira mensagem)
```
[Mensagem IA de boas-vindas]
Olá! Sou seu assistente socrático.
Faça perguntas sobre o conteúdo e
eu ajudarei você a refletir.

Você tem 3 perguntas disponíveis
para este capítulo.
```

### Conteúdo com Vídeo
```
┌─────────────────────────────────┐
│ [Player de vídeo 16:9]          │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    [▶ Play Button]          │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ Vídeo: História do Agro (12min) │
└─────────────────────────────────┘
```

### Loading States
- **Conteúdo:** Skeleton com shimmer effect
- **Chat:** Spinner animado ao enviar pergunta
- **Imagens:** Lazy loading com placeholder blur

---

## Acessibilidade

- **Tipografia:** Contraste mínimo 4.5:1 (WCAG AA)
- **Font-size:** Mínimo 16px para corpo de texto
- **Line-height:** 1.8 para facilitar leitura
- **Focus visible:** Outline #d2ff00 3px em todos elementos
- **Keyboard navigation:**
  - Tab para navegar entre seções
  - Enter para marcar como concluído
  - Ctrl+Enter para enviar mensagem no chat
- **Screen reader:**
  - ARIA labels em botões
  - Anunciar contador de perguntas
  - Roles adequados (article, complementary)
- **Skip links:** "Pular para conteúdo" e "Pular para chat"
- **Imagens:** Alt text descritivo em todas imagens
- **Zoom:** Suporte até 200% sem quebrar layout


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->