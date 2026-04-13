# 18 - Site Administration (Configurações do Sistema)

**Prioridade:** P1 (Sprint 3)
**Persona:** ADMIN
**Funcionalidade:** Configurações gerais do sistema, integrações, backups, logs e manutenção

---

## Wireframe Desktop - Tabs (compacto)

```
TOPBAR: [← Admin] Configurações do Sistema [💾 Salvar Alterações]

TABS: [Geral][Integrações][Segurança][Backups][Performance][Logs]

TAB: "GERAL" (ativo)
┌──────────────────────────────────────────────────────────────────┐
│ INFORMAÇÕES DO SITE                                              │
│ Nome do Site: [Input] HARVEN.AI                                 │
│ URL Base: [Input] https://harven.ai                             │
│ E-mail Admin: [Input] admin@harven.ai                           │
│                                                                  │
│ APARÊNCIA                                                        │
│ Logo: [Upload] [Preview miniatura]                              │
│ Favicon: [Upload] [Preview]                                     │
│ Cor Primária: [#d2ff00] [Color picker]                          │
│ Cor Secundária: [#c0ac6f] [Color picker]                        │
│                                                                  │
│ FUNCIONALIDADES                                                  │
│ ☑ Permitir auto-registro de alunos                              │
│ ☑ Habilitar SSO Microsoft                                       │
│ ☐ Habilitar chat socrático público (sem login)                  │
│ ☑ Processamento automático de conteúdo                          │
│                                                                  │
│ LIMITES E QUOTAS                                                 │
│ Max perguntas por capítulo: [3] (padrão socrático)              │
│ Max upload arquivo: [50] MB                                      │
│ Max alunos por curso: [0] (ilimitado)                           │
│                                                                  │
│ [Salvar Alterações] (#d2ff00)                                   │
└──────────────────────────────────────────────────────────────────┘

TAB: "INTEGRAÇÕES"
┌──────────────────────────────────────────────────────────────────┐
│ MICROSOFT AZURE AD (SSO)                                         │
│ Status: [✓ Conectado] (#28a745)                                 │
│ Tenant ID: [Input] xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx         │
│ Client ID: [Input] xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx         │
│ Client Secret: [Input type=password] ••••••••••••••••           │
│ [Testar Conexão] [Desconectar]                                  │
│                                                                  │
│ MOODLE                                                           │
│ Status: [○ Não Configurado] (#cccccc)                           │
│ URL Moodle: [Input] https://moodle.instituicao.edu.br           │
│ API Token: [Input type=password]                                │
│ [Configurar Integração]                                          │
│                                                                  │
│ OPENAI / AZURE OPENAI                                            │
│ Status: [✓ Conectado] (#28a745)                                 │
│ Provedor: ● OpenAI  ○ Azure OpenAI                              │
│ API Key: [Input type=password] sk-••••••••••••••••••••••        │
│ Modelo: [Dropdown] gpt-4-turbo-preview                          │
│ [Testar API] [Ver Uso/Custos]                                   │
│                                                                  │
│ SMTP (E-mail)                                                    │
│ Status: [✓ Configurado] (#28a745)                               │
│ Servidor: [Input] smtp.gmail.com                                │
│ Porta: [587] ● TLS  ○ SSL                                       │
│ Usuário: [Input] noreply@harven.ai                              │
│ Senha: [Input type=password] ••••••••••                         │
│ [Enviar E-mail de Teste]                                        │
└──────────────────────────────────────────────────────────────────┘

TAB: "SEGURANÇA"
┌──────────────────────────────────────────────────────────────────┐
│ AUTENTICAÇÃO                                                     │
│ ☑ Exigir confirmação de e-mail                                  │
│ ☑ Permitir recuperação de senha                                 │
│ ☑ Two-Factor Authentication (2FA) opcional                      │
│ ☐ Forçar 2FA para administradores                               │
│                                                                  │
│ SESSÕES                                                          │
│ Timeout de sessão: [30] minutos                                 │
│ Tokens JWT expiram em: [24] horas                               │
│ Refresh token expira em: [7] dias                               │
│                                                                  │
│ RATE LIMITING                                                    │
│ Max tentativas login: [5] em [15] minutos                       │
│ Max requests API: [100] por minuto                              │
│ Max uploads: [10] por hora                                      │
│                                                                  │
│ FIREWALL                                                         │
│ IPs Bloqueados: [Textarea] 192.168.1.100, 10.0.0.5              │
│ IPs Permitidos (whitelist): [Textarea]                          │
│                                                                  │
│ [Salvar Configurações de Segurança]                             │
└──────────────────────────────────────────────────────────────────┘

TAB: "BACKUPS"
┌──────────────────────────────────────────────────────────────────┐
│ BACKUP AUTOMÁTICO                                                │
│ Status: [✓ Habilitado] (#28a745)                                │
│ Frequência: ● Diário  ○ Semanal  ○ Mensal                       │
│ Horário: [03:00] AM                                              │
│ Retenção: Manter últimos [30] backups                           │
│                                                                  │
│ DESTINO DO BACKUP                                                │
│ ● Armazenamento local (/backups)                                │
│ ☑ AWS S3 (Bucket: harven-backups-prod)                          │
│ ☐ Google Cloud Storage                                          │
│ ☐ Azure Blob Storage                                            │
│                                                                  │
│ BACKUPS RECENTES                                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ [✓] backup_2025-12-27_03-00.sql.gz  │ 245 MB │ [⬇][🗑]   │  │
│ │ [✓] backup_2025-12-26_03-00.sql.gz  │ 243 MB │ [⬇][🗑]   │  │
│ │ [✓] backup_2025-12-25_03-00.sql.gz  │ 241 MB │ [⬇][🗑]   │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Fazer Backup Agora] [Restaurar de Backup...]                   │
└──────────────────────────────────────────────────────────────────┘

TAB: "PERFORMANCE"
┌──────────────────────────────────────────────────────────────────┐
│ CACHE                                                            │
│ Redis Status: [✓ Conectado] (#28a745)                           │
│ Cache Hit Rate: 94.3% (últimas 24h)                             │
│ Tamanho do Cache: 1.2 GB / 4 GB                                 │
│                                                                  │
│ TTL Padrão: [3600] segundos (1 hora)                            │
│ ☑ Cache de consultas ao banco                                   │
│ ☑ Cache de sessões                                              │
│ ☑ Cache de conteúdo processado                                  │
│                                                                  │
│ [Limpar Cache Completo] [Ver Estatísticas Detalhadas]           │
│                                                                  │
│ OTIMIZAÇÕES                                                      │
│ ☑ Compressão Gzip habilitada                                    │
│ ☑ CDN para assets estáticos                                     │
│ ☑ Lazy loading de imagens                                       │
│ ☑ Minificação de CSS/JS                                         │
│                                                                  │
│ MONITORAMENTO                                                    │
│ CPU Atual: [▓▓▓░░░░░░░] 32%                                     │
│ RAM Usada: [▓▓▓▓▓░░░░░] 58% (4.2 GB / 8 GB)                     │
│ Disco: [▓▓░░░░░░░░] 24% (12 GB / 50 GB)                         │
│ Uptime: 23 dias 14h 32min                                       │
└──────────────────────────────────────────────────────────────────┘

TAB: "LOGS"
┌──────────────────────────────────────────────────────────────────┐
│ FILTROS: [Nível ▼] [Módulo ▼] [Data ▼] [Buscar...]              │
│                                                                  │
│ LOGS DO SISTEMA (tempo real)                                    │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ [ERROR] 2025-12-27 14:35:22 | auth.py:156                  │  │
│ │ Failed login attempt for user maria@email.com               │  │
│ │ IP: 192.168.1.100                                            │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ [INFO] 2025-12-27 14:34:18 | content.py:89                 │  │
│ │ Content processing completed: capitulo-1.pdf                │  │
│ │ Duration: 12.4s                                              │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ [WARN] 2025-12-27 14:30:05 | database.py:234              │  │
│ │ Slow query detected: SELECT * FROM conversations            │  │
│ │ Execution time: 2.3s                                         │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ [INFO] 2025-12-27 14:25:11 | backup.py:45                 │  │
│ │ Automated backup started                                     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [⏸ Pausar] [⬇ Exportar Logs] [🗑 Limpar Logs Antigos]          │
│                                                                  │
│ CONFIGURAÇÕES DE LOG                                             │
│ Nível mínimo: [Dropdown] INFO (DEBUG/INFO/WARN/ERROR)          │
│ Rotação: Arquivar logs a cada [7] dias                         │
│ Retenção: Manter logs por [90] dias                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Mobile (375x812) - versão tabs com scroll

```
[←] Config. Sistema [💾]

TABS (scroll horizontal):
[Geral][Integrações][Seg...][Back...][Perf...][Logs]

TAB ATIVA: "Geral"
┌─────────────────────────────────┐
│ INFORMAÇÕES DO SITE             │
│ Nome: [Input] HARVEN.AI         │
│ URL: [Input] https://...        │
│ E-mail: [Input] admin@...       │
│                                 │
│ APARÊNCIA                       │
│ Logo: [Upload]                  │
│ [Preview miniatura]             │
│ Cor Primária: [#d2ff00] [🎨]   │
│                                 │
│ FUNCIONALIDADES                 │
│ ☑ Auto-registro                 │
│ ☑ SSO Microsoft                 │
│ ☐ Chat público                  │
│                                 │
│ [Salvar] (#d2ff00, full width)  │
└─────────────────────────────────┘
[Scroll vertical...]
```

---

## Casos Especiais

### Teste de Integração (feedback visual)
```
[Testar Conexão]
↓
[Spinner] Testando conexão com Microsoft Azure AD...
↓
[✓ Sucesso!] (#28a745)
Conexão estabelecida com sucesso.
Usuário de teste autenticado.
```

### Restaurar Backup (modal)
```
┌─────────────────────────────────┐
│ Restaurar de Backup             │
├─────────────────────────────────┤
│ ⚠️ ATENÇÃO!                     │
│ Esta ação substituirá TODOS     │
│ os dados atuais.                │
│                                 │
│ Backup selecionado:             │
│ backup_2025-12-26_03-00.sql.gz  │
│ 243 MB                          │
│                                 │
│ Digite "RESTAURAR" para confirm:│
│ [Input]                         │
│                                 │
│ [Cancelar] [Restaurar] (#dc3545)│
└─────────────────────────────────┘
```

### Alerta de Disco Cheio
```
⚠️ ALERTA: Disco 90% cheio!
Espaço disponível: 5 GB / 50 GB
[Ver Detalhes] [Limpar Cache]
```

---

## Cores

- **Status Conectado**: #28a745 (verde)
- **Status Desconectado**: #cccccc (cinza)
- **Status Erro**: #dc3545 (vermelho)
- **Log ERROR**: #dc3545
- **Log WARN**: #ff9800
- **Log INFO**: #0d6efd
- **Log DEBUG**: #6c757d
- **Botões perigosos** (Restaurar, Limpar): #dc3545

---

## Acessibilidade
- **ARIA labels** em todos inputs de senha
- **Keyboard navigation** entre tabs
- **Screen reader** anuncia status de integrações
- **Contraste WCAG AA** em todos logs
- **Confirmações** para ações destrutivas


---


<!-- ORACLE:OBSIDIAN_CONNECTIONS_START -->


## 🧠 Obsidian Connections


**Family:** [[Projetos]]


<!-- ORACLE:OBSIDIAN_CONNECTIONS_END -->