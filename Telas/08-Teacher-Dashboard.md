# 08 - Teacher Dashboard

**Prioridade:** P0 (Sprint 1)
**Persona:** TEACHER
**Funcionalidade:** Dashboard principal do professor com visão geral de disciplinas, cursos e atividades dos alunos

---

## Prompt para Google Stitch

```
Crie um design de dashboard para professor de plataforma educacional usando a seguinte paleta de cores:
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
   - Título "Bem-vindo, Prof. [Nome]"
   - Botão "Nova Disciplina" (Verde Neon #d2ff00)

2. Cards de estatísticas (4 colunas):
   - Disciplinas Ativas
   - Alunos Totais
   - Conversas Hoje
   - Conteúdos Pendentes

3. Seção "Minhas Disciplinas":
   - Grid de cards de disciplinas
   - Cada card mostra: título, nº de alunos, progresso geral, botão "Gerenciar"

4. Seção "Atividade Recente":
   - Timeline de atividades dos alunos
   - Perguntas recentes
   - Capítulos mais acessados

5. Seção "Ações Rápidas":
   - Processar novo conteúdo
   - Ver conversas dos alunos
   - Gerar relatórios

Estilo:
- Cards com sombra suave
- Grid responsivo
- Design profissional e organizado
- Dados visuais (gráficos, barras de progresso)
```

---

## Wireframe Desktop (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 64px altura                                                     │
│ [← Dashboard] Dashboard do Professor              [🔔] [🌓] [Avatar ▼]            │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────────────────────────┐
│          │ ÁREA PRINCIPAL - Fundo #f5f5f0 - Padding 32px                          │
│ SIDEBAR  │                                                                          │
│ (#1c2d1b)│ ┌────────────────────────────────────────────────────────────────────┐ │
│ 256px    │ │ HEADER - Flex justify-between, margin-bottom 32px                  │ │
│          │ │                                                                    │ │
│ [🏠 Início│ │ H1: "Bem-vindo, Prof. João Silva" (#000000, 32px bold)            │ │
│  ATIVO]  │ │                                                                    │ │
│          │ │                          [+ Nova Disciplina] (#d2ff00, 48px h)    │ │
│ [📚 Discip│ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│ [📊 Conteú│ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ CARDS DE ESTATÍSTICAS - Grid 4 colunas, gap 24px                  │ │
│ [💬 Conver│ │                                                                    │ │
│          │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │ │
│ [📄 Relató│ │ │ Card Stats 1 │ │ Card Stats 2 │ │ Card Stats 3 │ │Card Stats 4│ │ │
│          │ │ │ Background   │ │ Background   │ │ Background   │ │Background  │ │ │
│ [👤 Perfil│ │ │ #ffffff      │ │ #ffffff      │ │ #ffffff      │ │ #ffffff    │ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 📚           │ │ 👥           │ │ 💬           │ │ 📝         │ │ │
│          │ │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)    │ │ (#d2ff00)  │ │ │
│ [🚪 Sair] │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ 8            │ │ 246          │ │ 23           │ │ 5          │ │ │
│          │ │ │ (#000, 36px) │ │ (#000, 36px) │ │ (#000, 36px) │ │(#000, 36px)│ │ │
│          │ │ │              │ │              │ │              │ │            │ │ │
│          │ │ │ Disciplinas  │ │ Alunos       │ │ Conversas    │ │ Conteúdos  │ │ │
│          │ │ │ Ativas       │ │ Totais       │ │ Hoje         │ │ Pendentes  │ │ │
│          │ │ │ (#666, 14px) │ │ (#666, 14px) │ │ (#666, 14px) │ │(#666, 14px)│ │ │
│          │ │ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ MINHAS DISCIPLINAS - Margin-top 32px                               │ │
│          │ │                                                                    │ │
│          │ │ H2: "Minhas Disciplinas" (#000, 24px bold)    [Ver Todas →]       │ │
│          │ │                                                                    │ │
│          │ │ Grid 3 colunas, gap 24px:                                          │ │
│          │ │                                                                    │ │
│          │ │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │ │
│          │ │ │ CARD DISCIPLINA  │ │ CARD DISCIPLINA  │ │ CARD DISCIPLINA  │   │ │
│          │ │ │ #ffffff, p-24px  │ │ #ffffff, p-24px  │ │ #ffffff, p-24px  │   │ │
│          │ │ │                  │ │                  │ │                  │   │ │
│          │ │ │ 📚 Agronegócio   │ │ 📚 Sustentab.    │ │ 📚 Marketing     │   │ │
│          │ │ │ (#000, 20px bold)│ │ Rural            │ │ Digital          │   │ │
│          │ │ │                  │ │                  │ │                  │   │ │
│          │ │ │ 3 cursos         │ │ 2 cursos         │ │ 1 curso          │   │ │
│          │ │ │ 89 alunos        │ │ 54 alunos        │ │ 23 alunos        │   │ │
│          │ │ │ (#666, 14px)     │ │ (#666, 14px)     │ │ (#666, 14px)     │   │ │
│          │ │ │                  │ │                  │ │                  │   │ │
│          │ │ │ Progresso Geral: │ │ Progresso Geral: │ │ Progresso Geral: │   │ │
│          │ │ │ [▓▓▓▓▓░░░] 68%  │ │ [▓▓▓▓░░░░] 52%  │ │ [▓▓▓░░░░░] 35%  │   │ │
│          │ │ │ (#d2ff00 bar)    │ │ (#d2ff00 bar)    │ │ (#d2ff00 bar)    │   │ │
│          │ │ │                  │ │                  │ │                  │   │ │
│          │ │ │ [Gerenciar →]    │ │ [Gerenciar →]    │ │ [Gerenciar →]    │   │ │
│          │ │ │ (#d2ff00 button) │ │ (#d2ff00 button) │ │ (#d2ff00 button) │   │ │
│          │ │ └──────────────────┘ └──────────────────┘ └──────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
│          │                                                                          │
│          │ ┌────────────────────────────────────────────────────────────────────┐ │
│          │ │ LAYOUT 2 COLUNAS - Margin-top 32px, gap 24px                       │ │
│          │ │                                                                    │ │
│          │ │ ┌────────────────────────────────────┐ ┌──────────────────────┐   │ │
│          │ │ │ ATIVIDADE RECENTE (60%)            │ │ AÇÕES RÁPIDAS (40%)  │   │ │
│          │ │ │ #ffffff card, padding 24px         │ │ #ffffff card, p-24px │   │ │
│          │ │ │                                    │ │                      │   │ │
│          │ │ │ H3: "Atividade Recente" (18px)     │ │ H3: "Ações Rápidas"  │   │ │
│          │ │ │                                    │ │ (18px bold)          │   │ │
│          │ │ │ ┌────────────────────────────────┐ │ │                      │   │ │
│          │ │ │ │ TIMELINE ITEM                  │ │ │ ┌──────────────────┐ │   │ │
│          │ │ │ │ Border-left #d2ff00 3px        │ │ │ │ [Ação]           │ │   │ │
│          │ │ │ │ Padding-left 16px              │ │ │ │ 📄 Processar     │ │   │ │
│          │ │ │ │                                │ │ │ │    Conteúdo      │ │   │ │
│          │ │ │ │ • Maria Silva fez uma pergunta │ │ │ │                  │ │   │ │
│          │ │ │ │   no Cap. 1.2: História do Agro│ │ │ │ (#000, 16px)     │ │   │ │
│          │ │ │ │   Há 5 min (#666, 13px)        │ │ │ │                  │ │   │ │
│          │ │ │ └────────────────────────────────┘ │ │ │ [Acessar →]      │ │   │ │
│          │ │ │                                    │ │ │ (#d2ff00)        │ │   │ │
│          │ │ │ ┌────────────────────────────────┐ │ │ └──────────────────┘ │   │ │
│          │ │ │ │ • João Santos completou Cap.1.1│ │ │                      │   │ │
│          │ │ │ │   Há 12 min                    │ │ │ ┌──────────────────┐ │   │ │
│          │ │ │ └────────────────────────────────┘ │ │ │ 💬 Conversas     │ │   │ │
│          │ │ │                                    │ │ │    dos Alunos    │ │   │ │
│          │ │ │ ┌────────────────────────────────┐ │ │ │                  │ │   │ │
│          │ │ │ │ • Ana Costa iniciou Cap. 2.1   │ │ │ │ 23 não lidas     │ │   │ │
│          │ │ │ │   Há 18 min                    │ │ │ │                  │ │   │ │
│          │ │ │ └────────────────────────────────┘ │ │ │ [Ver Todas →]    │ │   │ │
│          │ │ │                                    │ │ │ (#d2ff00)        │ │   │ │
│          │ │ │ [Ver Tudo]                         │ │ │ └──────────────────┘ │   │ │
│          │ │ │ (#d2ff00 link, center)             │ │ │                      │   │ │
│          │ │ └────────────────────────────────────┘ │ │ ┌──────────────────┐ │   │ │
│          │ │                                        │ │ │ 📊 Relatórios    │ │   │ │
│          │ │                                        │ │ │                  │ │   │ │
│          │ │                                        │ │ │ Progresso        │ │   │ │
│          │ │                                        │ │ │                  │ │   │ │
│          │ │                                        │ │ │ [Gerar →]        │ │   │ │
│          │ │                                        │ │ └──────────────────┘ │   │ │
│          │ │                                        │ └──────────────────────┘   │ │
│          │ └────────────────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe Mobile (375x812)

```
┌─────────────────────────────────────┐
│ TOPBAR (#1c2d1b) - 56px             │
│ [☰] Dashboard          [🔔] [Avatar]│
└─────────────────────────────────────┘
│ CONTEÚDO - Padding 16px             │
│ Background #f5f5f0                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ H1: "Bem-vindo,"                │ │
│ │     "Prof. João"                │ │
│ │ (#000, 24px, bold)              │ │
│ │                                 │ │
│ │ [+ Nova Disciplina]             │ │
│ │ (#d2ff00, full width, 44px)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ STATS - Grid 2x2, gap 12px      │ │
│ │                                 │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 📚      │ │ 👥      │         │ │
│ │ │ 8       │ │ 246     │         │ │
│ │ │Disciplin│ │ Alunos  │         │ │
│ │ │ Ativas  │ │ Totais  │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ 💬      │ │ 📝      │         │ │
│ │ │ 23      │ │ 5       │         │ │
│ │ │Conversas│ │Conteúdos│         │ │
│ │ │  Hoje   │ │Pendentes│         │ │
│ │ └─────────┘ └─────────┘         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ MINHAS DISCIPLINAS              │ │
│ │ [Ver Todas →]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CARD DISCIPLINA (#fff)          │ │
│ │ Padding 16px                    │ │
│ │                                 │ │
│ │ 📚 Agronegócio                  │ │
│ │                                 │ │
│ │ 3 cursos • 89 alunos            │ │
│ │                                 │ │
│ │ Progresso: [▓▓▓▓▓░░░] 68%     │ │
│ │                                 │ │
│ │ [Gerenciar →] (#d2ff00)         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CARD DISCIPLINA 2               │ │
│ │ Sustentabilidade Rural          │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ATIVIDADE RECENTE (#fff)        │ │
│ │                                 │ │
│ │ • Maria Silva fez pergunta      │ │
│ │   Cap. 1.2: História            │ │
│ │   Há 5 min                      │ │
│ │                                 │ │
│ │ • João completou Cap. 1.1       │ │
│ │   Há 12 min                     │ │
│ │                                 │ │
│ │ [Ver Tudo]                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AÇÕES RÁPIDAS (#fff)            │ │
│ │                                 │ │
│ │ [📄 Processar Conteúdo]         │ │
│ │ [💬 Conversas (23)]             │ │
│ │ [📊 Relatórios]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Scroll vertical]                   │
└─────────────────────────────────────┘
```

---

## Especificação de Cores

### Header
- **Título:** #000000
- **Botão "Nova Disciplina":** Background #d2ff00, texto #000000

### Cards de Estatísticas
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Ícone:** #d2ff00
- **Número:** #000000
- **Label:** #666666

### Cards de Disciplinas
- **Background:** #ffffff
- **Border:** 1px solid #e0e0e0
- **Título:** #000000
- **Meta info:** #666666
- **Barra de progresso:** Preenchida #d2ff00, vazia #e0e0e0
- **Botão "Gerenciar":** Background #d2ff00, texto #000000

### Atividade Recente
- **Background card:** #ffffff
- **Título:** #000000
- **Timeline border:** #d2ff00 3px
- **Texto atividade:** #333333
- **Timestamp:** #666666
- **Link "Ver Tudo":** #d2ff00

### Ações Rápidas
- **Background card:** #ffffff
- **Título:** #000000
- **Items:** Background #f9f9f9, hover #f0f0f0
- **Ícone:** #d2ff00
- **Texto:** #000000
- **Badge contador:** Background #d2ff00, texto #000000

---

## Componentes e Especificações

### Header da Página
**Dimensões:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-bottom: 32px

**Título:**
- Font-size: 32px (desktop), 24px (mobile)
- Font-weight: 700
- Color: #000000

**Botão "Nova Disciplina":**
- Height: 48px (desktop), 44px (mobile)
- Padding: 0 32px (desktop), 0 24px (mobile)
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 8px
- Icon: + antes do texto

### Cards de Estatísticas
**Dimensões:**
- Display: grid
- Grid-template-columns: repeat(4, 1fr) (desktop), repeat(2, 1fr) (mobile)
- Gap: 24px (desktop), 12px (mobile)
- Margin-bottom: 32px

**Card Individual:**
- Background: #ffffff
- Padding: 24px (desktop), 16px (mobile)
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Text-align: center

**Ícone:**
- Font-size: 32px
- Color: #d2ff00
- Margin-bottom: 16px

**Número:**
- Font-size: 36px (desktop), 28px (mobile)
- Font-weight: 700
- Color: #000000
- Margin-bottom: 8px

**Label:**
- Font-size: 14px
- Color: #666666
- Line-height: 1.4

### Seção "Minhas Disciplinas"
**Header:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-bottom: 20px

**Título:**
- Font-size: 24px
- Font-weight: 700
- Color: #000000

**Link "Ver Todas":**
- Font-size: 14px
- Color: #d2ff00
- Text-decoration: none
- Font-weight: 600

**Grid:**
- Display: grid
- Grid-template-columns: repeat(3, 1fr) (desktop), 1fr (mobile)
- Gap: 24px (desktop), 16px (mobile)

### Card de Disciplina
**Dimensões:**
- Background: #ffffff
- Padding: 24px (desktop), 16px (mobile)
- Border: 1px solid #e0e0e0
- Border-radius: 8px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.04)

**Ícone + Título:**
- Display: flex
- Align-items: center
- Gap: 12px
- Font-size: 20px (desktop), 18px (mobile)
- Font-weight: 700
- Color: #000000
- Margin-bottom: 12px

**Meta Informações:**
- Font-size: 14px
- Color: #666666
- Margin-bottom: 16px

**Label "Progresso Geral":**
- Font-size: 13px
- Color: #666666
- Margin-bottom: 8px

**Barra de Progresso:**
- Height: 8px
- Border-radius: 4px
- Background: #e0e0e0
- Fill: #d2ff00
- Margin-bottom: 4px

**Percentual:**
- Font-size: 14px
- Font-weight: 600
- Color: #000000
- Text-align: right
- Margin-bottom: 16px

**Botão "Gerenciar":**
- Width: 100%
- Height: 40px
- Background: #d2ff00
- Color: #000000
- Font-weight: 600
- Border-radius: 6px
- Border: none

### Atividade Recente
**Dimensões:**
- Background: #ffffff
- Padding: 24px
- Border: 1px solid #e0e0e0
- Border-radius: 8px

**Título:**
- Font-size: 18px
- Font-weight: 700
- Color: #000000
- Margin-bottom: 20px

**Timeline Item:**
- Border-left: 3px solid #d2ff00
- Padding-left: 16px
- Margin-bottom: 16px
- Position: relative

**Bullet:**
- Position: absolute
- Left: -7px
- Width: 10px
- Height: 10px
- Border-radius: 50%
- Background: #d2ff00

**Texto da Atividade:**
- Font-size: 14px
- Color: #333333
- Line-height: 1.5
- Margin-bottom: 4px

**Timestamp:**
- Font-size: 13px
- Color: #666666

**Link "Ver Tudo":**
- Display: block
- Text-align: center
- Color: #d2ff00
- Font-weight: 600
- Margin-top: 16px
- Text-decoration: none

### Ações Rápidas
**Dimensões:**
- Background: #ffffff
- Padding: 24px
- Border: 1px solid #e0e0e0
- Border-radius: 8px

**Título:**
- Font-size: 18px
- Font-weight: 700
- Color: #000000
- Margin-bottom: 20px

**Item de Ação:**
- Background: #f9f9f9
- Padding: 16px
- Border-radius: 6px
- Margin-bottom: 12px
- Display: flex
- Align-items: center
- Justify-content: space-between
- Cursor: pointer

**Ícone:**
- Font-size: 24px
- Color: #d2ff00
- Margin-right: 12px

**Texto:**
- Font-size: 16px
- Font-weight: 600
- Color: #000000

**Badge (contador):**
- Background: #d2ff00
- Color: #000000
- Padding: 2px 8px
- Border-radius: 10px
- Font-size: 12px
- Font-weight: 700

**Seta:**
- Color: #666666
- Font-size: 18px

---

## Estados Interativos

### Botão "Nova Disciplina" Hover
- Background: #b8e600
- Transform: translateY(-1px)
- Box-shadow: 0 4px 12px rgba(210,255,0,0.3)

### Card de Estatísticas Hover
- Transform: translateY(-2px)
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

### Card de Disciplina Hover
- Border-color: #d2ff00
- Box-shadow: 0 4px 12px rgba(210,255,0,0.15)

### Botão "Gerenciar" Hover
- Background: #b8e600
- Transform: translateY(-1px)

### Item de Ação Hover
- Background: #f0f0f0
- Border-left: 4px solid #d2ff00

### Link "Ver Todas/Tudo" Hover
- Color: #b8e600
- Text-decoration: underline

---

## Comportamento Responsivo

### Desktop (>1200px)
- Grid de stats 4 colunas
- Grid de disciplinas 3 colunas
- Layout 2 colunas (60% / 40%) para Atividade e Ações
- Todos os elementos visíveis

### Tablet (768px - 1199px)
- Grid de stats 2 colunas
- Grid de disciplinas 2 colunas
- Atividade e Ações em coluna única
- Padding reduzido

### Mobile (<768px)
- Grid de stats 2x2
- Disciplinas em coluna única
- Atividade e Ações empilhadas
- Header com título quebrado em 2 linhas
- Botão "Nova Disciplina" full width

---

## Casos Especiais

### Nenhuma Disciplina Criada
```
┌─────────────────────────────────┐
│ [Ícone 📚 grande, cinza claro]  │
│                                 │
│ Você ainda não tem disciplinas  │
│                                 │
│ Crie sua primeira disciplina    │
│ para começar                    │
│                                 │
│ [+ Criar Disciplina]            │
│ (#d2ff00 button)                │
└─────────────────────────────────┘
```

### Nenhuma Atividade Recente
```
┌─────────────────────────────────┐
│ Atividade Recente               │
├─────────────────────────────────┤
│                                 │
│ Nenhuma atividade no momento    │
│                                 │
│ As interações dos alunos        │
│ aparecerão aqui                 │
└─────────────────────────────────┘
```

### Conteúdo Pendente (Badge com alerta)
- Card de stats "Conteúdos Pendentes" com número > 0
- Badge pulsante se > 5
- Click leva para página de revisão

### Conversas Não Lidas (Notificação)
- Badge vermelho no card de stats
- Badge vermelho no item de Ações Rápidas
- Número de conversas não lidas visível

### Loading States
- **Stats:** Skeleton com shimmer
- **Disciplinas:** Skeleton cards
- **Atividade:** Skeleton timeline
- Mantém estrutura do layout

---

## Acessibilidade

- **ARIA labels** em todos botões e cards clicáveis
- **Role="region"** para seções principais
- **Keyboard navigation:**
  - Tab para navegar entre cards e botões
  - Enter para ativar ações
  - Space para selecionar
- **Focus visible:** Outline #d2ff00 3px
- **Screen reader:**
  - Anunciar estatísticas ao carregar
  - Anunciar novas atividades
  - Ler números com contexto ("8 disciplinas ativas")
- **Contraste WCAG AA:** Todos os textos mínimo 4.5:1
- **Headings hierárquicos:** H1 > H2 > H3
- **Skip links:** "Pular para disciplinas", "Pular para atividades"
- **Touch targets:** Mínimo 44x44px (mobile)


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->