# 15 - Courses Management (Admin - Gerenciamento Global de Cursos)

**Prioridade:** P1 (Sprint 3)
**Persona:** ADMIN
**Funcionalidade:** Visão administrativa global de todos os cursos do sistema

---

## Wireframe Desktop - Grid View (compacto)

```
TOPBAR: [← Admin] Gerenciamento de Cursos [+ Novo Curso] [🔍][Grid/Lista]

FILTROS: [Buscar...] [Disciplina ▼] [Professor ▼] [Status ▼] [Ordenar ▼]

GRID 4 COLUNAS:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ CARD CURSO   │ │ CARD CURSO   │ │ CARD CURSO   │ │ CARD CURSO   │
│ [Imagem 16:9]│ │              │ │              │ │              │
│              │ │              │ │              │ │              │
│ Módulo 1:    │ │ Módulo 2:    │ │ Curso X      │ │ Curso Y      │
│ Fundamentos  │ │ Mercado      │ │              │ │              │
│              │ │              │ │              │ │              │
│ 📚 Agronegóc.│ │ 📚 Sustentab.│ │              │ │              │
│ 👤 Prof. João│ │ 👤 Prof.Maria│ │              │ │              │
│ 👥 67 alunos │ │ 👥 54 alunos │ │              │ │              │
│ [▓▓▓▓░] 72%  │ │ [▓▓▓░] 48%   │ │              │ │              │
│              │ │              │ │              │ │              │
│ [✓ Ativo]    │ │ [○ Rascunho] │ │              │ │              │
│ [Editar][•••]│ │ [Editar][•••]│ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

PAGINAÇÃO: [← Anterior] [1][2][3]...[10] [Próxima →]
```

---

## Wireframe Desktop - List View (tabela)

```
TABELA:
┌────────────────────────────────────────────────────────────────────────┐
│ Curso              │Discipl.│Professor│Alunos│Progresso│Status│Ações  │
├────────────────────────────────────────────────────────────────────────┤
│ [📖]Módulo 1:Funda.│Agro    │João S.  │ 67   │[▓▓▓▓]72%│[✓]   │[E][D] │
│ [📖]Módulo 2:Merc. │Sustent.│Maria C. │ 54   │[▓▓▓]48% │[○]   │[E][D] │
│ [📖]Curso Básico   │Marketin│Ana P.   │ 23   │[▓▓]35%  │[✓]   │[E][D] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Principais

### Filtros
- **Busca**: Input full-text search
- **Disciplina**: Dropdown multi-select
- **Professor**: Dropdown com avatares
- **Status**: Ativo/Rascunho/Arquivado
- **Ordenar**: Nome, Data, Alunos, Progresso

### Card de Curso (Grid)
- Imagem/ícone
- Título curso
- Badge disciplina
- Info professor
- Nº alunos
- Barra de progresso
- Badge status
- Botões: Editar, Menu (•••)

### Ações do Menu (•••)
```
┌─────────────────────────┐
│ Ver Detalhes            │
│ Editar Curso            │
│ Ver Alunos              │
│ Duplicar Curso          │
│ Atribuir Professor      │
│ ───────────────────     │
│ Arquivar/Desativar      │
│ Excluir                 │
└─────────────────────────┘
```

---

## Mobile (375x812)

```
[←] Cursos [+][🔍][•••]

[Buscar...] [Filtros ▼]

LISTA (sempre cards em mobile):
┌─────────────────────────────────┐
│ CARD CURSO                      │
│ 📖 Módulo 1: Fundamentos        │
│ 📚 Agronegócio • 👤 Prof. João  │
│ 👥 67 alunos • [▓▓▓▓] 72%       │
│ [✓ Ativo]                       │
│ [Editar] [•••]                  │
└─────────────────────────────────┘
[Scroll...]
```

---

## Casos Especiais

### Nenhum Curso Encontrado
```
[🔍 ícone grande]
Nenhum curso encontrado
Ajuste os filtros ou crie um novo
[+ Criar Curso]
```

### Bulk Actions (seleção múltipla)
```
[✓ 3 selecionados] [Ações em Lote ▼]
┌─────────────────────────┐
│ Publicar Todos          │
│ Atribuir Professor...   │
│ Mover para Disciplina...│
│ Arquivar Selecionados   │
│ Excluir Selecionados    │
└─────────────────────────┘
```

---

## Cores
- Cards: #ffffff, border #e0e0e0
- Status Ativo: Badge #28a745
- Status Rascunho: Badge #cccccc
- Botões: #d2ff00 (primário)


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->