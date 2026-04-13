# Relatorio de Debito Tecnico — Harven.AI

**Projeto:** Harven.AI Platform
**Data:** 2026-02-25
**Versao:** 1.0
**Metodologia:** Brownfield Discovery (Synkra AIOS)

---

## Executive Summary

### Situacao Atual

O Harven.AI e uma plataforma educacional funcional com frontend React, backend FastAPI e banco Supabase. A plataforma suporta tres perfis (Aluno, Instrutor, Admin) e conta com um sistema de dialogo socratico alimentado por IA como diferencial principal.

A auditoria completa identificou **65 debitos tecnicos** acumulados durante o desenvolvimento rapido. Os mais graves sao **vulnerabilidades de seguranca** que impedem um deploy seguro em producao, incluindo ausencia de politicas de seguranca no banco de dados e credenciais expostas no repositorio de codigo.

A plataforma funciona adequadamente em desktop mas apresenta **problemas significativos de usabilidade mobile**, o que impacta diretamente o publico-alvo principal (alunos que acessam pelo celular).

### Numeros Chave

| Metrica | Valor |
|---------|-------|
| Total de Debitos | 65 |
| Debitos Criticos | 8 |
| Debitos Altos | 22 |
| Esforco Total | 340 horas |
| Custo Estimado (R$150/h) | R$ 51.000 |

### Recomendacao

Investir imediatamente na resolucao dos 8 debitos criticos de seguranca (Sprint 1, ~48 horas, R$ 7.200) para viabilizar producao segura. Em seguida, resolver problemas de mobile e performance em 3 sprints adicionais. O custo total de resolucao e significativamente menor que o custo potencial de um incidente de seguranca.

---

## Analise de Custos

### Custo de RESOLVER

| Categoria | Horas | Custo (R$150/h) |
|-----------|-------|-----------------|
| Seguranca (Sprint 1) | 48h | R$ 7.200 |
| Integridade de Dados (Sprint 2) | 48h | R$ 7.200 |
| Mobile + Performance (Sprint 3) | 48h | R$ 7.200 |
| Acessibilidade (Sprint 4) | 48h | R$ 7.200 |
| Arquitetura (Sprint 5-6) | 80h | R$ 12.000 |
| Debitos medios/baixos | 68h | R$ 10.200 |
| **TOTAL** | **340h** | **R$ 51.000** |

### Custo de NAO RESOLVER (Risco Acumulado)

| Risco | Probabilidade | Impacto | Custo Potencial |
|-------|---------------|---------|-----------------|
| Vazamento de dados (sem RLS + keys expostas) | Alta | Critico | R$ 200.000+ |
| Credential abuse (API keys expostas no git) | Alta | Critico | R$ 50.000+ |
| Perda de dados por falta de integridade | Media | Alto | R$ 30.000 |
| Abandono de usuarios (mobile quebrado) | Alta | Alto | R$ 80.000/ano |
| Performance degradada (sem indexes) | Alta | Medio | R$ 20.000/ano |
| Dificuldade de manutencao (monolito) | Media | Medio | R$ 40.000/ano |

**Custo potencial de nao agir: R$ 420.000+**

---

## Impacto no Negocio

### Seguranca
- **8 vulnerabilidades criticas** identificadas
- Banco de dados acessivel sem restricao via URL publica
- Credenciais de producao (API keys, DB keys) expostas no repositorio
- **Impacto:** Risco de vazamento de dados de todos os usuarios

### Experiencia do Usuario
- **App inutilizavel em mobile** para alunos (sidebar, search, content reader)
- Funcionalidade principal (Socratic Chat) limitada em telas pequenas
- Problemas de acessibilidade (violacoes WCAG AA)
- **Impacto:** Estimativa de 40% de reducao na adocao por alunos

### Performance
- Login faz full table scan (sem index em campo de busca)
- Endpoints com ate 9 queries sequenciais para uma unica requisicao
- Sem paginacao na maioria das listagens
- **Impacto:** Degradacao proporcional ao crescimento de dados

### Manutencao
- Backend monolitico de 4.779 linhas (81 rotas em um unico arquivo)
- Zero testes automatizados
- Sem sistema de migrations para banco de dados
- **Impacto:** Cada nova feature leva 2-3x mais tempo que o necessario

---

## Timeline Recomendado

### Sprint 1: Quick Wins + Seguranca (1 semana)
- Remover credenciais do repositorio
- Corrigir vulnerabilidades de autenticacao
- Criar indexes no banco (performance imediata)
- Implementar politicas de seguranca (RLS)
- **Custo:** R$ 7.200
- **ROI:** Elimina riscos de R$ 250.000+

### Sprint 2: Integridade + Mobile (1 semana)
- Adicionar restricoes de integridade no banco
- Tornar sidebar responsiva (hamburger menu)
- Criar migration baseline
- **Custo:** R$ 7.200
- **ROI:** Habilita mobile + protege dados

### Sprint 3: Performance + UX (1 semana)
- Corrigir reader de conteudo para mobile
- Eliminar queries redundantes
- Criar componentes UI reutilizaveis
- **Custo:** R$ 7.200
- **ROI:** Melhoria de 3-5x em performance

### Sprint 4: Acessibilidade (1 semana)
- Corrigir violacoes WCAG
- Adicionar estados de loading/error
- Adicionar paginacao
- **Custo:** R$ 7.200
- **ROI:** Compliance + UX

### Sprint 5-6: Arquitetura (2 semanas)
- Refatorar backend em modulos
- Criar suite de testes
- **Custo:** R$ 12.000
- **ROI:** Velocidade de desenvolvimento +100%

---

## ROI da Resolucao

| Investimento | Retorno Esperado |
|--------------|------------------|
| R$ 51.000 (resolucao total) | R$ 420.000+ (riscos evitados) |
| 340 horas | +100% velocidade de desenvolvimento |
| 6 semanas | Produto seguro e sustentavel |

**ROI Estimado: 8:1**

> Para cada R$ 1 investido em resolucao de debitos, evita-se R$ 8 em riscos e custos futuros.

---

## Proximos Passos

1. [ ] **URGENTE:** Remover .env.production do repositorio e rotacionar credenciais
2. [ ] Aprovar orcamento de R$ 51.000 para resolucao completa
3. [ ] Definir equipe tecnica (1-2 developers full-time por 6 semanas)
4. [ ] Iniciar Sprint 1 (Seguranca) — bloqueante para producao
5. [ ] Validar estado real do banco Supabase antes dos fixes

---

## Anexos

- [Assessment Tecnico Completo](../prd/technical-debt-assessment.md)
- [Arquitetura do Sistema](../architecture/system-architecture.md)
- [Auditoria de Database](../../supabase/docs/DB-AUDIT.md)
- [Especificacao Frontend/UX](../frontend/frontend-spec.md)
- [Review Database Specialist](../reviews/db-specialist-review.md)
- [Review UX Specialist](../reviews/ux-specialist-review.md)
- [Review QA](../reviews/qa-review.md)

---

*Relatorio gerado pelo workflow Brownfield Discovery*
*@analyst — Orion (Orchestrator)*
