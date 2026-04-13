# Reunião: Integração Moodle + JACAD com Harven.ai

**Data:** 04/03/2026
**Objetivo:** Alinhar requisitos técnicos para integração via API
**Status atual:** Infraestrutura de integração pronta no Harven (rotas, modelos, serviço). Tudo rodando com dados mock — falta conectar nas APIs reais.

---

## 1. MOODLE (LMS)

### 1.1 O que o Harven precisa do Moodle

| # | Operação | Web Service Function | Direção |
|---|----------|---------------------|---------|
| 1 | Verificar conexão | `core_webservice_get_site_info` | Moodle → Harven |
| 2 | Buscar usuários | `core_user_get_users` | Moodle → Harven |
| 3 | Listar cursos | `core_course_get_courses` | Moodle → Harven |
| 4 | Alunos matriculados por curso | `core_enrol_get_enrolled_users` | Moodle → Harven |
| 5 | Notas do aluno | `gradereport_user_get_grades_table` | Moodle → Harven |
| 6 | Exportar sessão socrática (portfolio) | `mod_portfolio_add_entry` | Harven → Moodle |
| 7 | Atualizar notas | `core_grades_update_grades` | Harven → Moodle |

### 1.2 Perguntas para o responsável

- [ ] **Versão do Moodle?** (afeta quais web services estão disponíveis)
- [ ] **Web Services REST estão habilitados?** (Administração > Plugins > Web Services > Gerenciar protocolos)
- [ ] **Podem gerar um Token de serviço** com as permissões da tabela acima?
- [ ] **Plugin de Portfolio** está instalado? (usamos para exportar sessões socráticas como evidência de aprendizado)
- [ ] **Webhook de notas** — é possível configurar para notificar o Harven quando professor dá nota? Eventos: `rating_submitted`, `grade_updated`
- [ ] **Como os alunos são identificados?** Por `user_id` numérico? O campo `idnumber` do Moodle contém o RA do aluno?
- [ ] **Existe Moodle de homologação/teste?**
- [ ] **CORS/Firewall** — o servidor aceita requisições externas na API REST?
- [ ] **Rate limits** — há limite de requisições?

### 1.3 O que preciso receber

- [ ] URL do Moodle (ex: `https://moodle.escola.com.br`)
- [ ] Token de web service com permissões
- [ ] Lista de web services habilitados
- [ ] Secret para webhook (se suportado)
- [ ] Confirmação de como o RA aparece no Moodle (campo `idnumber` ou outro)

### 1.4 Anotações da reunião (Moodle)

> _Use este espaço para anotar respostas durante a conversa_
>
> Versão do Moodle: _______________
> URL: _______________
> Web Services habilitados? ( ) Sim ( ) Não ( ) Parcial
> Token recebido? ( ) Sim ( ) Vai enviar depois
> Portfolio instalado? ( ) Sim ( ) Não
> Webhook possível? ( ) Sim ( ) Não
> Campo do RA no Moodle: _______________
> Ambiente de teste: _______________
> Observações: _______________

---

## 2. JACAD (Sistema Acadêmico)

> **Nota:** Verificar se o responsável pelo Moodle também cuida do JACAD. Se não, pedir o contato de quem cuida.

### 2.1 O que o Harven precisa consumir do JACAD

| # | Dado | Endpoint esperado | Para quê |
|---|------|-------------------|----------|
| 1 | Dados do aluno por RA | `GET /students/{ra}` | Login e cadastro automático |
| 2 | Matrículas do aluno | `GET /students/{ra}/enrollments` | Vincular aluno às disciplinas |
| 3 | Lista de disciplinas | `GET /disciplines` | Sincronizar disciplinas |
| 4 | Alunos por disciplina | `GET /disciplines/{id}/students` | Popular turmas |
| 5 | Health check | `GET /health` | Monitorar conexão |

### 2.2 Perguntas para o responsável

- [ ] **O JACAD expõe API REST?** Se sim, qual a URL base e onde está a documentação?
- [ ] **Autenticação:** API Key, OAuth2, ou Basic Auth?
- [ ] **Formato dos dados do aluno:** quais campos retornam? Precisamos de: `ra`, `nome`, `email`, `cpf`, `curso`
- [ ] **Código da disciplina:** o campo código é estável e único? (usamos como chave de mapeamento)
- [ ] **Frequência de atualização:** dados mudam em tempo real ou há janelas?
- [ ] **Existe ambiente de homologação/sandbox?**
- [ ] **Rate limits?**
- [ ] **Webhook disponível?** Notifica matrícula nova ou trancamento?

### 2.3 O que preciso receber

- [ ] URL base da API (produção e homologação)
- [ ] Credenciais de acesso (API Key ou equivalente)
- [ ] Documentação dos endpoints
- [ ] Mapeamento de campos (nomes no JSON de retorno)
- [ ] Contato técnico para dúvidas

### 2.4 Anotações da reunião (JACAD)

> _Use este espaço para anotar respostas durante a conversa_
>
> Responsável é o mesmo do Moodle? ( ) Sim ( ) Não → Contato: _______________
> Tem API REST? ( ) Sim ( ) Não ( ) Não sabe
> URL: _______________
> Tipo de auth: _______________
> Ambiente de teste: _______________
> Campos do aluno disponíveis: _______________
> Observações: _______________

---

## 3. PONTO CRÍTICO: Mapeamento de Identidade (RA)

O elo entre os 3 sistemas é o **RA (Registro Acadêmico)**:

```
JACAD (ra) ←→ Harven (jacad_ra) ←→ Moodle (idnumber ou custom field)
```

**Perguntar:**

- [ ] O RA do JACAD é o mesmo valor que está no campo `idnumber` do Moodle?
- [ ] Se não, existe outro campo em comum entre os dois?
- [ ] Quem é a "fonte da verdade" para dados do aluno — JACAD ou Moodle?

### Anotações (Mapeamento)

> RA é o mesmo nos dois sistemas? ( ) Sim ( ) Não
> Campo em comum: _______________
> Fonte da verdade: ( ) JACAD ( ) Moodle
> Observações: _______________

---

## 4. Variáveis de Ambiente que precisaremos configurar

Após a reunião, com as credenciais em mãos:

```env
# MOODLE
MOODLE_ENABLED=true
MOODLE_URL=https://moodle.escola.com.br
MOODLE_TOKEN=__token_recebido__
MOODLE_WEBHOOK_SECRET=__secret_recebido__
MOODLE_SYNC_FREQUENCY=manual
MOODLE_EXPORT_FORMAT=xapi
MOODLE_AUTO_EXPORT=false
MOODLE_PORTFOLIO_ENABLED=true
MOODLE_RATING_ENABLED=true

# JACAD
JACAD_ENABLED=true
JACAD_URL=https://jacad.escola.com.br/api
JACAD_API_KEY=__key_recebida__
JACAD_SYNC_FREQUENCY=manual
JACAD_AUTO_CREATE_USERS=true
JACAD_SYNC_ENROLLMENTS=true
```

---

## 5. Próximos Passos (preencher pós-reunião)

| # | Ação | Responsável | Prazo | Status |
|---|------|-------------|-------|--------|
| 1 | Receber credenciais Moodle | Resp. Moodle | | ( ) Pendente |
| 2 | Receber credenciais JACAD | Resp. JACAD | | ( ) Pendente |
| 3 | Configurar variáveis no backend | Dev | | ( ) Pendente |
| 4 | Adaptar client JACAD p/ API real | Dev | | ( ) Pendente |
| 5 | Testar conexão Moodle | Dev | | ( ) Pendente |
| 6 | Testar conexão JACAD | Dev | | ( ) Pendente |
| 7 | Primeira sync de disciplinas | Dev + Resp. | | ( ) Pendente |
| 8 | Primeira sync de alunos | Dev + Resp. | | ( ) Pendente |
| 9 | Testar export sessão → Moodle | Dev + Prof. | | ( ) Pendente |
| 10 | Configurar webhook de notas | Resp. Moodle | | ( ) Pendente |

---

## 6. Ordem de Prioridade Sugerida

1. **JACAD leitura** — desbloqueia login por RA e criação automática de turmas
2. **Moodle leitura** — buscar alunos e cursos para validar mapeamento de IDs
3. **Moodle escrita** — export de sessões socráticas e atualização de notas

---

*Documento gerado por Atlas (Analyst Agent) — Harven.ai*
