# Story AZM-2.2: Criar Seed Data

> **Epic:** Epic 2 — Database Schema Azure SQL
> **Status:** Draft
> **Priority:** Medium
> **Estimated Points:** 1
> **Owner:** @dev
> **Depends on:** AZM-2.1
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** criar um script de seed data com o admin user e configurações padrão,
**so that** o sistema tenha dados iniciais para funcionar após a criação do schema.

---

## Acceptance Criteria

1. [ ] Arquivo `sql/seed.sql` criado
2. [ ] Admin user default inserido (ra='admin', role='ADMIN', password hash temporário documentado)
3. [ ] System settings default inserido (platform_name='Harven.AI', ai_daily_token_limit=500000)
4. [ ] Seed idempotente: usa `IF NOT EXISTS` para re-execução segura
5. [ ] Seed executado com sucesso no Azure SQL Database

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar arquivo `sql/seed.sql` (AC: 1)
- [ ] Task 2: Inserir admin user (AC: 2)
  - [ ] INSERT INTO users com id=NEWID(), ra='admin', name='Administrador', email='admin@harven.ai', role='ADMIN'
  - [ ] Password hash com bcrypt (hash temporário para trocar em produção)
- [ ] Task 3: Inserir system settings (AC: 3)
  - [ ] INSERT INTO system_settings com platform_name='Harven.AI', ai_daily_token_limit=500000
- [ ] Task 4: Executar seed no Azure SQL (AC: 5)

---

## Dev Notes

**Seed SQL (da arquitetura):**
```sql
-- Admin user padrão (idempotente)
IF NOT EXISTS (SELECT 1 FROM users WHERE ra = 'admin')
BEGIN
    INSERT INTO users (id, ra, name, email, role, password_hash)
    VALUES (
        NEWID(),
        'admin',
        'Administrador',
        'admin@harven.ai',
        'ADMIN',
        '$2b$12$LJ3m4ys5xGfK.dQ8kGz8/.xH8w8zRqV4z2B0N.H0r8Q9xQ0mG6Ky'
    );
END

-- Settings iniciais (idempotente)
IF NOT EXISTS (SELECT 1 FROM system_settings)
BEGIN
    INSERT INTO system_settings (id, platform_name, ai_daily_token_limit)
    VALUES (NEWID(), 'Harven.AI', 500000);
END
```

**Importante:** O password hash acima é temporário (corresponde à senha `admin123`). Em produção, trocar imediatamente após primeiro login via `PUT /users/{id}` com novo password.

### Testing

- Executar após schema.sql
- Validar: `SELECT * FROM users WHERE ra = 'admin'` retorna 1 row
- Validar: `SELECT * FROM system_settings` retorna 1 row com platform_name='Harven.AI'

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |
| 2026-02-28 | 1.2 | Fix referência AC Task 4 (4→5) | River (SM) |

---

## Dev Agent Record

### Agent Model Used
_To be filled by dev agent_

### Debug Log References
_To be filled by dev agent_

### Completion Notes List
_To be filled by dev agent_

### File List
_To be filled by dev agent_

---

## QA Results
_To be filled by QA agent_
