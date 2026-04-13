# 04 - Course Detail (Detalhes do Curso)

**Prioridade:** P0 (Sprint 1)
**Persona:** STUDENT
**Funcionalidade:** Visualizar estrutura completa do curso (módulos e capítulos) e acessar conteúdo

---

## Prompt para Google Stitch

```
Crie um design de página de detalhes de curso para plataforma educacional usando a seguinte paleta de cores:
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
1. Hero section com:
   - Imagem de capa do curso (full width, 320px altura)
   - Badge de categoria (Dourado #c0ac6f)
   - Título do curso grande
   - Nome do professor
   - Barra de progresso geral
   - Botão "Continuar de onde parei" (Verde Neon #d2ff00)

2. Tabs de navegação:
   - "Conteúdo" (ativo)
   - "Sobre"
   - "Recursos"

3. Lista de módulos (accordion):
   - Cada módulo expansível
   - Mostrar número de capítulos
   - Mostrar progresso do módulo
   - Capítulos como lista dentro do módulo
   - Cada capítulo com ícone de status (✓ completo, • em progresso, ○ não iniciado)
   - Botão "Iniciar" ou "Continuar" em cada capítulo

Estilo:
- Cards com sombra suave
- Bordas arredondadas (8px)
- Espaçamento generoso
- Design moderno e hierárquico
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Meus Cursos > Introdução ao Agronegócio] [🔔] [🌓] [Avatar ▼]                 │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ HERO SECTION - Imagem de capa (full width, 320px altura)               │
│ SIDEBAR  │ ┌────────────────────────────────────────────────────────────────────┐ │
│ (#1c2d1b)│ │                                                                    │ │
│ 256px    │ │         [Imagem de capa do curso com overlay escuro 40%]          │ │
│          │ │                                                                    │ │
│ [🏠 Início│ │  [Agronegócio] (#c0ac6f badge, position absolute top-left 32px)  │ │
│          │ │                                                                    │ │
│ [📚 Cursos│ │  H1: "Introdução ao Agronegócio" (#ffffff, 48px, bold)            │ │
│  ATIVO]  │ │  Por Prof. João Silva (#ffffff, 18px)                             │ │
│          │ │                                                                    │ │
│ [💬 Chat  │ │  [▓▓▓▓▓░░░░░] 65% completo (#d2ff00 bar)                         │ │
│          │ │                                                                    │ │
│ [📖 Hist. │ │  [Continuar de onde parei ▶] (#d2ff00 button, 48px altura)      │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│ [👤 Perfil│                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ TABS - Border-bottom 2px #e0e0e0, padding 16px horizontal         │ │
│          │ │ [Conteúdo] (ativo, border-bottom #d2ff00 4px)                     │ │
│          │ │ [Sobre] [Recursos]                                                 │ │
│ [🚪 Sair] │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ÁREA DE CONTEÚDO - Padding 32px, max-width 1200px                      │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ MÓDULO 1 - Accordion expandido (#ffffff card)                     │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ [▼] Módulo 1: Fundamentos                     [▓▓▓░░] 75%  │   │ │
│          │ │ │     6 capítulos                                               │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │   ┌────────────────────────────────────────────────────────────┐   │ │
│          │ │   │ [✓] 1.1 O que é Agronegócio?          [Concluído] (#666)  │   │ │
│          │ │   └────────────────────────────────────────────────────────────┘   │ │
│          │ │   ┌────────────────────────────────────────────────────────────┐   │ │
│          │ │   │ [•] 1.2 História do Agro no Brasil    [Continuar ▶] (#d2ff00│   │ │
│          │ │   └────────────────────────────────────────────────────────────┘   │ │
│          │ │   ┌────────────────────────────────────────────────────────────┐   │ │
│          │ │   │ [○] 1.3 Cadeia Produtiva              [Iniciar ▶] (outline)│   │ │
│          │ │   └────────────────────────────────────────────────────────────┘   │ │
│          │ │   [... mais 3 capítulos]                                          │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ MÓDULO 2 - Accordion colapsado (#ffffff card)                     │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ [▶] Módulo 2: Mercado e Economia              [▓░░░░] 20%  │   │ │
│          │ │ │     5 capítulos                                               │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ MÓDULO 3 - Accordion colapsado                                     │ │
│          │ │ [▶] Módulo 3: Sustentabilidade                    [░░░░░] 0%    │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Curso                [🔔] [Avatar│
└─────────────────────────────────────┘
│ HERO - Imagem 280px altura          │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │   [Imagem com overlay]          │ │
│ │                                 │ │
│ │ [Agronegócio] badge             │ │
│ │                                 │ │
│ │ H1: Introdução ao               │ │
│ │ Agronegócio                     │ │
│ │ Por Prof. João Silva            │ │
│ │                                 │ │
│ │ [▓▓▓▓░░] 65%                   │ │
│ │                                 │ │
│ │ [Continuar ▶] (#d2ff00 button) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ TABS (horizontal scroll)        │ │
│ │ [Conteúdo][Sobre][Recursos]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ LISTA DE MÓDULOS - Padding 16px     │
│ ┌─────────────────────────────────┐ │
│ │ [▼] Módulo 1: Fundamentos       │ │
│ │     6 cap. • [▓▓▓░] 75%        │ │
│ │                                 │ │
│ │  ┌───────────────────────────┐  │ │
│ │  │[✓] 1.1 O que é Agro?     │  │ │
│ │  │    Concluído              │  │ │
│ │  └───────────────────────────┘  │ │
│ │  ┌───────────────────────────┐  │ │
│ │  │[•] 1.2 História do Agro  │  │ │
│ │  │    [Continuar ▶] (#d2ff00)│  │ │
│ │  └───────────────────────────┘  │ │
│ │  ┌───────────────────────────┐  │ │
│ │  │[○] 1.3 Cadeia Produtiva  │  │ │
│ │  │    [Iniciar ▶] (outline) │  │ │
│ │  └───────────────────────────┘  │ │
│ │  [... mais capítulos]           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [▶] Módulo 2: Mercado           │ │
│ │     5 cap. • [▓░░] 20%         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Hero Section
- **Overlay sobre imagem:** rgba(0,0,0,0.4)
- **Título:** #ffffff
- **Professor:** #ffffff com opacity 0.9
- **Barra de progresso:** Preenchida #d2ff00, vazia rgba(255,255,255,0.3)
- **Botão "Continuar":** Fundo #d2ff00, texto #000000

### Módulos e Capítulos
- **Card de módulo:** #ffffff
- **Border:** #e0e0e0 1px
- **Título do módulo:** #000000
- **Subtítulo (nº capítulos):** #666666
- **Ícone de status:**
  - Completo (✓): #28a745 (verde sucesso)
  - Em progresso (•): #d2ff00 (Verde Neon)
  - Não iniciado (○): #cccccc (cinza claro)
- **Botão "Continuar" (capítulo):** Fundo #d2ff00, texto #000000
- **Botão "Iniciar" (capítulo):** Outline #d2ff00 2px, texto #000000, fundo transparent

### Tabs
- **Tab inativa:** Color #666666, border-bottom transparent
- **Tab ativa:** Color #000000, border-bottom #d2ff00 4px
- **Tab hover:** Color #000000, background rgba(210,255,0,0.05)

---

## Componentes e Especificações

### Hero Section
**Dimensões:**
- Altura: 320px (desktop), 280px (mobile)
- Width: 100%

**Estrutura:**
- Background: Imagem do curso com object-fit cover
- Overlay: Linear gradient rgba(0,0,0,0.2) to rgba(0,0,0,0.6)
- Padding: 48px (desktop), 24px (mobile)
- Badge: Position absolute, top-left 32px
- Conteúdo centralizado verticalmente

**Barra de Progresso:**
- Height: 12px
- Border-radius: 6px
- Background: rgba(255,255,255,0.3)
- Fill: #d2ff00
- Width: 300px (desktop), 100% (mobile)
- Margin-top: 24px

**Botão "Continuar de onde parei":**
- Height: 48px
- Padding: 0 32px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Margin-top: 16px
- Icon ▶ à direita

### Tabs de Navegação
- **Container:**
  - Border-bottom: 2px solid #e0e0e0
  - Padding: 0 32px
  - Display: flex
  - Gap: 32px

- **Tab Item:**
  - Padding: 16px 0
  - Font-size: 16px
  - Font-weight: 600
  - Cursor: pointer
  - Position: relative
  - Border-bottom: 4px solid transparent
  - Transition: all 0.3s ease

- **Tab Ativa:**
  - Color: #000000
  - Border-bottom: 4px solid #d2ff00

### Card de Módulo (Accordion)
**Dimensões:**
- Width: 100%
- Padding: 24px
- Background: #ffffff
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Margin-bottom: 16px

**Header do Módulo:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Cursor: pointer

**Ícone de Expansão:**
- [▼] quando expandido: rotate(0deg)
- [▶] quando colapsado: rotate(0deg)
- Color: #000000
- Font-size: 20px
- Transition: transform 0.3s ease

**Título:**
- Font-size: 20px
- Font-weight: 700
- Color: #000000

**Subtítulo (número de capítulos):**
- Font-size: 14px
- Color: #666666
- Margin-top: 4px

**Barra de Progresso (módulo):**
- Width: 120px
- Height: 8px
- Border-radius: 4px
- Background: #e0e0e0
- Fill: #d2ff00

### Item de Capítulo
**Dimensões:**
- Width: 100%
- Padding: 16px
- Background: #f9f9f9
- Border-left: 4px solid transparent
- Margin-top: 8px
- Border-radius: 4px

**Estados:**
- **Completo:** Border-left #28a745
- **Em progresso:** Border-left #d2ff00
- **Não iniciado:** Border-left #cccccc

**Layout:**
- Display: flex
- Justify-content: space-between
- Align-items: center

**Ícone de Status:**
- [✓] Completo: Color #28a745, font-size 18px
- [•] Em progresso: Color #d2ff00, font-size 18px
- [○] Não iniciado: Color #cccccc, font-size 18px

**Título do Capítulo:**
- Font-size: 16px
- Font-weight: 600
- Color: #000000

**Botões de Ação:**
- **"Continuar":** Background #d2ff00, color #000000, padding 8px 16px
- **"Iniciar":** Background transparent, border 2px solid #d2ff00, color #000000
- **"Concluído":** Text only, color #666666, sem botão

---

## Estados Interativos

### Accordion Expansion
- Smooth animation 0.3s ease
- Ícone rotaciona
- Altura expande/colapsa com max-height transition

### Module Card Hover
- Border-color: #d2ff00
- Box-shadow: 0 4px 12px rgba(210,255,0,0.15)

### Chapter Item Hover
- Background: #ffffff
- Transform: translateX(4px)
- Box-shadow: 0 2px 8px rgba(0,0,0,0.08)

### Botão "Continuar/Iniciar" Hover
- Transform: translateY(-1px)
- Box-shadow: 0 4px 12px rgba(210,255,0,0.3)

### Tab Hover
- Background: rgba(210,255,0,0.05)

---

## Comportamento Responsivo

### Desktop (>1200px)
- Hero full width, 320px altura
- Tabs com padding 32px
- Módulos max-width 1200px centralizado
- 3 módulos visíveis sem scroll

### Tablet (768px - 1199px)
- Hero 300px altura
- Tabs mantêm layout
- Módulos full width com padding 24px

### Mobile (<768px)
- Hero 280px altura
- Tabs com scroll horizontal
- Padding reduzido (16px)
- Botão "Continuar" full width
- Capítulos em lista vertical simples

---

## Casos Especiais

### Curso Não Iniciado (0%)
- Barra de progresso vazia
- Botão muda para "Começar Agora"
- Primeiro módulo expandido por padrão

### Curso Completo (100%)
- Badge "Concluído" no hero
- Barra de progresso verde completa
- Botão muda para "Revisar Curso"
- Todos módulos com ✓

### Módulo Bloqueado (depende do anterior)
- Ícone de cadeado 🔒
- Texto em cinza
- Tooltip: "Complete o módulo anterior para desbloquear"
- Botões desabilitados

### Tab "Sobre"
```
┌─────────────────────────────────┐
│ Descrição do Curso              │
│ [Texto longo markdown]          │
│                                 │
│ Objetivos de Aprendizagem       │
│ • Objetivo 1                    │
│ • Objetivo 2                    │
│                                 │
│ Professor                       │
│ [Avatar] João Silva             │
│ [Bio breve]                     │
└─────────────────────────────────┘
```

### Tab "Recursos"
```
┌─────────────────────────────────┐
│ Materiais Complementares        │
│ 📄 PDF: Apostila completa       │
│ 🎥 Vídeo: Introdução            │
│ 🔗 Link: Site oficial           │
└─────────────────────────────────┘
```

---

## Acessibilidade

- **Breadcrumb** na topbar para navegação
- **ARIA labels** nos accordions (aria-expanded)
- **Keyboard navigation:**
  - Enter/Space para expandir módulos
  - Tab para navegar entre capítulos
  - Enter para abrir capítulo
- **Focus visible** em todos elementos (outline #d2ff00 2px)
- **Screen reader:** Anunciar progresso do módulo/curso
- **Skip link** para pular hero e ir direto ao conteúdo
- **Alt text** na imagem do hero


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->