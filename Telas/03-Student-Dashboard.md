# 03 - Student Dashboard

**Prioridade:** P0 (Sprint 1)
**Persona:** STUDENT
**Funcionalidade:** Dashboard principal do aluno com cursos matriculados e progresso

---

## Prompt para Google Stitch

```
Crie um design de dashboard para estudante de plataforma educacional usando a seguinte paleta de cores:
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
1. Header com título "Meus Cursos" e botão "Ver Todos" (Verde Neon)
2. Grid de cards de cursos (3 colunas no desktop, 1 no mobile)
3. Cada card deve ter:
   - Imagem de capa (16:9)
   - Badge de categoria (Dourado #c0ac6f)
   - Título do curso (Preto #000000)
   - Nome do professor (cinza escuro)
   - Barra de progresso (Verde Neon #d2ff00)
   - Percentual de conclusão
   - Botão "Continuar" (fundo Verde Neon #d2ff00, texto Preto)

Estilo:
- Cards com sombra suave
- Bordas arredondadas (8px)
- Espaçamento generoso
- Hover nos cards: elevação da sombra
- Design moderno e clean
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Dashboard] [🔔] [🌓] [Avatar ▼]                                                │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ ÁREA PRINCIPAL - Fundo #f5f5f0 - Padding 32px                          │
│ SIDEBAR  │                                                                          │
│ (#1c2d1b)│ ┌────────────────────────────────────────────────────────────────────┐ │
│ 256px    │ │ HEADER - Flex justify-between                                      │ │
│          │ │ H1: "Meus Cursos" (#000000, 32px bold)                             │ │
│ [🏠 Início│ │                      [Botão "Ver Todos" - #d2ff00, 40px altura] │ │
│  ATIVO]  │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│ [📚 Cursos│ ┌──────────────────── GRID 3 COLUNAS (gap 24px) ──────────────────┐ │
│          │ │                                                                    │ │
│ [💬 Chat  │ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │ │
│          │ │ │ ┌────────────┐ │ │ ┌────────────┐ │ │ ┌────────────┐ │       │ │
│ [📖 Hist. │ │ │ │  Imagem    │ │ │ │  Imagem    │ │ │ │  Imagem    │ │       │ │
│          │ │ │ │  Capa      │ │ │ │  Capa      │ │ │ │  Capa      │ │       │ │
│ [👤 Perfil│ │ │ │  16:9      │ │ │ │  16:9      │ │ │ │  16:9      │ │       │ │
│          │ │ │ └────────────┘ │ │ │ └────────────┘ │ │ │ └────────────┘ │       │ │
│          │ │ │ [Agronegócio]  │ │ │ [Sustentab.]   │ │ │ [Marketing]    │       │ │
│          │ │ │ Curso de Intro │ │ │ Práticas Sust. │ │ │ Digital Básico │       │ │
│          │ │ │ ao Agronegócio │ │ │ no Campo       │ │ │ para Produtores│       │ │
│          │ │ │                │ │ │                │ │ │                │       │ │
│          │ │ │ Prof. João     │ │ │ Prof. Maria    │ │ │ Prof. Ana      │       │ │
│          │ │ │                │ │ │                │ │ │                │       │ │
│          │ │ │ [▓▓▓▓▓░░░] 65% │ │ │ [▓▓░░░░░░] 20% │ │ │ [▓▓▓▓▓▓▓▓] 95% │       │ │
│          │ │ │                │ │ │                │ │ │                │       │ │
│          │ │ │ [Continuar] ▶  │ │ │ [Continuar] ▶  │ │ │ [Continuar] ▶  │       │ │
│ [🚪 Sair] │ │ └────────────────┘ │ └────────────────┘ │ └────────────────┘       │ │
│          │ │                                                                    │ │
│          │ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │ │
│          │ │ │ [Card 4]       │ │ [Card 5]       │ │ [Card 6]       │       │ │
│          │ │ │ ...            │ │ ...            │ │ ...            │       │ │
│          │ │ └────────────────┘ └────────────────┘ └────────────────┘       │ │
│          │ └────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [☰] Dashboard         [🔔] [Avatar] │
└─────────────────────────────────────┘
│ CONTEÚDO - Fundo #f5f5f0            │
│ Padding 16px                        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ H1: "Meus Cursos"               │ │
│ │ [Ver Todos →] (link #d2ff00)   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ┌───────────────────────────┐   │ │
│ │ │                           │   │ │
│ │ │   Imagem Capa 16:9        │   │ │
│ │ │                           │   │ │
│ │ └───────────────────────────┘   │ │
│ │ [Agronegócio] (#c0ac6f badge)   │ │
│ │                                 │ │
│ │ Curso de Introdução             │ │
│ │ ao Agronegócio                  │ │
│ │                                 │ │
│ │ Prof. João Silva                │ │
│ │                                 │ │
│ │ [▓▓▓▓▓░░░░░] 65%               │ │
│ │                                 │ │
│ │ [Continuar ▶] (#d2ff00 button) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Card Curso 2]                  │ │
│ │ 20% completo                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Card Curso 3]                  │ │
│ │ 95% completo                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Paleta Principal
- **Fundo da Página:** #f5f5f0 (Cinza Claro)
- **Cards:** #ffffff (branco puro)
- **Título Principal:** #000000 (Preto)
- **Texto Secundário:** #666666 (cinza médio)
- **Badge Categoria:** #c0ac6f (Dourado) com texto #000000
- **Barra de Progresso (preenchida):** #d2ff00 (Verde Neon)
- **Barra de Progresso (vazia):** #e0e0e0 (cinza claro)
- **Botão "Continuar":** Fundo #d2ff00, texto #000000, hover: #b8e600

---

## Componentes e Especificações

### Card de Curso
**Dimensões Desktop:**
- Largura: auto (grid 3 colunas com gap 24px)
- Altura: auto (conteúdo + padding 24px)

**Estrutura:**
- **Imagem de Capa:** Aspect ratio 16:9, object-fit cover, border-radius 8px 8px 0 0
- **Badge de Categoria:**
  - Position: absolute top-right da imagem
  - Background: #c0ac6f
  - Color: #000000
  - Padding: 4px 12px
  - Font-size: 12px
  - Font-weight: 600
  - Border-radius: 4px
- **Conteúdo (padding 20px):**
  - Título: Font-size 18px, font-weight 700, color #000000, line-height 1.4
  - Professor: Font-size 14px, color #666666, margin-top 8px
  - Barra de Progresso:
    - Altura: 8px
    - Border-radius: 4px
    - Background: #e0e0e0
    - Preenchimento: #d2ff00
    - Margin-top: 16px
  - Percentual: Font-size 14px, font-weight 600, color #000000, margin-top 4px
- **Botão "Continuar":**
  - Width: 100%
  - Height: 44px
  - Background: #d2ff00
  - Color: #000000
  - Font-weight: 600
  - Border-radius: 8px
  - Border: none
  - Margin-top: 16px
  - Icon: ▶ (play) à direita

### Header da Página
- **Título "Meus Cursos":**
  - Font-size: 32px
  - Font-weight: 700
  - Color: #000000
- **Botão "Ver Todos":**
  - Background: #d2ff00
  - Color: #000000
  - Padding: 12px 24px
  - Border-radius: 8px
  - Font-weight: 600
  - Hover: Background #b8e600

### Grid de Cursos
- **Desktop:** display: grid, grid-template-columns: repeat(3, 1fr), gap: 24px
- **Tablet:** grid-template-columns: repeat(2, 1fr), gap: 20px
- **Mobile:** grid-template-columns: 1fr, gap: 16px

---

## Estados Interativos

### Card Hover (Desktop)
- Transform: translateY(-4px)
- Box-shadow: 0 8px 24px rgba(0,0,0,0.12)
- Transition: all 0.3s ease

### Botão "Continuar" Hover
- Background: #b8e600 (Verde Neon mais escuro)
- Transform: translateY(-1px)
- Box-shadow: 0 4px 12px rgba(210,255,0,0.3)

### Badge de Categoria
- Sem interação (apenas visual)

### Barra de Progresso
- Animação de preenchimento ao carregar a página (0.8s ease-out)

---

## Comportamento Responsivo

### Desktop (>1200px)
- Grid 3 colunas
- Sidebar visível (256px)
- Cards com hover elevation

### Tablet (768px - 1199px)
- Grid 2 colunas
- Sidebar colapsável (ícone hambúrguer)
- Cards ligeiramente menores

### Mobile (<768px)
- Grid 1 coluna
- Sidebar como drawer lateral
- Topbar compacta (56px)
- Padding reduzido (16px)
- Imagens de capa com altura fixa 180px

---

## Casos Especiais

### Nenhum Curso Matriculado
```
┌────────────────────────────────────┐
│ [Ícone 📚 grande, cinza claro]     │
│                                    │
│ Você ainda não está matriculado    │
│ em nenhum curso                    │
│                                    │
│ [Explorar Cursos] (botão #d2ff00) │
└────────────────────────────────────┘
```

### Curso Completo (100%)
- Badge adicional: "Concluído" (fundo #d2ff00, texto #000000)
- Botão muda para "Revisar" ao invés de "Continuar"
- Ícone de check (✓) ao lado do percentual

### Loading State
- Cards com skeleton screen
- Shimmer effect em #e0e0e0 → #f0f0f0
- Mantém estrutura do layout

---

## Acessibilidade

- **Alt text** em todas as imagens de capa
- **ARIA labels** nos botões "Continuar"
- **Focus visible** em todos elementos interativos (outline #d2ff00 2px)
- **Contraste WCAG AA** em todos os textos (mínimo 4.5:1)
- **Keyboard navigation** funcional em toda a página
- **Screen reader:** Anunciar percentual de progresso ao focar no card


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->