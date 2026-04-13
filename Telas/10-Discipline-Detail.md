# 10 - Discipline Detail (Detalhes da Disciplina)

**Prioridade:** P0 (Sprint 1)
**Persona:** TEACHER
**Funcionalidade:** Visualizar detalhes completos de uma disciplina, seus cursos, alunos e estatísticas

---

## Prompt para Google Stitch

```
Crie um design de página de detalhes de disciplina para professor usando a seguinte paleta de cores:
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
1. Hero section da disciplina:
   - Imagem de capa ou ícone grande
   - Título da disciplina
   - Descrição breve
   - Badge de status (Ativa/Arquivada)
   - Botões de ação (Editar, Arquivar, Adicionar Curso)

2. Cards de estatísticas (4 colunas):
   - Total de Cursos
   - Total de Alunos
   - Progresso Médio
   - Conversas Recentes

3. Tabs de navegação:
   - Cursos (lista de cursos da disciplina)
   - Alunos (lista de alunos matriculados)
   - Atividades (timeline de atividades)
   - Configurações

4. Conteúdo dinâmico baseado na tab ativa

Estilo:
- Hero visual com imagem/cor de fundo
- Cards com sombra suave
- Tabs bem definidas
- Design profissional e organizado
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Disciplinas > Agronegócio]                     [🔔] [🌓] [Avatar ▼]            │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ HERO SECTION - 280px altura, Background #1c2d1b com overlay            │
│ SIDEBAR  │ ┌────────────────────────────────────────────────────────────────────┐ │
│ (#1c2d1b)│ │                                                                    │ │
│ 256px    │ │    [Imagem de capa da disciplina com overlay escuro 60%]          │ │
│          │ │                                                                    │ │
│ [🏠 Início│ │    [Ativa] (#d2ff00 badge, position absolute top-left 32px)       │ │
│          │ │                                                                    │ │
│ [📚 Discip│ │    📚 H1: "Introdução ao Agronegócio" (#ffffff, 42px, bold)       │ │
│  ATIVO]  │ │                                                                    │ │
│          │ │    Compreensão fundamental dos conceitos e práticas do             │ │
│ [📊 Conteú│ │    agronegócio brasileiro (#ffffff opacity 0.9, 16px)             │ │
│          │ │                                                                    │ │
│ [💬 Conver│ │    [Editar] [Arquivar] [+ Adicionar Curso]                        │ │
│          │ │    (buttons: outline #d2ff00, last one filled #d2ff00)             │ │
│ [📄 Relató│ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│ [👤 Perfil│ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ CARDS DE ESTATÍSTICAS - Grid 4 colunas, gap 24px, margin 32px     │ │
│          │ │                                                                    │ │
│ [🚪 Sair] │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │ │
│          │ │ │ Card Stats 1 │ │ Card Stats 2 │ │ Card Stats 3 │ │Card Stats 4│ │ │
│          │ │ │ #ffffff      │ │ #ffffff      │ │ #ffffff      │ │ #ffffff    │ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 3            │ │ 89           │ │ 68%          │ │ 12         │ │ │
│          │ │ │ (#000, 36px) │ │ (#000, 36px) │ │ (#000, 36px) │ │(#000, 36px)│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ Cursos       │ │ Alunos       │ │ Progresso    │ │ Conversas  │ │ │
│          │ │ │ Criados      │ │ Matriculados │ │ Médio        │ │ Recentes   │ │ │
│          │ │ │ (#666, 14px) │ │ (#666, 14px) │ │ (#666, 14px) │ │(#666, 14px)│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 📚           │ │ 👥           │ │ 📊           │ │ 💬         │ │ │
│          │ │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)  │ │ │
│          │ │ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ TABS - Border-bottom 2px #e0e0e0, padding 16px horizontal          │ │
│          │ │                                                                    │ │
│          │ │ [Cursos] [Alunos] [Atividades] [Configurações]                    │ │
│          │ │ (Ativo: border-bottom #d2ff00 4px, color #000)                     │ │
│          │ │ (Inativo: color #666)                                              │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ TAB CONTENT - "CURSOS" (ativo) - Padding 32px                      │ │
│          │ │                                                                    │ │
│          │ │ H2: "Cursos da Disciplina" (#000, 24px)   [+ Novo Curso] (#d2ff00)│ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ LISTA DE CURSOS                                              │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ ITEM CURSO - #ffffff, padding 20px, border 1px #e0e0e0│   │   │ │
│          │ │ │ │ Border-radius 8px, margin-bottom 16px                  │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ [📖] Módulo 1: Fundamentos do Agronegócio             │   │   │ │
│          │ │ │ │ (#000, 18px bold)                                      │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ 6 capítulos • 67 alunos matriculados                   │   │   │ │
│          │ │ │ │ (#666, 14px)                                           │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ Progresso Geral: [▓▓▓▓▓░░░░░] 72%                    │   │   │ │
│          │ │ │ │ (#d2ff00 progress bar)                                 │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ 📅 Atualizado há 3 dias       [Gerenciar] [Editar] [•││   │   │ │
│          │ │ │ │ (#999, 13px)                  (action buttons)        │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ ITEM CURSO 2                                           │   │   │ │
│          │ │ │ │ [📖] Módulo 2: Mercado e Economia                      │   │   │ │
│          │ │ │ │ 5 capítulos • 54 alunos • 48% progresso                │   │   │ │
│          │ │ │ │ ...                                                    │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ ITEM CURSO 3                                           │   │   │ │
│          │ │ │ │ [📖] Módulo 3: Sustentabilidade                        │   │   │ │
│          │ │ │ │ ...                                                    │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Agronegócio        [•••] [Avtr] │
└─────────────────────────────────────┘
│ HERO - 220px altura                 │
│ ┌─────────────────────────────────┐ │
│ │ Background #1c2d1b ou imagem    │ │
│ │                                 │ │
│ │ [Ativa] badge                   │ │
│ │                                 │ │
│ │ 📚 Introdução ao                │ │
│ │    Agronegócio                  │ │
│ │ (#ffffff, 24px bold)            │ │
│ │                                 │ │
│ │ Compreensão fundamental...      │ │
│ │ (#ffffff opacity 0.9, 14px)     │ │
│ │                                 │ │
│ │ [Editar] [+ Curso]              │ │
│ │ (buttons outline #d2ff00)       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ STATS - Grid 2x2, gap 12px      │ │
│ │ Padding 16px                    │ │
│ │                                 │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 3       │ │ 89      │         │ │
│ │ │ Cursos  │ │ Alunos  │         │ │
│ │ │ 📚      │ │ 👥      │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 68%     │ │ 12      │         │ │
│ │ │Progresso│ │Conversas│         │ │
│ │ │ 📊      │ │ 💬      │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ TABS (horizontal scroll)        │ │
│ │ [Cursos][Alunos][Atividades]    │ │
│ │ (ativo: border-bottom #d2ff00)  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ TAB CONTENT - Padding 16px          │
│                                     │
│ H2: "Cursos" [+ Novo]               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ITEM CURSO (#fff)               │ │
│ │ Padding 16px                    │ │
│ │                                 │ │
│ │ 📖 Módulo 1: Fundamentos        │ │
│ │    (#000, 16px bold)            │ │
│ │                                 │ │
│ │ 6 capítulos • 67 alunos         │ │
│ │                                 │ │
│ │ [▓▓▓▓▓░░░░░] 72%               │ │
│ │                                 │ │
│ │ Atualizado há 3 dias            │ │
│ │                                 │ │
│ │ [Gerenciar] [•••]               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ITEM CURSO 2                    │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Hero Section
- **Background:** #1c2d1b ou imagem com overlay rgba(28,45,27,0.8)
- **Badge "Ativa":** Background #d2ff00, texto #000000
- **Badge "Arquivada":** Background #cccccc, texto #666666
- **Título:** #ffffff
- **Descrição:** #ffffff com opacity 0.9
- **Botões outline:** Border #d2ff00 2px, texto #ffffff, background transparent
- **Botão "+ Adicionar Curso":** Background #d2ff00, texto #000000

### Cards de Estatísticas
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Número:** #000000
- **Label:** #666666
- **Ícone:** #d2ff00

### Tabs
- **Container:** Border-bottom #e0e0e0 2px
- **Tab inativa:** Color #666666
- **Tab ativa:** Color #000000, border-bottom #d2ff00 4px
- **Hover:** Background rgba(210,255,0,0.05)

### Lista de Cursos
- **Background item:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Título:** #000000
- **Meta info:** #666666
- **Barra de progresso:** Preenchida #d2ff00, vazia #e0e0e0
- **Timestamp:** #999999
- **Botão "Gerenciar":** Background #d2ff00, texto #000000
- **Botão "Editar":** Outline #d2ff00 2px, texto #000000
- **Menu (•••):** #666666

---

## Componentes e Especificações

### Hero Section
**Dimensões:**
- Height: 280px (desktop), 220px (mobile)
- Width: 100%
- Background: Imagem ou #1c2d1b
- Overlay: rgba(28,45,27,0.8) se houver imagem
- Padding: 48px (desktop), 24px (mobile)
- Display: flex
- Flex-direction: column
- Justify-content: center

**Badge de Status:**
- Position: absolute
- Top: 32px
- Left: 32px
- Background: #d2ff00 (ativa) ou #cccccc (arquivada)
- Color: #000000 (ativa) ou #666666 (arquivada)
- Padding: 6px 16px
- Border-radius: 12px
- Font-size: 13px
- Font-weight: 600

**Ícone + Título:**
- Display: flex
- Align-items: center
- Gap: 16px
- Font-size: 42px (desktop), 24px (mobile)
- Font-weight: 700
- Color: #ffffff
- Margin-bottom: 12px

**Descrição:**
- Font-size: 16px (desktop), 14px (mobile)
- Color: #ffffff
- Opacity: 0.9
- Line-height: 1.6
- Max-width: 800px
- Margin-bottom: 24px

**Botões de Ação:**
- Display: flex
- Gap: 12px
- Margin-top: 24px

**Botão Outline:**
- Height: 44px
- Padding: 0 24px
- Border: 2px solid #d2ff00
- Background: transparent
- Color: #ffffff
- Font-weight: 600
- Border-radius: 8px

**Botão "+ Adicionar Curso":**
- Height: 44px
- Padding: 0 24px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Border: none

### Cards de Estatísticas
**Dimensões:**
- Display: grid
- Grid-template-columns: repeat(4, 1fr) (desktop), repeat(2, 1fr) (mobile)
- Gap: 24px (desktop), 12px (mobile)
- Margin: 32px 0

**Card Individual:**
- Background: #ffffff
- Padding: 24px (desktop), 16px (mobile)
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
- Margin-bottom: 16px

**Ícone:**
- Font-size: 24px
- Color: #d2ff00

### Tabs de Navegação
**Container:**
- Border-bottom: 2px solid #e0e0e0
- Padding: 0 32px (desktop), 0 16px (mobile)
- Display: flex
- Gap: 32px (desktop), 24px (mobile)
- Overflow-x: auto (mobile)

**Tab Item:**
- Padding: 16px 0
- Font-size: 16px
- Font-weight: 600
- Cursor: pointer
- Position: relative
- Border-bottom: 4px solid transparent
- Transition: all 0.3s ease
- White-space: nowrap

**Tab Ativa:**
- Color: #000000
- Border-bottom: 4px solid #d2ff00

**Tab Inativa:**
- Color: #666666

### Tab Content - Lista de Cursos
**Header:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-bottom: 24px
- Padding: 32px 32px 0 (desktop), 16px 16px 0 (mobile)

**Item de Curso:**
- Background: #ffffff
- Padding: 20px (desktop), 16px (mobile)
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Margin-bottom: 16px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.04)

**Ícone + Título:**
- Display: flex
- Align-items: center
- Gap: 12px
- Font-size: 18px (desktop), 16px (mobile)
- Font-weight: 700
- Color: #000000
- Margin-bottom: 12px

**Meta Informações:**
- Font-size: 14px
- Color: #666666
- Margin-bottom: 16px
- Display: flex
- Gap: 12px
- Flex-wrap: wrap

**Barra de Progresso:**
- Height: 8px
- Border-radius: 4px
- Background: #e0e0e0
- Fill: #d2ff00
- Margin: 12px 0
- Width: 100%

**Percentual:**
- Font-size: 14px
- Font-weight: 600
- Color: #000000
- Margin-left: 8px

**Footer (Timestamp + Botões):**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-top: 16px

**Timestamp:**
- Font-size: 13px
- Color: #999999

**Botões de Ação:**
- Display: flex
- Gap: 8px

**Botão "Gerenciar":**
- Height: 36px
- Padding: 0 16px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 6px
- Border: none

**Botão "Editar":**
- Height: 36px
- Padding: 0 16px
- Border: 2px solid #d2ff00
- Background: transparent
- Color: #000000
- Font-weight: 600
- Border-radius: 6px

**Menu (•••):**
- Width: 36px
- Height: 36px
- Border: 2px solid #e0e0e0
- Border-radius: 6px
- Background: #ffffff
- Color: #666666

---

## Estados Interativos

### Botões Hero Hover
- **Outline:** Background rgba(210,255,0,0.1)
- **Filled:** Background #b8e600

### Card de Stats Hover
- Transform: translateY(-2px)
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

### Tab Hover (inativa)
- Background: rgba(210,255,0,0.05)
- Color: #000000

### Item de Curso Hover
- Border-color: #d2ff00
- Box-shadow: 0 4px 12px rgba(210,255,0,0.1)

### Botão "Gerenciar" Hover
- Background: #b8e600
- Transform: translateY(-1px)

### Botão "Editar" Hover
- Background: rgba(210,255,0,0.1)

### Menu (•••) Hover
- Border-color: #d2ff00
- Background: #f0f0f0

---

## Comportamento Responsivo

### Desktop (>1200px)
- Hero full width, 280px altura
- Stats em 4 colunas
- Tabs com padding lateral
- Lista de cursos max-width 1200px

### Tablet (768px - 1199px)
- Hero 260px altura
- Stats em 2 colunas
- Tabs mantêm layout
- Padding reduzido

### Mobile (<768px)
- Hero 220px altura
- Stats em 2x2
- Tabs com scroll horizontal
- Botões empilhados quando necessário
- Padding 16px

---

## Casos Especiais

### Nenhum Curso Criado
```
┌─────────────────────────────────┐
│ [Ícone 📖 grande, cinza claro]  │
│                                 │
│ Nenhum curso criado ainda       │
│                                 │
│ Adicione o primeiro curso para  │
│ começar a estruturar a disciplina│
│                                 │
│ [+ Criar Curso]                 │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Tab "Alunos" (content)
```
┌─────────────────────────────────┐
│ H2: "Alunos Matriculados"       │
│ [Exportar Lista] [Enviar Email] │
│                                 │
│ [Buscar aluno...]               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ITEM ALUNO                  │ │
│ │ [Avatar] Maria Silva        │ │
│ │ maria@email.com             │ │
│ │ Progresso: 75%              │ │
│ │ 3 conversas • Ativa há 2d   │ │
│ │ [Ver Perfil]                │ │
│ └─────────────────────────────┘ │
│ ...                             │
└─────────────────────────────────┘
```

### Tab "Atividades" (content)
```
┌─────────────────────────────────┐
│ H2: "Atividade Recente"         │
│ [Filtrar por: Tudo ▼]           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ TIMELINE                    │ │
│ │ Border-left #d2ff00 3px     │ │
│ │                             │ │
│ │ • Maria Silva fez pergunta  │ │
│ │   Cap. 1.2: História        │ │
│ │   Há 5 min                  │ │
│ │                             │ │
│ │ • João completou Módulo 1   │ │
│ │   Há 12 min                 │ │
│ │ ...                         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Tab "Configurações" (content)
```
┌─────────────────────────────────┐
│ H2: "Configurações da Disciplina"│
│                                 │
│ Nome da Disciplina:             │
│ [Input] Introdução ao Agro...   │
│                                 │
│ Descrição:                      │
│ [Textarea]                      │
│                                 │
│ Categoria:                      │
│ [Dropdown] Agronegócio          │
│                                 │
│ Visibilidade:                   │
│ ☑ Ativa e visível               │
│ ☐ Arquivada                     │
│                                 │
│ [Salvar Alterações] (#d2ff00)   │
└─────────────────────────────────┘
```

### Menu de Ações do Curso (•••)
```
┌─────────────────────────┐
│ Editar Curso            │
│ Ver Capítulos           │
│ Adicionar Capítulo      │
│ Duplicar Curso          │
│ ───────────────────     │
│ Excluir Curso           │
└─────────────────────────┘
```

### Modal "Adicionar Curso"
```
┌─────────────────────────────────┐
│ Novo Curso                      │
├─────────────────────────────────┤
│ Título do Curso:                │
│ [Input]                         │
│                                 │
│ Descrição:                      │
│ [Textarea]                      │
│                                 │
│ Ordem de Exibição:              │
│ [Number input] 1                │
│                                 │
│ [Cancelar] [Criar] (#d2ff00)    │
└─────────────────────────────────┘
```

### Disciplina Arquivada (Hero diferente)
- Badge "Arquivada" cinza
- Botão "Reativar" ao invés de "Arquivar"
- Banner de aviso: "Esta disciplina está arquivada e não é visível para alunos"

### Loading States
- **Hero:** Gradient placeholder
- **Stats:** Skeleton shimmer
- **Lista:** Skeleton items
- Mantém estrutura do layout

---

## Acessibilidade

- **ARIA labels** em todos botões e tabs
- **Role="tablist"** nas tabs
- **Role="tabpanel"** no conteúdo das tabs
- **Keyboard navigation:**
  - Arrow left/right para navegar entre tabs
  - Tab para navegar dentro do conteúdo
  - Enter para ativar ações
- **Focus visible:** Outline #d2ff00 3px
- **Screen reader:**
  - Anunciar tab ativa
  - Anunciar estatísticas ao carregar
  - Ler progresso com contexto
- **Contraste WCAG AA** em todos os textos
- **Headings hierárquicos:** H1 (hero) > H2 (seções) > H3 (items)
- **Skip links:** "Pular hero", "Pular para cursos"
- **Alt text** em imagens de capa


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->