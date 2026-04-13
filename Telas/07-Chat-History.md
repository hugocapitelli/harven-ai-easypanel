# 07 - Chat History (Histórico de Conversas)

**Prioridade:** P1 (Sprint 2)
**Persona:** STUDENT
**Funcionalidade:** Visualizar histórico completo de conversas socráticas com filtros e busca

---

## Prompt para Google Stitch

```
Crie um design de página de histórico de conversas educacionais com filtros e busca usando a seguinte paleta de cores:
- Preto (#000000) para texto principal
- Verde Escuro (#1c2d1b) para sidebar e topbar
- Verde Neon (#d2ff00) para botões primários e destaques
- Cinza Claro (#f5f5f0) para fundo principal
- Dourado (#c0ac6f) para acentos secundários

Layout:
- Sidebar esquerda 256px (já definida no 00-Layout-Components)
- Topbar superior 64px (já definida no 00-Layout-Components)
- Área principal com fundo Cinza Claro (#f5f5f0)

Conteúdo da área principal:
1. Header com:
   - Título "Histórico de Conversas"
   - Barra de busca
   - Filtros (Curso, Data, Status)

2. Estatísticas rápidas (cards):
   - Total de conversas
   - Perguntas feitas
   - Capítulos explorados
   - Média de perguntas por capítulo

3. Lista de conversas:
   - Agrupadas por data ou curso
   - Card de conversa com:
     - Título do capítulo
     - Data e hora
     - Número de perguntas (X/3)
     - Preview da conversa
     - Botão "Ver Completa"
     - Botão "Exportar"

4. Paginação no final

Estilo:
- Cards com sombra suave
- Grid responsivo
- Badges coloridos para status
- Design clean e organizado
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Dashboard] Histórico de Conversas              [🔔] [🌓] [Avatar ▼]            │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ ÁREA PRINCIPAL - Fundo #f5f5f0 - Padding 32px                          │
│ SIDEBAR  │                                                                          │
│ (#1c2d1b)│ ┌────────────────────────────────────────────────────────────────────┐ │
│ 256px    │ │ HEADER - Margin-bottom 24px                                        │ │
│          │ │                                                                    │ │
│ [🏠 Início│ │ H1: "Histórico de Conversas" (#000000, 32px bold)                 │ │
│          │ │                                                                    │ │
│ [📚 Cursos│ │ ┌────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ BARRA DE BUSCA E FILTROS - Flex, gap 16px                  │   │ │
│ [💬 Chat  │ │ │                                                            │   │ │
│          │ │ │ [🔍 Buscar conversas...] (flex-grow, height 48px)         │   │ │
│ [📖 Hist. │ │ │ [Curso ▼] [Data ▼] [Status ▼] (dropdowns 160px each)     │   │ │
│  ATIVO]  │ │ └────────────────────────────────────────────────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│ [👤 Perfil│                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ CARDS DE ESTATÍSTICAS - Grid 4 colunas, gap 24px                  │ │
│ [🚪 Sair] │ │                                                                    │ │
│          │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │ │
│          │ │ │ Card Stats 1 │ │ Card Stats 2 │ │ Card Stats 3 │ │Card Stats 4│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 24           │ │ 68           │ │ 15           │ │ 2.8        │ │ │
│          │ │ │ (#000, 36px) │ │ (#000, 36px) │ │ (#000, 36px) │ │(#000, 36px)│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ Conversas    │ │ Perguntas    │ │ Capítulos    │ │ Média de   │ │ │
│          │ │ │ Totais       │ │ Feitas       │ │ Explorados   │ │ Perguntas  │ │ │
│          │ │ │ (#666, 14px) │ │ (#666, 14px) │ │ (#666, 14px) │ │(#666, 14px)│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 💬           │ │ ✓            │ │ 📚           │ │ 📊         │ │ │
│          │ │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)  │ │ │
│          │ │ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ LISTA DE CONVERSAS - Margin-top 32px                               │ │
│          │ │                                                                    │ │
│          │ │ [HOJE] (#666, 12px uppercase, padding 8px 0, border-bottom 2px)    │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ CARD DE CONVERSA - #ffffff, padding 24px, margin-bottom 16px│   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ HEADER DO CARD - Flex justify-between                  │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ [📚 Agronegócio] Cap. 1.2: História do Agro no Brasil │   │   │ │
│          │ │ │ │ (#000, 18px bold)                                      │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │                               [2/3] (#d2ff00 badge)   │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ 📅 Hoje • 14:35                     👤 Prof. João Silva     │   │ │
│          │ │ │ (#666, 14px)                                                 │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ PREVIEW DA CONVERSA - Background #f9f9f9, padding 16px│   │   │ │
│          │ │ │ │ Border-left #c0ac6f 4px, border-radius 4px            │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ Você: "Qual foi o impacto da colonização na            │   │   │ │
│          │ │ │ │        agricultura brasileira?"                        │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ IA: "Ótima pergunta! Em vez de responder..."           │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ [... 4 mensagens adicionais]                           │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ [Ver Completa] [Exportar PDF] [Arquivar]                    │   │ │
│          │ │ │ (buttons: outline #d2ff00, height 36px, padding 8px 16px)   │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ [CARD DE CONVERSA 2]                                         │   │ │
│          │ │ │ Cap. 1.1: O que é Agronegócio?  [3/3]                       │   │ │
│          │ │ │ Hoje • 13:22                                                │   │ │
│          │ │ │ [Preview...]                                                 │   │ │
│          │ │ │ [Botões de ação]                                             │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │                                                                    │ │
│          │ │ [ONTEM] (#666, separador de data)                                  │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ [CARD DE CONVERSA 3]                                         │   │ │
│          │ │ │ Cap. 1.3: Cadeia Produtiva  [1/3]                           │   │ │
│          │ │ │ Ontem • 16:45                                                │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │                                                                    │ │
│          │ │ [... mais conversas ...]                                           │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ PAGINAÇÃO - Center, margin-top 32px                                │ │
│          │ │                                                                    │ │
│          │ │ [← Anterior] [1] [2] [3] ... [10] [Próxima →]                     │ │
│          │ │ (ativo: background #d2ff00, outline: border #d2ff00)               │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Histórico          [🔔] [Avatar]│
└─────────────────────────────────────┘
│ CONTEÚDO - Padding 16px             │
│ Background #f5f5f0                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ H1: "Histórico"                 │ │
│ │ (#000, 24px, bold)              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ BUSCA E FILTROS                 │ │
│ │                                 │ │
│ │ [🔍 Buscar conversas...]        │ │
│ │ (input, full width, 44px)       │ │
│ │                                 │ │
│ │ [Filtros ▼] (accordion)         │ │
│ │ (#d2ff00 outline, 40px)         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ STATS - Grid 2x2, gap 12px      │ │
│ │                                 │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 24      │ │ 68      │         │ │
│ │ │Conversas│ │Perguntas│         │ │
│ │ │ 💬      │ │ ✓       │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 15      │ │ 2.8     │         │ │
│ │ │Capítulos│ │ Média   │         │ │
│ │ │ 📚      │ │ 📊      │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ HOJE (#666, 12px, padding 8px 0)    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CARD CONVERSA (#fff)            │ │
│ │ Padding 16px                    │ │
│ │                                 │ │
│ │ [📚] Cap. 1.2: História...      │ │
│ │      (#000, 16px bold)     [2/3]│ │
│ │                                 │ │
│ │ 📅 Hoje 14:35                   │ │
│ │ 👤 Prof. João Silva             │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ PREVIEW (#f9f9f9)           │ │ │
│ │ │ Padding 12px                │ │ │
│ │ │                             │ │ │
│ │ │ Você: "Qual foi o impacto..." │ │
│ │ │ IA: "Ótima pergunta! ..."   │ │ │
│ │ │                             │ │ │
│ │ │ [+ 4 mensagens]             │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ [Ver Completa] [⋯ Mais]         │ │
│ │ (buttons, height 36px)          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CARD CONVERSA 2                 │ │
│ │ Cap. 1.1: O que é Agro?   [3/3] │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ONTEM                               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CARD CONVERSA 3                 │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ PAGINAÇÃO                       │ │
│ │ [←] [1][2][3]...[10] [→]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Header e Busca
- **Título:** #000000
- **Input de busca:**
  - Border: 2px solid #e0e0e0
  - Focus: Border #d2ff00
  - Background: #ffffff
  - Placeholder: #999999
- **Dropdowns de filtro:**
  - Border: 2px solid #e0e0e0
  - Background: #ffffff
  - Icon dropdown: #666666

### Cards de Estatísticas
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Número:** #000000
- **Label:** #666666
- **Ícone:** #d2ff00

### Separador de Data
- **Texto:** #666666
- **Border-bottom:** 2px solid #e0e0e0

### Card de Conversa
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Título do capítulo:** #000000
- **Badge de perguntas:** Background #d2ff00, texto #000000
- **Meta informações:** #666666
- **Preview:**
  - Background: #f9f9f9
  - Border-left: 4px solid #c0ac6f
  - Texto: #333333
- **Botões:**
  - "Ver Completa": Background #d2ff00, texto #000000
  - "Exportar PDF": Outline #d2ff00 2px, texto #000000
  - "Arquivar": Outline #cccccc 2px, texto #666666

### Paginação
- **Botões inativos:** Border #e0e0e0, texto #666666
- **Botão ativo:** Background #d2ff00, texto #000000
- **Hover:** Border #d2ff00, texto #000000

---

## Componentes e Especificações

### Barra de Busca e Filtros
**Dimensões Desktop:**
- Display: flex
- Gap: 16px
- Margin-bottom: 32px

**Input de Busca:**
- Flex-grow: 1
- Height: 48px
- Padding: 0 16px 0 44px (espaço para ícone)
- Border: 2px solid #e0e0e0
- Border-radius: 8px
- Font-size: 16px

**Ícone de Busca:**
- Position: absolute
- Left: 16px
- Color: #999999
- Font-size: 20px

**Dropdowns de Filtro:**
- Width: 160px cada
- Height: 48px
- Padding: 0 16px
- Border: 2px solid #e0e0e0
- Border-radius: 8px
- Background: #ffffff
- Font-size: 14px

### Cards de Estatísticas
**Dimensões:**
- Display: grid
- Grid-template-columns: repeat(4, 1fr) (desktop), repeat(2, 1fr) (mobile)
- Gap: 24px (desktop), 12px (mobile)
- Margin-bottom: 32px

**Card Individual:**
- Background: #ffffff
- Padding: 24px
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Text-align: center

**Número:**
- Font-size: 36px (desktop), 28px (mobile)
- Font-weight: 700
- Color: #000000
- Margin-bottom: 8px

**Label:**
- Font-size: 14px
- Color: #666666
- Line-height: 1.4

**Ícone:**
- Font-size: 24px
- Color: #d2ff00
- Margin-top: 12px

### Separador de Data
**Dimensões:**
- Padding: 8px 0
- Border-bottom: 2px solid #e0e0e0
- Margin: 24px 0 16px

**Texto:**
- Font-size: 12px
- Font-weight: 700
- Text-transform: uppercase
- Color: #666666
- Letter-spacing: 0.5px

### Card de Conversa
**Dimensões:**
- Background: #ffffff
- Padding: 24px (desktop), 16px (mobile)
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Margin-bottom: 16px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.04)

**Header do Card:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-bottom: 12px

**Título do Capítulo:**
- Font-size: 18px (desktop), 16px (mobile)
- Font-weight: 700
- Color: #000000
- Line-height: 1.4

**Ícone de Curso:**
- Margin-right: 8px
- Font-size: 18px

**Badge de Perguntas:**
- Background: #d2ff00
- Color: #000000
- Padding: 4px 12px
- Border-radius: 12px
- Font-size: 14px
- Font-weight: 600

**Meta Informações:**
- Display: flex
- Gap: 16px
- Font-size: 14px
- Color: #666666
- Margin-bottom: 16px

**Preview da Conversa:**
- Background: #f9f9f9
- Padding: 16px (desktop), 12px (mobile)
- Border-left: 4px solid #c0ac6f
- Border-radius: 4px
- Margin-bottom: 16px
- Max-height: 150px
- Overflow: hidden

**Texto do Preview:**
- Font-size: 14px
- Line-height: 1.6
- Color: #333333

**"Você:" / "IA:"**
- Font-weight: 600
- Margin-bottom: 4px

**Botões de Ação:**
- Display: flex
- Gap: 12px
- Flex-wrap: wrap

**Botão "Ver Completa":**
- Height: 36px
- Padding: 0 16px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border: none
- Border-radius: 6px

**Botão "Exportar PDF":**
- Height: 36px
- Padding: 0 16px
- Background: transparent
- Border: 2px solid #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 6px

**Botão "Arquivar":**
- Height: 36px
- Padding: 0 16px
- Background: transparent
- Border: 2px solid #cccccc
- Color: #666666
- Font-weight: 600
- Border-radius: 6px

### Paginação
**Dimensões:**
- Display: flex
- Justify-content: center
- Gap: 8px
- Margin-top: 32px
- Padding: 24px 0

**Botão de Página:**
- Width: 40px
- Height: 40px
- Border: 2px solid #e0e0e0
- Border-radius: 6px
- Background: #ffffff
- Color: #666666
- Font-weight: 600
- Cursor: pointer

**Botão Ativo:**
- Background: #d2ff00
- Border-color: #d2ff00
- Color: #000000

**Botões "Anterior/Próxima":**
- Width: auto
- Padding: 0 16px
- Height: 40px

---

## Estados Interativos

### Input de Busca Focus
- Border-color: #d2ff00
- Box-shadow: 0 0 0 3px rgba(210,255,0,0.1)

### Dropdown Hover
- Border-color: #d2ff00

### Card de Estatísticas Hover
- Transform: translateY(-2px)
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

### Card de Conversa Hover
- Border-color: #d2ff00
- Box-shadow: 0 4px 12px rgba(210,255,0,0.1)

### Botão "Ver Completa" Hover
- Background: #b8e600
- Transform: translateY(-1px)

### Botão "Exportar" Hover
- Background: rgba(210,255,0,0.1)

### Botão "Arquivar" Hover
- Border-color: #999999
- Color: #000000

### Paginação Botão Hover
- Border-color: #d2ff00
- Color: #000000

---

## Comportamento Responsivo

### Desktop (>1200px)
- Grid de stats 4 colunas
- Cards de conversa max-width 1200px
- Busca e filtros em linha horizontal
- Preview completo (150px altura)

### Tablet (768px - 1199px)
- Grid de stats 2 colunas
- Cards de conversa full width
- Filtros mantêm layout horizontal
- Preview reduzido (120px altura)

### Mobile (<768px)
- Grid de stats 2x2
- Busca full width
- Filtros em accordion colapsável
- Cards de conversa full width
- Preview reduzido (100px altura)
- Botões de ação em 2 linhas se necessário

---

## Casos Especiais

### Nenhuma Conversa Encontrada
```
┌─────────────────────────────────┐
│ [Ícone 🔍 grande, cinza claro]  │
│                                 │
│ Nenhuma conversa encontrada     │
│                                 │
│ Tente ajustar os filtros ou     │
│ iniciar uma nova conversa       │
│                                 │
│ [+ Nova Conversa]               │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Histórico Vazio
```
┌─────────────────────────────────┐
│ [Ícone 💬 grande, cinza claro]  │
│                                 │
│ Seu histórico está vazio        │
│                                 │
│ Comece a explorar os cursos e   │
│ fazer perguntas para ver suas   │
│ conversas aqui                  │
│                                 │
│ [Explorar Cursos]               │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Conversa Arquivada
- Card com opacity 0.7
- Badge "Arquivada" cinza
- Botão "Restaurar" ao invés de "Arquivar"

### Filtros Aplicados (Indicador)
```
Filtros ativos: [Curso: Agronegócio ×] [Data: Esta semana ×]
[Limpar todos]
```

### Dropdown de Filtros (Expandido)
```
┌─────────────────────────────┐
│ Filtrar por Curso           │
├─────────────────────────────┤
│ ☑ Introdução ao Agronegócio │
│ ☐ Sustentabilidade Rural    │
│ ☐ Marketing Digital         │
├─────────────────────────────┤
│ [Aplicar] [Limpar]          │
└─────────────────────────────┘
```

### Modal "Ver Completa" (ao clicar)
```
┌─────────────────────────────────────┐
│ [×] Cap. 1.2: História do Agro      │
│     Hoje • 14:35                    │
├─────────────────────────────────────┤
│ [Área de mensagens completa]        │
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
│ [... todas as mensagens ...]        │
│                                     │
├─────────────────────────────────────┤
│ [Exportar PDF] [Fechar]             │
└─────────────────────────────────────┘
```

### Exportar PDF (Confirmação)
```
┌─────────────────────────────────┐
│ Exportar Conversa               │
├─────────────────────────────────┤
│ Deseja exportar esta conversa   │
│ em formato PDF?                 │
│                                 │
│ Incluir:                        │
│ ☑ Timestamp das mensagens       │
│ ☑ Informações do capítulo       │
│ ☐ Anotações pessoais            │
│                                 │
│ [Cancelar] [Exportar] (#d2ff00) │
└─────────────────────────────────┘
```

### Loading States
- **Busca:** Spinner no ícone de busca
- **Cards:** Skeleton com shimmer effect
- **Stats:** Números com loading animation
- **Paginação:** Disabled durante carregamento

### Ordenação (adicional)
```
Ordenar por: [Mais Recente ▼]
Opções:
- Mais Recente
- Mais Antiga
- Mais Perguntas
- Menos Perguntas
- A-Z (Capítulo)
```

---

## Acessibilidade

- **ARIA labels** em todos inputs e botões
- **Role="search"** na barra de busca
- **Role="region"** nas seções de stats e conversas
- **Keyboard navigation:**
  - Tab para navegar entre filtros e cards
  - Enter para expandir/colapsar filtros
  - Space para selecionar checkboxes
  - Enter para abrir conversa completa
- **Focus visible:** Outline #d2ff00 3px em todos elementos
- **Screen reader:**
  - Anunciar número de resultados após busca/filtro
  - Anunciar estatísticas ao carregar página
  - Anunciar estado de loading
- **Contraste WCAG AA** em todos os textos (mínimo 4.5:1)
- **Skip links:**
  - "Pular para resultados"
  - "Pular para paginação"
- **Labels visíveis** em todos os campos de filtro
- **Botões com text label** (não apenas ícones)
- **Alt text** em ícones decorativos (aria-hidden se apenas visual)
- **Live region** para anunciar mudanças nos filtros/busca


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->