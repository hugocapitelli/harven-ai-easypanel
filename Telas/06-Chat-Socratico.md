# 06 - Chat Socrático (Standalone)

**Prioridade:** P1 (Sprint 2)
**Persona:** STUDENT
**Funcionalidade:** Interface dedicada para chat socrático com histórico de conversas

---

## Prompt para Google Stitch

```
Crie um design de interface de chat educacional estilo mensageiro com método socrático usando a seguinte paleta de cores:
- Preto (#000000) para texto principal
- Verde Escuro (#1c2d1b) para sidebar e topbar
- Verde Neon (#d2ff00) para botões primários e destaques
- Cinza Claro (#f5f5f0) para fundo principal
- Dourado (#c0ac6f) para acentos secundários

Layout:
- Sidebar esquerda 256px (já definida no 00-Layout-Components)
- Topbar superior 64px (já definida no 00-Layout-Components)
- Área principal dividida em 2 colunas:
  - Coluna esquerda (320px): Lista de conversas anteriores
  - Coluna direita (restante): Área de chat ativa

Coluna esquerda (Histórico):
1. Header com título "Conversas"
2. Botão "Nova Conversa" (Verde Neon #d2ff00)
3. Lista de conversas anteriores:
   - Data agrupada
   - Título do capítulo
   - Última mensagem preview
   - Badge com número de perguntas usadas

Coluna direita (Chat Ativo):
1. Header da conversa:
   - Título do capítulo
   - Badge de perguntas disponíveis (X/3)
   - Menu de opções (•••)

2. Área de mensagens:
   - Mensagens da IA (cinza claro)
   - Mensagens do usuário (verde neon translúcido)
   - Timestamp em cada mensagem
   - Scroll automático

3. Input área (fixed bottom):
   - Textarea expansível
   - Botão "Enviar" (Verde Neon #d2ff00)
   - Contador de perguntas restantes

Estilo:
- Layout tipo WhatsApp/Telegram
- Mensagens com bordas arredondadas
- Espaçamento confortável
- Design limpo e moderno
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Voltar] Chat Socrático                          [🔔] [🌓] [Avatar ▼]           │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬───────────────────────────────┬────────────────────────────────────────┐
│          │ HISTÓRICO DE CONVERSAS        │ CHAT ATIVO                             │
│ SIDEBAR  │ Width 320px, Border-right 1px │ Flex-grow                              │
│ (#1c2d1b)│ Background #ffffff            │ Background #f5f5f0                     │
│ 256px    │                               │                                        │
│          │ ┌───────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ [🏠 Início│ │ HEADER (padding 20px)     │ │ │ CHAT HEADER                        │ │
│          │ │ H2: "Conversas"           │ │ │ Padding 20px, Border-bottom 1px    │ │
│ [📚 Cursos│ │                           │ │ │ Background #ffffff                 │ │
│          │ │ [+ Nova Conversa]         │ │ │                                    │ │
│ [💬 Chat  │ │ (#d2ff00 button full w)  │ │ │ Cap. 1.2: História do Agro         │ │
│  ATIVO]  │ └───────────────────────────┘ │ │ (#000000, 18px bold)               │ │
│          │                               │ │                                    │ │
│ [📖 Hist. │ ┌───────────────────────────┐ │ │ [💬 2/3] (#d2ff00 badge)          │ │
│          │ │ HOJE                      │ │ │ perguntas restantes                │ │
│ [👤 Perfil│ │ (#666, 12px, uppercase)   │ │ │                           [•••]   │ │
│          │ └───────────────────────────┘ │ └────────────────────────────────────┘ │
│          │                               │                                        │
│          │ ┌───────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ [🚪 Sair] │ │ [Item Conversa ATIVO]    │ │ │ ÁREA DE MENSAGENS                  │ │
│          │ │ Border-left #d2ff00 4px   │ │ │ Padding 24px                       │ │
│          │ │ Background #f5f5f0        │ │ │ Overflow-y auto                    │ │
│          │ │                           │ │ │ Height calc(100vh - 280px)         │ │
│          │ │ Cap. 1.2: História do Agro│ │ │                                    │ │
│          │ │ (#000, 14px bold)         │ │ │ ┌────────────────────────────────┐ │ │
│          │ │                           │ │ │ │ [Mensagem IA] (align-left)     │ │ │
│          │ │ "Qual foi o impacto..."   │ │ │ │ Max-width 70%                  │ │ │
│          │ │ (#666, 13px, truncate)    │ │ │ │ Background #ffffff             │ │ │
│          │ │                           │ │ │ │ Padding 12px 16px              │ │ │
│          │ │ [2/3] perguntas           │ │ │ │ Border-radius 12px             │ │ │
│          │ │ (#d2ff00 badge small)     │ │ │ │ Border-left #c0ac6f 4px        │ │ │
│          │ │                           │ │ │ │                                │ │ │
│          │ │ 14:35                     │ │ │ │ Olá! Estou aqui para ajudá-lo  │ │ │
│          │ └───────────────────────────┘ │ │ │ a refletir sobre o conteúdo    │ │ │
│          │                               │ │ │ do capítulo...                 │ │ │
│          │ ┌───────────────────────────┐ │ │ │                                │ │ │
│          │ │ [Item Conversa]           │ │ │ │ 14:30                          │ │ │
│          │ │                           │ │ │ └────────────────────────────────┘ │ │
│          │ │ Cap. 1.1: O que é Agro?   │ │ │                                    │ │
│          │ │ "Pensei que entendi..."   │ │ │ ┌────────────────────────────────┐ │ │
│          │ │ [3/3] • 13:22             │ │ │ │ [Mensagem User] (align-right)  │ │ │
│          │ └───────────────────────────┘ │ │ │ │ Max-width 70%                  │ │ │
│          │                               │ │ │ │ Background rgba(210,255,0,0.2) │ │ │
│          │ ┌───────────────────────────┐ │ │ │ │ Padding 12px 16px              │ │ │
│          │ │ ONTEM                     │ │ │ │ Border-radius 12px             │ │ │
│          │ └───────────────────────────┘ │ │ │ │ Border-left #d2ff00 4px        │ │ │
│          │                               │ │ │ │                                │ │ │
│          │ ┌───────────────────────────┐ │ │ │ │ Qual foi o impacto da          │ │ │
│          │ │ [Item Conversa]           │ │ │ │ colonização na agricultura?    │ │ │
│          │ │ Cap. 1.3: Cadeia Produtiva│ │ │ │                                │ │ │
│          │ │ "Como funcionam as..."    │ │ │ │ 14:32                          │ │ │
│          │ │ [1/3] • Ontem 16:45       │ │ │ └────────────────────────────────┘ │ │
│          │ └───────────────────────────┘ │ │ │                                    │ │
│          │                               │ │ │ ┌────────────────────────────────┐ │ │
│          │ [... mais conversas ...]      │ │ │ │ [Mensagem IA]                  │ │ │
│          │                               │ │ │ │ Ótima pergunta! Em vez de      │ │ │
│          │ [Scroll vertical]             │ │ │ │ responder diretamente,         │ │ │
│          │                               │ │ │ │ reflita: o que você leu no     │ │ │
│          │                               │ │ │ │ texto sobre esse período?      │ │ │
│          │                               │ │ │ │                                │ │ │
│          │                               │ │ │ │ 14:33                          │ │ │
│          │                               │ │ │ └────────────────────────────────┘ │ │
│          │                               │ │ │                                    │ │
│          │                               │ │ │ [Espaço para mais mensagens]       │ │
│          │                               │ │ └────────────────────────────────────┘ │
│          │                               │                                        │
│          │                               │ ┌────────────────────────────────────┐ │
│          │                               │ │ INPUT ÁREA (fixed bottom)          │ │
│          │                               │ │ Padding 20px                       │ │
│          │                               │ │ Background #ffffff                 │ │
│          │                               │ │ Border-top 1px #e0e0e0             │ │
│          │                               │ │                                    │ │
│          │                               │ │ ┌────────────────────────────────┐ │ │
│          │                               │ │ │ Digite sua pergunta aqui...    │ │ │
│          │                               │ │ │ (textarea, auto-expand)        │ │ │
│          │                               │ │ │ Border 2px #e0e0e0             │ │ │
│          │                               │ │ │ Focus: border #d2ff00          │ │ │
│          │                               │ │ └────────────────────────────────┘ │ │
│          │                               │ │                                    │ │
│          │                               │ │ [Enviar Pergunta ▶]               │ │
│          │                               │ │ (#d2ff00 button, height 44px)     │ │
│          │                               │ │                                    │ │
│          │                               │ │ Você tem 2 perguntas restantes     │ │
│          │                               │ │ (#666, 12px, center)               │ │
│          │                               │ └────────────────────────────────────┘ │
└──────────┴───────────────────────────────┴────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
VISÃO LISTA (default):
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [☰] Conversas        [+] [🔔] [Avtr│
└─────────────────────────────────────┘
│ LISTA DE CONVERSAS                  │
│ Padding 16px, Background #f5f5f0    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Nova Conversa +]               │ │
│ │ (#d2ff00, full width, 48px)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ HOJE (#666, 12px, padding 8px 0)    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Item - ATIVO]                  │ │
│ │ Border-left #d2ff00 4px         │ │
│ │ Background #ffffff              │ │
│ │ Padding 16px                    │ │
│ │                                 │ │
│ │ Cap. 1.2: História do Agro      │ │
│ │ (#000, 16px, bold)              │ │
│ │                                 │ │
│ │ "Qual foi o impacto da..."      │ │
│ │ (#666, 14px, truncate)          │ │
│ │                                 │ │
│ │ [2/3] 💬 • 14:35                │ │
│ │ (#d2ff00 badge, #666 time)      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Item]                          │ │
│ │ Cap. 1.1: O que é Agro?         │ │
│ │ "Pensei que entendi..."         │ │
│ │ [3/3] 💬 • 13:22                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ONTEM                               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Item]                          │ │
│ │ Cap. 1.3: Cadeia Produtiva      │ │
│ │ "Como funcionam as..."          │ │
│ │ [1/3] 💬 • Ontem 16:45          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘

VISÃO CHAT (ao clicar em item):
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Cap. 1.2: História  [2/3] [•••]│
└─────────────────────────────────────┘
│ MENSAGENS - Background #f5f5f0      │
│ Padding 16px                        │
│ Height calc(100vh - 180px)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Mensagem IA]                   │ │
│ │ Background #ffffff              │ │
│ │ Padding 12px                    │ │
│ │ Border-radius 12px 12px 12px 0  │ │
│ │ Border-left #c0ac6f 4px         │ │
│ │ Max-width 85%                   │ │
│ │                                 │ │
│ │ Olá! Estou aqui para ajudá-lo   │ │
│ │ a refletir sobre o conteúdo...  │ │
│ │                                 │ │
│ │ 14:30                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│              ┌────────────────────┐ │
│              │ [Mensagem User]    │ │
│              │ Bg rgba(210,255,0,.2│ │
│              │ Padding 12px       │ │
│              │ Radius 12px 12px 0│ │
│              │ Max-width 85%      │ │
│              │                    │ │
│              │ Qual foi o impacto │ │
│              │ da colonização?    │ │
│              │                    │ │
│              │ 14:32              │ │
│              └────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Mensagem IA]                   │ │
│ │ Ótima pergunta! Reflita sobre   │ │
│ │ o que você leu no texto...      │ │
│ │ 14:33                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
│                                     │
├─────────────────────────────────────┤
│ INPUT ÁREA (fixed)                  │
│ Background #ffffff, Padding 12px    │
│ Border-top 1px #e0e0e0              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Digite sua pergunta...          │ │
│ │ (textarea auto-expand)          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Enviar ▶] (#d2ff00, full width)   │
│                                     │
│ 2 perguntas restantes (#666, 11px)  │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Histórico de Conversas
- **Background:** #ffffff
- **Header:** #000000
- **Botão "Nova Conversa":** Background #d2ff00, texto #000000
- **Separador de data:** #666666
- **Item de conversa:**
  - Background: #ffffff
  - Hover: #f9f9f9
  - Ativo: Border-left #d2ff00 4px, background #f5f5f0
- **Título do capítulo:** #000000
- **Preview da mensagem:** #666666
- **Badge de perguntas:** Background #d2ff00, texto #000000
- **Timestamp:** #999999

### Área de Chat
- **Background:** #f5f5f0
- **Header:**
  - Background: #ffffff
  - Título: #000000
  - Badge: #d2ff00 com texto #000000
- **Mensagem IA:**
  - Background: #ffffff
  - Border-left: #c0ac6f 4px
  - Texto: #333333
  - Timestamp: #999999
- **Mensagem Usuário:**
  - Background: rgba(210,255,0,0.2)
  - Border-left: #d2ff00 4px
  - Texto: #000000
  - Timestamp: #999999

### Input Área
- **Background:** #ffffff
- **Textarea:**
  - Border: 2px solid #e0e0e0
  - Focus: Border #d2ff00
  - Texto: #000000
- **Botão "Enviar":** Background #d2ff00, texto #000000
- **Contador:** #666666

---

## Componentes e Especificações

### Lista de Conversas (Sidebar)
**Dimensões Desktop:**
- Width: 320px
- Height: calc(100vh - 64px)
- Background: #ffffff
- Border-right: 1px solid #e0e0e0

**Header:**
- Padding: 20px
- Border-bottom: 1px solid #e0e0e0

**Botão "Nova Conversa":**
- Width: 100%
- Height: 44px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Margin-bottom: 16px

**Separador de Data:**
- Font-size: 12px
- Font-weight: 700
- Text-transform: uppercase
- Color: #666666
- Padding: 12px 16px
- Background: #f5f5f0
- Letter-spacing: 0.5px

**Item de Conversa:**
- Padding: 16px
- Border-bottom: 1px solid #f0f0f0
- Cursor: pointer
- Transition: all 0.2s ease

**Título do Capítulo (no item):**
- Font-size: 14px
- Font-weight: 700
- Color: #000000
- Margin-bottom: 4px
- Line-height: 1.4

**Preview da Mensagem:**
- Font-size: 13px
- Color: #666666
- White-space: nowrap
- Overflow: hidden
- Text-overflow: ellipsis
- Margin-bottom: 8px

**Meta Info (badge + timestamp):**
- Display: flex
- Align-items: center
- Gap: 8px
- Font-size: 12px

**Badge de Perguntas:**
- Background: #d2ff00
- Color: #000000
- Padding: 2px 8px
- Border-radius: 10px
- Font-size: 11px
- Font-weight: 600

**Timestamp:**
- Color: #999999
- Font-size: 12px

### Header do Chat Ativo
**Dimensões:**
- Width: 100%
- Height: 64px
- Padding: 0 24px
- Background: #ffffff
- Border-bottom: 1px solid #e0e0e0
- Display: flex
- Justify-content: space-between
- Align-items: center

**Título:**
- Font-size: 18px
- Font-weight: 700
- Color: #000000

**Badge de Perguntas:**
- Background: #d2ff00
- Color: #000000
- Padding: 6px 12px
- Border-radius: 12px
- Font-size: 14px
- Font-weight: 600
- Icon: 💬

**Menu de Opções (•••):**
- Font-size: 24px
- Color: #666666
- Cursor: pointer

### Área de Mensagens
**Dimensões:**
- Height: calc(100vh - 280px)
- Overflow-y: auto
- Padding: 24px
- Background: #f5f5f0

**Mensagem (comum):**
- Margin-bottom: 16px
- Display: flex
- Flex-direction: column
- Animation: fadeIn 0.3s ease

**Mensagem IA:**
- Align-self: flex-start
- Max-width: 70%
- Background: #ffffff
- Padding: 12px 16px
- Border-radius: 12px 12px 12px 4px
- Border-left: 4px solid #c0ac6f
- Box-shadow: 0 2px 4px rgba(0,0,0,0.06)

**Mensagem Usuário:**
- Align-self: flex-end
- Max-width: 70%
- Background: rgba(210,255,0,0.2)
- Padding: 12px 16px
- Border-radius: 12px 12px 4px 12px
- Border-left: 4px solid #d2ff00

**Texto da Mensagem:**
- Font-size: 15px
- Line-height: 1.5
- Color: #333333 (IA) / #000000 (User)
- Word-wrap: break-word

**Timestamp:**
- Font-size: 11px
- Color: #999999
- Margin-top: 4px
- Align-self: flex-end

### Input Área
**Dimensões:**
- Width: 100%
- Padding: 20px
- Background: #ffffff
- Border-top: 1px solid #e0e0e0
- Position: sticky / fixed bottom

**Textarea:**
- Width: 100%
- Min-height: 44px
- Max-height: 120px
- Padding: 12px
- Border: 2px solid #e0e0e0
- Border-radius: 8px
- Font-size: 14px
- Line-height: 1.5
- Resize: none
- Overflow-y: auto

**Botão "Enviar Pergunta":**
- Width: 100%
- Height: 44px
- Background: #d2ff00
- Color: #000000
- Font-size: 16px
- Font-weight: 600
- Border: none
- Border-radius: 8px
- Margin-top: 12px
- Cursor: pointer

**Contador de Perguntas:**
- Font-size: 12px
- Color: #666666
- Text-align: center
- Margin-top: 8px

---

## Estados Interativos

### Item de Conversa Hover
- Background: #f9f9f9
- Border-left: 4px solid #e0e0e0

### Item de Conversa Ativo
- Background: #f5f5f0
- Border-left: 4px solid #d2ff00
- Font-weight: 700 (título)

### Botão "Nova Conversa" Hover
- Background: #b8e600
- Transform: translateY(-1px)
- Box-shadow: 0 4px 8px rgba(210,255,0,0.3)

### Textarea Focus
- Border-color: #d2ff00
- Outline: none
- Box-shadow: 0 0 0 3px rgba(210,255,0,0.1)

### Botão "Enviar" Hover
- Background: #b8e600
- Transform: translateY(-1px)

### Botão "Enviar" Disabled (0 perguntas)
- Background: #e0e0e0
- Color: #999999
- Cursor: not-allowed
- Opacity: 0.6

### Menu de Opções Hover
- Color: #000000

### Mensagem Animação (ao aparecer)
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Comportamento Responsivo

### Desktop (>1200px)
- Layout 2 colunas (320px fixed + flex-grow)
- Histórico sempre visível
- Chat ocupando espaço restante

### Tablet (768px - 1199px)
- Histórico como drawer lateral (280px)
- Botão para abrir/fechar histórico
- Chat em full width quando histórico fechado

### Mobile (<768px)
- 2 views separadas: Lista e Chat
- Navegação entre views com botão "Voltar"
- Lista full screen
- Chat full screen
- Input fixed bottom

---

## Casos Especiais

### Nenhuma Conversa Iniciada
```
┌─────────────────────────────────┐
│ [Ícone 💬 grande, cinza claro]  │
│                                 │
│ Nenhuma conversa iniciada       │
│                                 │
│ Comece uma nova conversa para   │
│ tirar dúvidas sobre o conteúdo  │
│                                 │
│ [+ Nova Conversa]               │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Perguntas Esgotadas (0/3)
- Badge muda para "0/3" com background #cccccc
- Textarea desabilitada (opacity 0.5)
- Botão "Enviar" desabilitado
- Mensagem abaixo do input:
  ```
  Você usou todas as 3 perguntas deste capítulo.
  [Ir para próximo capítulo →]
  ```

### Mensagem Sendo Enviada (Loading)
- Botão "Enviar" com spinner
- Texto muda para "Enviando..."
- Input desabilitado temporariamente
- Mensagem provisória com opacity 0.6 aparece

### IA Digitando (Typing Indicator)
```
┌─────────────────────────────────┐
│ [Mensagem IA placeholder]       │
│ Background #ffffff              │
│                                 │
│ ● ● ● (animação pulsante)      │
│                                 │
└─────────────────────────────────┘
```

### Menu de Opções (•••) Dropdown
```
┌─────────────────────────┐
│ Exportar Conversa       │
│ Limpar Histórico        │
│ Voltar ao Capítulo      │
└─────────────────────────┘
```

### Conversa Arquivada
- Item com opacity 0.6
- Badge "Arquivado" cinza
- Sem possibilidade de enviar novas mensagens

### Nova Conversa Dialog
```
┌─────────────────────────────────┐
│ Iniciar Nova Conversa           │
├─────────────────────────────────┤
│ Selecione um capítulo:          │
│                                 │
│ [Dropdown de Cursos]            │
│ [Dropdown de Módulos]           │
│ [Dropdown de Capítulos]         │
│                                 │
│ [Cancelar] [Iniciar] (#d2ff00)  │
└─────────────────────────────────┘
```

---

## Acessibilidade

- **ARIA labels** em todos botões e inputs
- **Role="log"** na área de mensagens para screen readers
- **Live region** para anunciar novas mensagens
- **Keyboard navigation:**
  - Tab para navegar entre conversas
  - Enter para abrir conversa
  - Esc para voltar à lista (mobile)
  - Ctrl+Enter para enviar mensagem
- **Focus visible:** Outline #d2ff00 3px
- **Screen reader:**
  - Anunciar número de perguntas restantes
  - Anunciar novas mensagens
  - Anunciar estado de digitação da IA
- **Contraste WCAG AA** em todos os textos
- **Touch targets:** Mínimo 44x44px (mobile)
- **Scroll to bottom** automático ao receber nova mensagem
- **Skip link** para pular histórico e ir direto ao chat


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->