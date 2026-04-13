# UX Specialist Review

**Data:** 2026-02-25
**Fase:** Brownfield Discovery — FASE 6 (Validação UX/Frontend)
**Agente:** @ux-design-expert
**Input:** `docs/prd/technical-debt-DRAFT.md`

---

## 1. Débitos Validados

| ID | Débito | Severidade Original | Severidade Validada | Horas | Prioridade | Impacto UX |
|----|--------|---------------------|---------------------|-------|------------|------------|
| UX-C1 | ChapterReader TOC overlay mobile | CRÍTICO | **CRÍTICO** | 16h | P1 | Feature principal inutilizável em mobile. Drawer colapsável é a solução. |
| UX-C2 | Sidebar sem responsividade | CRÍTICO | **CRÍTICO** | 20h | P1 | App inteiro inutilizável em mobile. Hamburger + drawer é obrigatório. |
| UX-C3 | Search escondido em mobile | CRÍTICO | **ALTO** ↓ | 6h | P2 | Impacto real depende do uso mobile. Search icon que expande é suficiente. |
| UX-C4 | Tabs sem ARIA roles | CRÍTICO | **ALTO** ↓ | 4h | P2 | Violação WCAG real, mas afeta subset de usuários. Fix simples. |
| UX-C5 | Dialog sem focus trap | CRÍTICO | **ALTO** ↓ | 4h | P2 | Violação WCAG. Criar hook useFocusTrap ou usar radix-ui. |
| UX-C6 | Contrast ratio falha | CRÍTICO | **ALTO** ↓ | 3h | P2 | Ajustar muted-foreground de #737373 para #595959. Gold de #c0ac6f para #8a7a4f. |
| UX-C7 | Botões dead-end | CRÍTICO | **ALTO** ↓ | 6h | P2 | "Retomar Estudos" deve ir para último conteúdo acessado. "Portal" remover ou implementar. "Primeiro acesso" remover por ora. |
| UX-H1 | Sem skeleton loaders | ALTO | **ALTO** | 12h | P2 | Criar componente Skeleton base + aplicar em Dashboard, CourseList, ChapterReader. |
| UX-H2 | Erro inconsistente | ALTO | **ALTO** | 8h | P2 | Padronizar: toast para success, inline error para forms, error page para 500/404. |
| UX-H3 | Sem Modal reutilizável | ALTO | **ALTO** | 8h | P2 | Criar componente Modal com focus trap, responsive, variants (sm, md, lg, full). |
| UX-H4 | Sem confirmação destrutiva | ALTO | **ALTO** | 4h | P2 | ConfirmDialog já existe — falta usar em course/chapter/content delete. |
| UX-H5 | Settings save confuso | ALTO | **MÉDIO** ↓ | 6h | P3 | Adicionar "unsaved changes" indicator + auto-save ou save button sticky. |
| UX-H6 | ChapterReader sem breadcrumb | ALTO | **ALTO** | 4h | P2 | Breadcrumb: Curso > Capítulo > Conteúdo. Essencial para orientação. |
| UX-H7 | Dark mode incompleto | ALTO | **MÉDIO** ↓ | 16h | P4 | Recomendo: manter dark mode mas marcar como "beta". Completar após MVP. |
| UX-M1 | Input validation real-time | MÉDIO | **MÉDIO** | 8h | P3 | Adicionar ao FormField component. Validação on blur + on submit. |
| UX-M2 | Sem progress indicator | MÉDIO | **MÉDIO** | 6h | P3 | Upload/sync devem mostrar progress bar. Criar componente ProgressOverlay. |
| UX-M3 | Chat sem formatação | MÉDIO | **MÉDIO** | 8h | P3 | Suportar markdown básico (bold, italic, lists). Usar marked ou react-markdown. |
| UX-M4 | MAX_INTERACTIONS hardcoded | MÉDIO | **BAIXO** ↓ | 2h | P4 | Mover para system_settings. Baixa prioridade. |
| UX-M5 | Sem aria-live | MÉDIO | **ALTO** ↑ | 4h | P2 | Chat messages PRECISAM de aria-live="polite". Notificações também. |
| UX-M6 | Editing mode escondido | MÉDIO | **MÉDIO** | 4h | P3 | Adicionar badge "Modo Edição" ou toolbar visível para instrutores. |
| UX-M7 | TTS não integrado | MÉDIO | **BAIXO** ↓ | 12h | P4 | Feature de nicho. Manter como está por ora. |
| UX-M8 | Tabs affordance baixa | MÉDIO | **MÉDIO** | 3h | P3 | Adicionar background + bottom border no tab ativo. |

---

## 2. Débitos Adicionados

| ID | Débito | Severidade | Horas | Prioridade | Impacto UX |
|----|--------|-----------|-------|------------|------------|
| UX-NEW1 | Sem onboarding/tutorial para novos alunos | ALTO | 12h | P3 | Primeiro uso confuso. Criar tour guiado ou welcome modal. |
| UX-NEW2 | Feedback visual para Socratic Chat insuficiente | ALTO | 8h | P2 | "IA pensando..." precisa ser mais informativo (typing indicator, estimated wait). |
| UX-NEW3 | Course cards sem hover preview | MÉDIO | 6h | P3 | Desktop: hover deveria mostrar resumo do curso. Mobile: press-and-hold. |
| UX-NEW4 | Sem 404/error page dedicada | MÉDIO | 4h | P3 | Rotas inválidas mostram tela branca. Criar error page com navegação. |
| UX-NEW5 | Notificações sem categorização | BAIXO | 8h | P4 | Filtros por tipo (sistema, curso, achievement). |

---

## 3. Respostas ao Architect

### Q1: Mobile é target obrigatório?
**Resposta:** SIM, para estudantes. O perfil de uso indica que alunos acessarão pelo celular frequentemente (estudar no transporte, revisar antes da aula). Para instrutores e admins, desktop é aceitável como primary.

**Recomendação:** Mobile-first para fluxos de STUDENT. Desktop-first para INSTRUCTOR e ADMIN.

### Q2: Sidebar ou bottom tabs para mobile?
**Resposta:** **Bottom tabs para students, hamburger drawer para instructor/admin.**

Razão: Students precisam de acesso rápido a 3-4 items (Dashboard, Cursos, Conquistas, Perfil). Bottom tabs é o padrão mobile. Instrutores têm mais opções → drawer é mais adequado.

### Q3: ChapterReader TOC: drawer ou accordion?
**Resposta:** **Drawer lateral colapsável** (slide-in from left).

- Em desktop: TOC fixo à esquerda (não à direita como está hoje)
- Em tablet: TOC como overlay drawer, toggle button visível
- Em mobile: TOC como bottom sheet ou drawer, acessível via botão flutuante

### Q4: Storybook necessário?
**Resposta:** **Não agora.** Documentação inline com JSDoc + examples no próprio componente é suficiente para a fase atual. Storybook quando o time crescer (>3 devs frontend).

### Q5: Dark mode: completar ou remover?
**Resposta:** **Manter mas marcar como "beta".**

- Adicionar toggle visível (não esconder atrás de module_dark_mode)
- Label "Dark Mode (Beta)"
- Completar gradualmente
- Não investir mais de 4h agora — apenas fixes mais óbvios

---

## 4. Recomendações de Design

### 4.1 Sistema de Navegação Proposto

```
MOBILE (< 768px):
┌──────────────────────────┐
│  Header (simplified)      │
├──────────────────────────┤
│                          │
│  Content Area            │
│                          │
│                          │
├──────────────────────────┤
│  🏠  📚  🏆  👤         │
│  Home Cursos Conq. Perfil│
└──────────────────────────┘

DESKTOP (≥ 1024px):
┌────┬─────────────────────┐
│    │  Header              │
│ S  ├─────────────────────┤
│ I  │                     │
│ D  │  Content Area       │
│ E  │                     │
│ B  │                     │
│ A  │                     │
│ R  │                     │
└────┴─────────────────────┘
```

### 4.2 ChapterReader Redesign

```
DESKTOP:
┌────┬──────────────────┬────────┐
│ TOC│  Content          │ Chat   │
│    │                   │        │
│    │  [texto/video]    │  Q&A   │
│    │                   │        │
│    │  [Questions Grid] │        │
└────┴──────────────────┴────────┘

MOBILE:
┌──────────────────────────┐
│  ← Curso > Cap > Cont    │  ← breadcrumb
├──────────────────────────┤
│                          │
│  Content (full width)    │
│                          │
├──────────────────────────┤
│  [Questions Grid]        │
│  [Chat expandable]       │
├──────────────────────────┤
│ 📋TOC  💬Chat  ❓Q&A    │  ← bottom actions
└──────────────────────────┘
```

### 4.3 Componentes a Criar (Ordem)

1. **Modal** (8h) — Base para tudo
2. **Skeleton** (4h) — Loading states
3. **FormField** (4h) — Wrapper com label + error
4. **BottomSheet** (6h) — Mobile navigation
5. **Breadcrumb** (2h) — Navegação contextual
6. **ErrorPage** (4h) — 404/500 handling

---

## 5. Estimativa Revisada

| Categoria | Items | Horas |
|-----------|-------|-------|
| Critical UX fixes | 2 | 36h |
| High UX fixes | 10 | 63h |
| Medium UX fixes | 8 | 43h |
| Low UX fixes | 4 | 26h |
| New components | 6 | 28h |
| **Total** | **30** | **~196h** |

> **Nota:** Algumas horas se sobrepõem com fixes de código (ex: skeleton loader é dev + design). Esforço real de design: ~60h. Esforço de implementação: ~136h.

---

*@ux-design-expert — Validação concluída*
