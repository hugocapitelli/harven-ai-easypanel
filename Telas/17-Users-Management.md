# 17 - Users Management (Gerenciamento de Usuários)

**Prioridade:** P0 (Sprint 3)
**Persona:** ADMIN
**Funcionalidade:** CRUD completo de usuários, atribuição de roles e permissões

---

## Wireframe Desktop - Tabela (compacto)

```
TOPBAR: [← Admin] Usuários [+ Novo Usuário] [🔍][⬇ Importar CSV]

FILTROS: [Buscar...] [Role ▼] [Status ▼] [Data Cadastro ▼]

TABELA:
┌──────────────────────────────────────────────────────────────────────────────┐
│ □ │Avatar│Nome          │Email           │Role    │Status │Último│Ações    │
├──────────────────────────────────────────────────────────────────────────────┤
│ □ │[Av]  │Maria Silva   │maria@email.com │Student │[✓Ativ]│Hoje  │[E][D][•]│
│ □ │[Av]  │João Santos   │joao@email.com  │Teacher │[✓Ativ]│Há 2d │[E][D][•]│
│ □ │[Av]  │Ana Costa     │ana@email.com   │Student │[○Inat]│30d   │[E][D][•]│
│ □ │[Av]  │Carlos Lima   │carlos@email.com│Admin   │[✓Ativ]│Há 1h │[E][D][•]│
└──────────────────────────────────────────────────────────────────────────────┘

SELEÇÃO MÚLTIPLA: [✓ 2 selecionados] [Ações em Lote ▼]
PAGINAÇÃO: [← Anterior] [1][2][3]...[50] [Próxima →] | 1.247 usuários total
```

---

## Modal "Novo Usuário / Editar"

```
┌─────────────────────────────────────────┐
│ Criar Novo Usuário                      │
├─────────────────────────────────────────┤
│ Dados Pessoais:                         │
│ Nome Completo: [Input]                  │
│ E-mail: [Input] maria.silva@email.com   │
│ RA/Matrícula: [Input] 202401234         │
│                                         │
│ Senha Inicial:                          │
│ ○ Enviar link para criar senha (email) │
│ ● Gerar senha automática                │
│ ○ Definir senha: [Input][Mostrar]      │
│                                         │
│ Role (Função):                          │
│ ● Student (Aluno)                       │
│ ○ Teacher (Professor)                   │
│ ○ Admin (Administrador)                 │
│                                         │
│ Status:                                 │
│ ● Ativo (pode fazer login)              │
│ ○ Inativo (conta bloqueada)             │
│                                         │
│ [Se Teacher selecionado:]               │
│ Atribuir a Disciplinas:                 │
│ ☑ Introdução ao Agronegócio             │
│ ☐ Sustentabilidade Rural                │
│ ☐ Marketing Digital                     │
│                                         │
│ [Se Student selecionado:]               │
│ Matricular em Cursos:                   │
│ ☑ Módulo 1: Fundamentos                 │
│ ☑ Módulo 2: Mercado                     │
│ ☐ Curso Avançado X                      │
│                                         │
│ Notificações:                           │
│ ☑ Enviar e-mail de boas-vindas          │
│                                         │
│ [Cancelar] [Criar Usuário] (#d2ff00)    │
└─────────────────────────────────────────┘
```

---

## Ações do Menu (•••)

```
┌─────────────────────────┐
│ Ver Perfil Completo     │
│ Editar Usuário          │
│ Resetar Senha           │
│ Alterar Role            │
│ Ver Atividades          │
│ Enviar E-mail           │
│ ───────────────────     │
│ Desativar Conta         │
│ Excluir Usuário         │
└─────────────────────────┘
```

---

## Bulk Actions (Ações em Lote)

```
[✓ 3 selecionados] [Ações ▼]
┌─────────────────────────┐
│ Ativar Selecionados     │
│ Desativar Selecionados  │
│ Alterar Role...         │
│ Matricular em Curso...  │
│ Enviar E-mail...        │
│ Exportar Lista          │
│ ───────────────────     │
│ Excluir Selecionados    │
└─────────────────────────┘
```

---

## Importar CSV

```
┌─────────────────────────────────────────┐
│ Importar Usuários via CSV               │
├─────────────────────────────────────────┤
│ [📁 Drop zone ou Browse]                │
│ Arraste o arquivo CSV ou clique         │
│                                         │
│ Formato esperado:                       │
│ nome,email,ra,role,status               │
│ Maria Silva,maria@...,001,student,ativo │
│                                         │
│ [Baixar Modelo CSV]                     │
│                                         │
│ Arquivo selecionado:                    │
│ usuarios_2025.csv (245 linhas)          │
│                                         │
│ Opções:                                 │
│ ☑ Ignorar primeira linha (cabeçalho)   │
│ ☑ Enviar e-mail de boas-vindas          │
│ ☐ Atualizar se e-mail já existe        │
│                                         │
│ [Cancelar] [Importar] (#d2ff00)         │
└─────────────────────────────────────────┘
```

---

## Mobile (375x812)

```
[←] Usuários [+][🔍][•••]

[Buscar...] [Filtros ▼]

┌─────────────────────────────────┐
│ [Avatar] Maria Silva            │
│ maria@email.com                 │
│ Student • RA: 202401234         │
│ [✓ Ativo] • Último: Hoje        │
│ [Editar] [•••]                  │
└─────────────────────────────────┘
[Scroll vertical...]

1.247 usuários total
[Carregar mais...]
```

---

## Casos Especiais

### Usuário Inativo (highlight)
```
┌─────────────────────────────────┐
│ [Avatar] Ana Costa              │
│ ana@email.com                   │
│ [○ Inativo há 30 dias] ⚠️       │
│                                 │
│ Último acesso: 01/11/2025       │
│ [Reativar Conta] (#d2ff00)      │
└─────────────────────────────────┘
```

### Resetar Senha

```
┌─────────────────────────────────┐
│ Resetar Senha                   │
│ Usuário: Maria Silva            │
├─────────────────────────────────┤
│ Escolha uma opção:              │
│                                 │
│ ● Enviar link de reset por email│
│   Para: maria@email.com         │
│                                 │
│ ○ Gerar senha temporária        │
│   Será exibida na tela          │
│                                 │
│ [Cancelar] [Resetar] (#d2ff00)  │
└─────────────────────────────────┘
```

### Confirmação de Exclusão

```
┌─────────────────────────────────┐
│ Excluir Usuário?                │
├─────────────────────────────────┤
│ Tem certeza que deseja excluir: │
│ Maria Silva (maria@email.com)?  │
│                                 │
│ ⚠️ Esta ação NÃO pode ser       │
│    desfeita.                    │
│                                 │
│ O que será excluído:            │
│ • Dados do usuário              │
│ • Histórico de conversas        │
│ • Progresso em cursos           │
│                                 │
│ Digite "EXCLUIR" para confirmar:│
│ [Input]                         │
│                                 │
│ [Cancelar] [Excluir] (#dc3545)  │
└─────────────────────────────────┘
```

---

## Cores e Estados

- **Status Ativo**: Badge verde #28a745
- **Status Inativo**: Badge cinza #cccccc + ⚠️
- **Role Student**: Badge azul #0d6efd
- **Role Teacher**: Badge roxo #6f42c1
- **Role Admin**: Badge vermelho #dc3545
- **Último acesso > 30 dias**: Highlight amarelo #fff3cd


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->