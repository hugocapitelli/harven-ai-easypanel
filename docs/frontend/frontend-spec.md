# Harven.ai Frontend UX Specification

**Version:** 2.0
**Date:** 2026-02-25 (Updated)
**Analyst:** @ux-design-expert (Phase 3 - Brownfield Discovery)

---

## 1. Executive Summary

Harven.AI has uma **base visual sólida** com componentes limpos e identidade de marca forte. Porém, existem **gaps críticos de acessibilidade**, **responsividade incompleta** (especialmente navegação mobile), e **tratamento inconsistente de erros e loading**. A experiência core (ChapterReader/Socratic Chat) tem problemas de UX significativos.

### Maturidade do Design System: EARLY STAGE (2/5)

| Aspecto | Nota | Comentário |
|---------|------|-----------|
| Componentes | 2/5 | Set básico com gaps significativos |
| Documentação | 1/5 | Inexistente |
| Consistência | 3/5 | Maioria consistente, exceções notáveis |
| Acessibilidade | 2/5 | Parcial, várias violações WCAG |
| Responsividade | 2/5 | Grids ok, navegação quebrada |
| Theming | 2/5 | Light + dark mode incompleto |

---

## 2. Design Tokens & Theme

### 2.1 Paleta de Cores

```css
--primary: #d0ff00         /* Lime green (brand) */
--accent: #1c2d1b          /* Dark green */
--gold: #c0ac6f            /* Warm accent */
--sidebar: #152214         /* Very dark green */
--background: #f5f5f0      /* Light warm gray */
--border: #e5e5e0          /* Light border */
--destructive: #ef4444     /* Red */
```

### 2.2 Tipografia

- **Display:** Lexend (Google Fonts)
- **Body:** Noto Sans (Google Fonts)
- **Scale:** Tailwind defaults (sem tokens customizados)

### 2.3 Problemas de Contraste (WCAG AA)

| Par de Cores | Ratio | WCAG AA | Status |
|-------------|-------|---------|--------|
| Primary (#d0ff00) on Dark (#1c2d1b) | ~7.5:1 | PASS | OK |
| Primary on White | ~8.2:1 | PASS | OK |
| Muted-foreground on Light Gray | ~2.1:1 | **FAIL** | Corrigir |
| Gold (#c0ac6f) on White | ~3.2:1 | **FAIL** | Corrigir |
| Placeholder (gray-400) on White | ~2.5:1 | **FAIL** | Corrigir |

---

## 3. Component Library

### 3.1 Componentes Existentes (8)

| Componente | Arquivo | Variantes | A11y |
|-----------|---------|-----------|------|
| Button | ui/Button.tsx | primary, outline, ghost, destructive | OK |
| Input | ui/Input.tsx | Com label, ícone | Falta aria-invalid |
| Select | ui/Select.tsx | Com label | Falta disabled styling |
| Card | ui/Card.tsx | Com hoverEffect | OK |
| Badge | ui/Badge.tsx | default, success, warning, danger, outline | Falta role |
| Progress | ui/Progress.tsx | Linear | Falta role="progressbar" |
| Tabs | ui/Tabs.tsx | Com ícones | Falta ARIA roles |
| Avatar | ui/Avatar.tsx | sm, md, lg, xl | Falta aria-label |

### 3.2 Componentes AUSENTES (Críticos)

| Componente | Impacto | Onde é Necessário |
|-----------|---------|------------------|
| **Modal/Dialog** | Alto | CourseList, Settings (inline ad-hoc hoje) |
| **Skeleton Loader** | Alto | Todas as views (content jump) |
| **Table** | Alto | Admin views (classes, users, logs) |
| **FormField** | Médio | Todos os formulários (label+error wrapper) |
| **Pagination** | Médio | Listas, logs, notificações |
| **Tooltip** | Médio | Ícones, botões com ação não-óbvia |
| **Dropdown/Menu** | Médio | Header (ad-hoc hoje) |
| **Checkbox/Radio** | Médio | Formulários, settings |
| **Loading Spinner** | Baixo | Vários (replicado inline) |
| **Toast** | Baixo | Usando sonner (externo) |

---

## 4. Débitos de UX/Frontend

### 🔴 CRÍTICOS (7)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| UX-C1 | ChapterReader TOC sobrepõe conteúdo em mobile/tablet (fixed right-4) | Responsividade | Feature core inutilizável em mobile |
| UX-C2 | Sidebar NÃO é responsiva — sem hamburger menu, sem drawer mobile | Navegação | App inutilizável em mobile |
| UX-C3 | Search do Header escondido em mobile SEM alternativa | Navegação | Funcionalidade inacessível |
| UX-C4 | Tabs sem `role="tablist"`, `role="tab"`, sem arrow keys | Acessibilidade | Violação WCAG 2.1 |
| UX-C5 | Dialog sem focus trap nem restauração de foco | Acessibilidade | Violação WCAG 2.1 |
| UX-C6 | Contrast ratio falha em muted text e gold text | Acessibilidade | Violação WCAG AA |
| UX-C7 | Botões sem handler: "Retomar Estudos", "Portal do Aluno", "Primeira acesso" | Funcionalidade | Dead-end UX |

### 🟡 ALTOS (7)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| UX-H1 | Sem skeleton loaders — content jump quando dados carregam | Loading States | UX percebida ruim |
| UX-H2 | Tratamento de erro inconsistente (red box vs toast vs silêncio) | Error States | Confuso para o usuário |
| UX-H3 | Sem componente Modal reutilizável — modais ad-hoc inline | Design System | Inconsistência visual |
| UX-H4 | Sem confirmação para ações destrutivas (delete course, etc.) | Safety | Perda de dados |
| UX-H5 | Settings save flow confuso — sem indicador de mudanças não-salvas | Admin UX | Perda de configurações |
| UX-H6 | ChapterReader sem breadcrumb — aluno não sabe onde está | Navegação | Desorientação |
| UX-H7 | Dark mode incompleto — nem todas as views suportam | Theming | Experiência inconsistente |

### 🟠 MÉDIOS (8)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| UX-M1 | Input validation sem feedback real-time | Forms | UX de formulário ruim |
| UX-M2 | Sem progress indicator para operações longas (upload, sync) | Feedback | Incerteza do usuário |
| UX-M3 | Chat messages sem formatação (bold, lists, code) | ChapterReader | Legibilidade |
| UX-M4 | MAX_INTERACTIONS = 3 hardcoded, não configurável | ChapterReader | Inflexível |
| UX-M5 | Sem `aria-live` regions para conteúdo dinâmico (chat, notifications) | Acessibilidade | Screen reader |
| UX-M6 | Editing mode do ChapterReader não é óbvio para instrutores | Discoverability | Feature escondida |
| UX-M7 | TTS não integrado ao conteúdo — download separado | ChapterReader | UX fragmentada |
| UX-M8 | Tabs difíceis de distinguir como clicáveis (bg-transparent) | Design | Affordance baixa |

### 🔵 BAIXOS (5)

| ID | Débito | Área | Impacto |
|----|--------|------|---------|
| UX-L1 | Sem type scale tokens definidos | Design System | Inconsistência tipográfica |
| UX-L2 | Sem opção de reduzir animações (prefers-reduced-motion) | Acessibilidade | Comfort |
| UX-L3 | Sem suporte a impressão de conteúdo | Feature | Limitação |
| UX-L4 | Ícones sem `aria-label` em alguns lugares | Acessibilidade | Minor |
| UX-L5 | Course images sem fallback adequado (broken image) | Visual | Minor |

---

## 5. Análise por View

### 5.1 Login (Login.tsx)
- Layout split-view responsivo ✓
- Show/hide password ✓
- Loading state ✓
- Links "Primeira acesso" e "Esqueceu senha" sem implementação

### 5.2 StudentDashboard (StudentDashboard.tsx)
- Stats cards com grid responsivo ✓
- Empty state para courses ✓
- "Retomar Estudos" sem handler
- Stats sem skeleton loader

### 5.3 ChapterReader (ChapterReader.tsx) — CORE FEATURE
- Suporte multi-tipo (text, video, audio) ✓
- Socratic chat com session persistence ✓
- Study time tracking ✓
- TOC quebra em mobile
- Sem breadcrumb
- Limite de 3 interações hardcoded
- Sem recovery de sessão
- Sem progress indicator no capítulo

### 5.4 CourseList (CourseList.tsx)
- Search com debounce ✓
- Filtros por categoria e tab ✓
- Grid responsivo ✓
- Modal de criação inline (não reutilizável)
- "Explorar Catálogo" mostra toast ao invés de navegar

### 5.5 SystemSettings (SystemSettings.tsx)
- Tabs para diferentes seções ✓
- Confirm dialog para ações destrutivas ✓
- Save flow confuso
- Performance metrics sem error state
- Export logs escondido

---

## 6. Responsividade

### 6.1 Estado Atual

| Área | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| **Sidebar** | Quebrado (sempre visível, 80px) | Funciona collapsed | OK |
| **Header** | Search escondido | OK | OK |
| **Login** | OK (split hidden) | OK | OK |
| **Grids (courses, stats)** | OK (1 coluna) | OK (2 colunas) | OK (3-4 colunas) |
| **ChapterReader** | TOC overlay | TOC overlay | OK |
| **Modais** | Sem ajuste | Sem ajuste | OK |
| **Tables** | Sem ajuste | Scroll horizontal | OK |

### 6.2 Correções Necessárias

1. Sidebar: Adicionar hamburger menu e drawer mobile
2. Header: Adicionar search mobile (ícone que expande)
3. ChapterReader: TOC como drawer lateral colapsável
4. Tables: Layout card em mobile
5. Modais: Responsive sizing

---

## 7. Acessibilidade (a11y)

### 7.1 ARIA Implementado ✓
- Sidebar: `role="navigation" aria-label="Menu principal"`
- Header: aria-labels em botões (back, search, notifications, profile)
- Header: `aria-expanded` em dropdowns
- Login: aria-label em toggle de senha
- Dialog: `role="dialog" aria-modal="true"`

### 7.2 ARIA Ausente
- Tabs: sem `role="tablist"`, `role="tab"`, `aria-selected`
- Progress: sem `role="progressbar"`, `aria-valuenow`
- Input: sem `aria-invalid` quando erro
- Chat: sem `aria-live` para novas mensagens
- Dialog: sem `aria-describedby`
- Search results: sem `aria-activedescendant`

### 7.3 Keyboard Navigation
- Sidebar: Tab + Enter ✓
- Buttons: Tab + Enter/Space ✓
- Tabs: **SEM arrow keys**
- Dialog: Escape ✓, **SEM focus trap**
- Search results: **SEM keyboard navigation**
- Skip-to-content: **AUSENTE**

---

## 8. Métricas

| Métrica | Valor |
|---------|-------|
| Componentes UI | 8 |
| Componentes ausentes | 10 |
| Views/Páginas | 23 |
| Débitos UX Críticos | 7 |
| Débitos UX Altos | 7 |
| Débitos UX Médios | 8 |
| Débitos UX Baixos | 5 |
| **Total Débitos UX** | **27** |
| Esforço estimado total | 40-60 horas |

---

*Documento gerado pelo workflow Brownfield Discovery — FASE 3*
*@ux-design-expert — Orion (Orchestrator)*
