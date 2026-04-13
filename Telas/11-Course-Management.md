# 11 - Course Management (Gerenciamento de Curso)

**Prioridade:** P0 (Sprint 2)
**Persona:** TEACHER
**Funcionalidade:** Gerenciar estrutura do curso (módulos e capítulos), reordenar, editar e processar conteúdo

---

## Prompt para Google Stitch

```
Crie um design de página de gerenciamento de curso para professor usando a seguinte paleta de cores:
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
1. Header do curso:
   - Breadcrumb (Disciplina > Curso)
   - Título do curso
   - Botões: "Adicionar Módulo" e "Processar Conteúdo" (Verde Neon #d2ff00)

2. Estrutura do curso (accordion de módulos):
   - Cada módulo expansível com drag-and-drop para reordenação
   - Lista de capítulos dentro de cada módulo
   - Ícones de status (publicado/rascunho/processando)
   - Botões de ação por item (editar, excluir, reordenar)

3. Sidebar direita (opcional, colapsável):
   - Preview do capítulo selecionado
   - Metadados (autor, data, status)
   - Ações rápidas

Estilo:
- Estrutura hierárquica clara (módulos > capítulos)
- Drag handles visíveis
- Estados visuais claros (hover, ativo, processando)
- Design funcional e organizado
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Agronegócio > Módulo 1: Fundamentos]          [🔔] [🌓] [Avatar ▼]            │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ ÁREA PRINCIPAL - Fundo #f5f5f0 - Padding 32px                          │
│ SIDEBAR  │                                                                          │
│ (#1c2d1b)│ ┌────────────────────────────────────────────────────────────────────┐ │
│ 256px    │ │ HEADER - Margin-bottom 24px                                        │ │
│          │ │                                                                    │ │
│ [🏠 Início│ │ [← Voltar para Disciplina]                                        │ │
│          │ │                                                                    │ │
│ [📚 Discip│ │ H1: "Módulo 1: Fundamentos do Agronegócio" (#000, 28px bold)      │ │
│  ATIVO]  │ │                                                                    │ │
│          │ │ [+ Adicionar Módulo] [📄 Processar Conteúdo] (#d2ff00 buttons)    │ │
│ [📊 Conteú│ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│ [💬 Conver│ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ ESTRUTURA DO CURSO - Accordion de módulos                          │ │
│ [📄 Relató│ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│ [👤 Perfil│ │ │ MÓDULO 1 - Expandido (#ffffff card)                         │   │ │
│          │ │ │ Padding 20px, Border 1px #e0e0e0, Border-left #d2ff00 4px    │   │ │
│          │ │ │                                                              │   │ │
│ [🚪 Sair] │ │ │ [≡≡] [▼] Módulo 1: Fundamentos       [✓ Publicado] [Editar]│[•••│   │ │
│          │ │ │ (drag) (collapse icon) (#000, 18px)   (badge #28a745)        │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ 6 capítulos • Atualizado há 3 dias (#666, 14px)              │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ ┌────────────────────────────────────────────────────────┐   │   │ │
│          │ │ │ │ LISTA DE CAPÍTULOS (padding-left 24px)                 │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ ┌──────────────────────────────────────────────────┐   │   │   │ │
│          │ │ │ │ │ ITEM CAPÍTULO - Background #f9f9f9              │   │   │   │ │
│          │ │ │ │ │ Padding 16px, Margin-bottom 8px                  │   │   │   │ │
│          │ │ │ │ │ Border-radius 6px                                │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │ [≡≡] [✓] 1.1 O que é Agronegócio?               │   │   │   │ │
│          │ │ │ │ │ (drag)(status icon) (#000, 16px bold)            │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │ 📄 12 páginas • 67 alunos leram                  │   │   │   │ │
│          │ │ │ │ │ (#666, 13px)                                     │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │                     [Editar] [Visualizar] [•••]  │   │   │   │ │
│          │ │ │ │ │                     (action buttons)             │   │   │   │ │
│          │ │ │ │ └──────────────────────────────────────────────────┘   │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ ┌──────────────────────────────────────────────────┐   │   │   │ │
│          │ │ │ │ │ [≡≡] [⚙️] 1.2 História do Agro no Brasil         │   │   │   │ │
│          │ │ │ │ │ (drag)(processing) (#000, 16px bold)             │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │ ⚠ Processando conteúdo... 45% (#ff9800)          │   │   │   │ │
│          │ │ │ │ │ [▓▓▓▓▓░░░░░] (progress bar orange)              │   │   │   │ │
│          │ │ │ │ └──────────────────────────────────────────────────┘   │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ ┌──────────────────────────────────────────────────┐   │   │   │ │
│          │ │ │ │ │ [≡≡] [○] 1.3 Cadeia Produtiva                    │   │   │   │ │
│          │ │ │ │ │ (drag)(draft) (#000, 16px)                       │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │ 📝 Rascunho • Criado há 1 hora                   │   │   │   │ │
│          │ │ │ │ │ (#999, 13px)                                     │   │   │   │ │
│          │ │ │ │ │                                                  │   │   │   │ │
│          │ │ │ │ │                     [Editar] [Publicar] [•••]    │   │   │   │ │
│          │ │ │ │ └──────────────────────────────────────────────────┘   │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ [... mais 3 capítulos ...]                             │   │   │ │
│          │ │ │ │                                                        │   │   │ │
│          │ │ │ │ [+ Adicionar Capítulo] (#d2ff00 button)                │   │   │ │
│          │ │ │ └────────────────────────────────────────────────────────┘   │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ MÓDULO 2 - Colapsado (#ffffff card)                          │   │ │
│          │ │ │                                                              │   │ │
│          │ │ │ [≡≡] [▶] Módulo 2: Mercado e Economia  [○ Rascunho] [Editar][•••│   │ │
│          │ │ │ 5 capítulos • Criado há 1 semana                             │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│          │ │ │ MÓDULO 3 - Colapsado                                         │   │ │
│          │ │ │ [≡≡] [▶] Módulo 3: Sustentabilidade    [○ Rascunho] [...]    │   │ │
│          │ │ └──────────────────────────────────────────────────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [←] Módulo 1: Fundamentos   [•••]   │
└─────────────────────────────────────┘
│ CONTEÚDO - Padding 16px             │
│ Background #f5f5f0                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [← Voltar]                      │ │
│ │                                 │ │
│ │ H1: "Módulo 1:                  │ │
│ │      Fundamentos"               │ │
│ │ (#000, 20px bold)               │ │
│ │                                 │ │
│ │ [+ Módulo] [📄 Processar]       │ │
│ │ (buttons #d2ff00, compact)      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ MÓDULO 1 - Expandido (#fff)     │ │
│ │ Padding 16px                    │ │
│ │ Border-left #d2ff00 4px         │ │
│ │                                 │ │
│ │ [▼] Módulo 1: Fundamentos       │ │
│ │     [✓ Publicado] [•••]         │ │
│ │                                 │ │
│ │ 6 capítulos • Há 3 dias         │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ CAPÍTULOS LIST              │ │ │
│ │ │                             │ │ │
│ │ │ ┌─────────────────────────┐ │ │ │
│ │ │ │ [≡≡][✓] 1.1 O que é     │ │ │ │
│ │ │ │          Agro?          │ │ │ │
│ │ │ │ 📄 12 pág • 67 leram    │ │ │ │
│ │ │ │ [Editar] [•••]          │ │ │ │
│ │ │ └─────────────────────────┘ │ │ │
│ │ │                             │ │ │
│ │ │ ┌─────────────────────────┐ │ │ │
│ │ │ │ [≡≡][⚙️] 1.2 História   │ │ │ │
│ │ │ │ ⚠ Processando... 45%   │ │ │ │
│ │ │ │ [▓▓▓▓░░░░░]            │ │ │ │
│ │ │ └─────────────────────────┘ │ │ │
│ │ │                             │ │ │
│ │ │ ┌─────────────────────────┐ │ │ │
│ │ │ │ [≡≡][○] 1.3 Cadeia      │ │ │ │
│ │ │ │ 📝 Rascunho             │ │ │ │
│ │ │ │ [Editar] [Publicar]     │ │ │ │
│ │ │ └─────────────────────────┘ │ │ │
│ │ │                             │ │ │
│ │ │ [+ Adicionar Capítulo]      │ │ │
│ │ │ (#d2ff00, full width)       │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ MÓDULO 2 - Colapsado            │ │
│ │ [▶] Módulo 2: Mercado           │ │
│ │     [○ Rascunho] [•••]          │ │
│ │ 5 capítulos                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Header
- **Título:** #000000
- **Botão "+ Adicionar Módulo":** Background #d2ff00, texto #000000
- **Botão "Processar Conteúdo":** Background #d2ff00, texto #000000, ícone 📄

### Cards de Módulo
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Border-left (ativo/expandido):** #d2ff00 4px
- **Título:** #000000
- **Meta info:** #666666
- **Badges:**
  - Publicado: Background #28a745 (verde sucesso), texto #ffffff
  - Rascunho: Background #cccccc (cinza), texto #666666
  - Processando: Background #ff9800 (laranja), texto #ffffff

### Itens de Capítulo
- **Background:** #f9f9f9
- **Hover:** #f0f0f0
- **Border (quando selecionado):** #d2ff00 2px
- **Drag handle (≡≡):** #999999
- **Ícones de status:**
  - Publicado (✓): #28a745 (verde)
  - Processando (⚙️): #ff9800 (laranja)
  - Rascunho (○): #cccccc (cinza)
- **Título:** #000000
- **Meta info:** #666666
- **Progress bar (processando):** Fill #ff9800, background #ffe0b2
- **Botões:**
  - "Editar": Outline #d2ff00 2px
  - "Visualizar": Outline #cccccc 2px
  - "Publicar": Background #d2ff00
  - Menu (•••): #666666

---

## Componentes e Especificações

### Header da Página
**Dimensões:**
- Padding: 0 0 24px
- Border-bottom: 1px solid #e0e0e0
- Margin-bottom: 24px

**Link "Voltar":**
- Font-size: 14px
- Color: #d2ff00
- Text-decoration: none
- Font-weight: 600
- Icon: ← antes do texto
- Margin-bottom: 16px

**Título:**
- Font-size: 28px (desktop), 20px (mobile)
- Font-weight: 700
- Color: #000000
- Margin-bottom: 16px

**Botões de Ação:**
- Display: flex
- Gap: 12px
- Flex-wrap: wrap

**Botão:**
- Height: 44px
- Padding: 0 20px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Border: none

### Card de Módulo
**Dimensões:**
- Background: #ffffff
- Padding: 20px (desktop), 16px (mobile)
- Border: 1px solid #e0e0e0
- Border-left: 4px solid transparent (colapsado), #d2ff00 (expandido)
- Border-radius: 8px
- Margin-bottom: 16px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.04)

**Header do Módulo:**
- Display: flex
- Align-items: center
- Gap: 12px
- Margin-bottom: 12px (se expandido)
- Cursor: pointer

**Drag Handle:**
- Width: 20px
- Color: #999999
- Font-size: 16px
- Cursor: grab

**Ícone de Expansão:**
- [▼] expandido, [▶] colapsado
- Font-size: 16px
- Color: #000000
- Transition: transform 0.3s

**Título do Módulo:**
- Font-size: 18px (desktop), 16px (mobile)
- Font-weight: 700
- Color: #000000
- Flex-grow: 1

**Badge de Status:**
- Padding: 4px 12px
- Border-radius: 12px
- Font-size: 12px
- Font-weight: 600

**Botão "Editar":**
- Height: 32px
- Padding: 0 12px
- Border: 2px solid #d2ff00
- Background: transparent
- Color: #000000
- Font-weight: 600
- Border-radius: 6px

**Menu (•••):**
- Width: 32px
- Height: 32px
- Border: none
- Background: transparent
- Color: #666666
- Font-size: 20px

**Meta Info:**
- Font-size: 14px
- Color: #666666
- Margin-bottom: 16px

### Lista de Capítulos
**Container:**
- Padding-left: 24px (desktop), 12px (mobile)
- Padding-top: 16px

### Item de Capítulo
**Dimensões:**
- Background: #f9f9f9
- Padding: 16px (desktop), 12px (mobile)
- Border-radius: 6px
- Margin-bottom: 8px
- Display: flex
- Flex-direction: column
- Gap: 8px
- Transition: all 0.2s

**Row 1 (Título e Status):**
- Display: flex
- Align-items: center
- Gap: 8px

**Drag Handle:**
- Width: 16px
- Color: #999999
- Font-size: 14px
- Cursor: grab

**Ícone de Status:**
- Font-size: 16px
- Width: 20px

**Título:**
- Font-size: 16px (desktop), 14px (mobile)
- Font-weight: 700
- Color: #000000
- Flex-grow: 1

**Row 2 (Meta Info):**
- Font-size: 13px
- Color: #666666
- Display: flex
- Align-items: center
- Gap: 12px

**Progress Bar (para capítulos processando):**
- Height: 6px
- Border-radius: 3px
- Background: #ffe0b2
- Fill: #ff9800
- Width: 100%
- Margin: 8px 0

**Row 3 (Botões de Ação):**
- Display: flex
- Gap: 8px
- Justify-content: flex-end

**Botão "Editar":**
- Height: 32px
- Padding: 0 12px
- Border: 2px solid #d2ff00
- Background: transparent
- Color: #000000
- Font-weight: 600
- Border-radius: 6px

**Botão "Visualizar":**
- Height: 32px
- Padding: 0 12px
- Border: 2px solid #cccccc
- Background: transparent
- Color: #666666
- Font-weight: 600
- Border-radius: 6px

**Botão "Publicar":**
- Height: 32px
- Padding: 0 12px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 6px
- Border: none

### Botão "+ Adicionar Capítulo"
**Dimensões:**
- Width: 100%
- Height: 44px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Border: none
- Margin-top: 12px

---

## Estados Interativos

### Card de Módulo Hover
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

### Drag Handle Hover
- Color: #000000
- Cursor: grab

### Drag Handle Active
- Cursor: grabbing

### Item de Capítulo Hover
- Background: #f0f0f0
- Border: 2px solid #e0e0e0

### Item de Capítulo Dragging
- Opacity: 0.5
- Transform: rotate(2deg)

### Ícone de Expansão (toggle)
- Transform: rotate(90deg) quando expandir

### Botões Hover
- "Editar": Background rgba(210,255,0,0.1)
- "Publicar": Background #b8e600
- Menu: Background #f0f0f0

---

## Comportamento Responsivo

### Desktop (>1200px)
- Padding lateral amplo
- Drag handles visíveis
- Todos botões visíveis
- Preview sidebar (futuro)

### Tablet (768px - 1199px)
- Padding reduzido
- Drag handles mantêm
- Botões mantêm layout

### Mobile (<768px)
- Padding 16px
- Drag handles menores
- Alguns botões em menu (•••)
- Cards full width
- Texto truncado onde necessário

---

## Casos Especiais

### Nenhum Módulo Criado
```
┌─────────────────────────────────┐
│ [Ícone 📚 grande, cinza claro]  │
│                                 │
│ Nenhum módulo criado            │
│                                 │
│ Crie o primeiro módulo para     │
│ organizar o conteúdo do curso   │
│                                 │
│ [+ Criar Módulo]                │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Capítulo Processando (com progresso)
- Ícone ⚙️ animado (rotação)
- Badge "Processando" laranja
- Barra de progresso laranja
- Texto: "Processando conteúdo... X%"
- Botões desabilitados exceto "Cancelar"

### Capítulo com Erro no Processamento
- Ícone ⚠️ vermelho
- Badge "Erro" vermelho #dc3545
- Mensagem: "Erro ao processar conteúdo"
- Botão "Tentar Novamente" disponível

### Menu de Ações do Módulo (•••)
```
┌─────────────────────────┐
│ Editar Módulo           │
│ Duplicar Módulo         │
│ Reordenar Capítulos     │
│ ───────────────────     │
│ Excluir Módulo          │
└─────────────────────────┘
```

### Menu de Ações do Capítulo (•••)
```
┌─────────────────────────┐
│ Duplicar Capítulo       │
│ Mover para Módulo...    │
│ Ver Estatísticas        │
│ Exportar Conteúdo       │
│ ───────────────────     │
│ Excluir Capítulo        │
└─────────────────────────┘
```

### Modal "Adicionar Módulo"
```
┌─────────────────────────────────┐
│ Novo Módulo                     │
├─────────────────────────────────┤
│ Título:                         │
│ [Input] Módulo X: ...           │
│                                 │
│ Ordem de Exibição:              │
│ [Number] 1                      │
│                                 │
│ Status Inicial:                 │
│ ○ Publicado                     │
│ ● Rascunho                      │
│                                 │
│ [Cancelar] [Criar] (#d2ff00)    │
└─────────────────────────────────┘
```

### Modal "Processar Conteúdo"
```
┌─────────────────────────────────┐
│ Processar Novo Conteúdo         │
├─────────────────────────────────┤
│ Upload de Arquivo:              │
│ [Drop zone ou Browse]           │
│ Formatos: PDF, TXT, DOCX        │
│                                 │
│ OU                              │
│                                 │
│ Cole o texto:                   │
│ [Textarea grande]               │
│                                 │
│ Módulo de Destino:              │
│ [Dropdown] Módulo 1             │
│                                 │
│ Opções de Processamento:        │
│ ☑ Gerar perguntas socráticas   │
│ ☑ Dividir em capítulos auto     │
│ ☐ Publicar automaticamente      │
│                                 │
│ [Cancelar] [Processar] (#d2ff00)│
└─────────────────────────────────┘
```

### Drag and Drop em Ação
```
┌─────────────────────────────────┐
│ [Módulo sendo arrastado]        │
│ Opacity 0.5, cursor grabbing    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Drop zone ativa (dashed)    │ │
│ │ Border #d2ff00 dashed 2px   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Outros módulos]                │
└─────────────────────────────────┘
```

### Confirmação de Exclusão
```
┌─────────────────────────────────┐
│ Excluir Capítulo?               │
├─────────────────────────────────┤
│ Tem certeza que deseja excluir  │
│ o capítulo "1.2 História do     │
│ Agronegócio"?                   │
│                                 │
│ ⚠️ Esta ação não pode ser       │
│    desfeita.                    │
│                                 │
│ [Cancelar] [Excluir] (#dc3545)  │
└─────────────────────────────────┘
```

---

## Acessibilidade

- **ARIA labels** em todos drag handles e botões
- **Role="button"** nos headers expansíveis
- **ARIA-expanded** nos módulos (true/false)
- **Keyboard navigation:**
  - Tab para navegar entre módulos/capítulos
  - Enter/Space para expandir/colapsar
  - Arrow up/down para reordenar (acessível)
- **Focus visible:** Outline #d2ff00 3px
- **Screen reader:**
  - Anunciar expansão/colapsamento
  - Anunciar reordenação bem-sucedida
  - Anunciar progresso de processamento
- **Drag and drop acessível:** Alternativas por teclado
- **Loading states anunciados**
- **Contraste WCAG AA** em todos os textos


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->