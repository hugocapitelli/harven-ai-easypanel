# QA Fix Request v4 — Brownfield Discovery Fixes

**Data:** 2026-02-25
**Origem:** Brownfield Discovery Assessment (10 fases)
**Scope:** Backend security, database integrity, frontend UX/a11y, performance
**Nota:** Itens de .env excluidos (versao de testes)

---

## Ordem de Execucao

Seguir os blocos na ordem. Dentro de cada bloco, a ordem dos fixes e a recomendada.

---

## BLOCO 1 — BACKEND SECURITY (Prioridade Maxima)

### FIX-V4-001: Remover JWT secret hardcoded fallback
**Severity:** CRITICAL | **File:** `backend/main.py` | **Effort:** Small

O backend tem um fallback hardcoded para o JWT secret que compromete toda a autenticacao se a env var nao estiver definida.

**Encontrar (~linha 45):**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    logger.warning("JWT_SECRET_KEY not set...")
    SECRET_KEY = "harven-dev-secret-change-in-production"
```

**Substituir por:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("FATAL: JWT_SECRET_KEY environment variable is required. Set it before starting the server.")
```

---

### FIX-V4-002: Restringir CORS
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Small

CORS esta com wildcard em methods e headers, aumentando risco de CSRF.

**Encontrar (~linha 293-294):**
```python
allow_methods=["*"],
allow_headers=["*"],
```

**Substituir por:**
```python
allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
```

---

### FIX-V4-003: Remover plaintext password fallback
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Medium

O login tem um fallback que compara senhas em plaintext, vulneravel a timing attacks.

**Encontrar o bloco de login (~linha 486-491) que faz comparacao legacy:**
```python
legacy_password = user.get('password_hash') or user.get('password', '')
if legacy_password != data.password:
    raise HTTPException(status_code=401, detail="Senha incorreta")
```

**Substituir por (remover fallback plaintext, manter apenas bcrypt):**
```python
# Only bcrypt verification - no plaintext fallback
password_hash = user.get('password_hash') or user.get('password', '')
if not password_hash or not pwd_context.verify(data.password, password_hash):
    raise HTTPException(status_code=401, detail="Senha incorreta")
```

**Nota:** Se houver usuarios com senhas em plaintext no banco, criar um script de migracao que faca hash de todas as senhas antes de aplicar este fix:
```python
# One-time migration script (run before deploying fix)
users = supabase.table("users").select("id, password, password_hash").execute()
for user in users.data:
    pwd = user.get('password_hash') or user.get('password', '')
    if pwd and not pwd.startswith('$2b$'):  # Not bcrypt
        hashed = pwd_context.hash(pwd)
        supabase.table("users").update({"password_hash": hashed}).eq("id", user['id']).execute()
```

---

### FIX-V4-004: Remover debug logging sensivel
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Medium

Multiplos `print()` de debug expoe senhas e dados sensiveis em stdout.

**Acao:** Buscar e remover/substituir TODOS os patterns abaixo:

1. `print(f"DEBUG:` — Remover todas as linhas com este pattern
2. `print(f"Resposta Supabase:` — Remover (loga response completa incluindo passwords)
3. `print(f"Buscando RA:` — Substituir por `logger.debug(f"Login attempt for RA: {data.ra[:4]}***")`
4. Qualquer `print()` que logue `response.data` de tabelas com dados sensiveis

**Regra:** Nenhum `print()` deve permanecer no codigo. Usar `logger.info/debug/error` com dados sanitizados.

---

### FIX-V4-005: Adicionar request size limit global
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Small

Sem limite global, qualquer endpoint aceita payloads enormes (DDoS).

**Adicionar middleware apos CORS (~linha 296):**
```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            # Allow larger size only for upload endpoints
            if "/upload" not in request.url.path and "/image" not in request.url.path:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large. Max size: {self.max_size // (1024*1024)}MB"}
                )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)
```

---

### FIX-V4-006: Validar conexao DB no startup
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Small

Backend inicia silenciosamente sem conexao com o banco.

**Encontrar no lifespan (~linha 124-136):**
```python
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Conectado ao cliente Supabase")
except Exception as e:
    logger.error(f"Erro ao conectar ao Supabase: {e}", exc_info=True)
```

**Adicionar verificacao ativa:**
```python
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Verify connection is actually working
    test = supabase.table("system_settings").select("id").limit(1).execute()
    logger.info("Supabase connected and verified")
except Exception as e:
    logger.critical(f"Failed to connect to Supabase: {e}", exc_info=True)
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError(f"Cannot start without database connection: {e}")
    else:
        logger.warning("Starting without DB connection (development mode)")
```

---

### FIX-V4-007: Expandir rate limiting
**Severity:** MEDIUM | **File:** `backend/main.py` | **Effort:** Medium

Apenas login, upload e AI tem rate limiting. Adicionar nos demais.

**Adicionar decorator `@limiter.limit()` nos seguintes endpoints:**

| Endpoint | Limite |
|----------|--------|
| `GET /admin/*` | `"30/minute"` |
| `POST /users` | `"10/minute"` |
| `POST /users/batch` | `"5/minute"` |
| `DELETE /courses/{id}` | `"10/minute"` |
| `DELETE /chapters/{id}` | `"10/minute"` |
| `DELETE /contents/{id}` | `"10/minute"` |
| `GET /search` | `"30/minute"` |
| `POST /admin/force-logout` | `"3/minute"` |
| `POST /admin/clear-cache` | `"3/minute"` |
| `POST /integrations/*/sync` | `"5/minute"` |

---

## BLOCO 2 — DATABASE (Indexes + Integridade)

### FIX-V4-008: Criar indexes de alta prioridade
**Severity:** CRITICAL | **Executar no Supabase SQL Editor** | **Effort:** Small

Sem indexes, login faz full table scan. Quick win com maior ROI do assessment inteiro.

**SQL a executar:**
```sql
-- Auth (CRITICAL - every login does full scan)
CREATE INDEX IF NOT EXISTS idx_users_ra ON users(ra);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Content hierarchy (HIGH - every page load)
CREATE INDEX IF NOT EXISTS idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_contents_chapter_id ON contents(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_content_id ON questions(content_id);

-- Junction tables (HIGH - enrollment queries)
CREATE INDEX IF NOT EXISTS idx_discipline_teachers_teacher ON discipline_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_discipline_teachers_discipline ON discipline_teachers(discipline_id);
CREATE INDEX IF NOT EXISTS idx_discipline_students_student ON discipline_students(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_students_discipline ON discipline_students(discipline_id);

-- Chat & notifications (MEDIUM - user-facing queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_content ON chat_sessions(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Admin (MEDIUM - admin dashboard)
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, action);
```

**Verificacao:** Apos criar, rodar:
```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE ra = 'test123';
-- Deve mostrar "Index Scan" ao inves de "Seq Scan"
```

---

### FIX-V4-009: Adicionar unique constraints em junction tables
**Severity:** HIGH | **Executar no Supabase SQL Editor** | **Effort:** Small

Sem unique constraint, duplicatas de enrollment podem ser criadas silenciosamente.

**SQL a executar:**
```sql
-- Remove duplicates first (keep latest)
DELETE FROM discipline_teachers a
USING discipline_teachers b
WHERE a.id < b.id
  AND a.discipline_id = b.discipline_id
  AND a.teacher_id = b.teacher_id;

DELETE FROM discipline_students a
USING discipline_students b
WHERE a.id < b.id
  AND a.discipline_id = b.discipline_id
  AND a.student_id = b.student_id;

-- Add unique constraints
ALTER TABLE discipline_teachers
  ADD CONSTRAINT uq_discipline_teacher UNIQUE (discipline_id, teacher_id);

ALTER TABLE discipline_students
  ADD CONSTRAINT uq_discipline_student UNIQUE (discipline_id, student_id);
```

**Apos aplicar**, atualizar backend para tratar erro de duplicata graciosamente:
```python
# Em POST /disciplines/{id}/teachers e /students
try:
    response = supabase.table("discipline_teachers").insert(data).execute()
except Exception as e:
    if "duplicate" in str(e).lower() or "unique" in str(e).lower():
        raise HTTPException(status_code=409, detail="Professor ja esta vinculado a esta disciplina")
    raise
```

---

### FIX-V4-010: Fix race condition no chat counter
**Severity:** MEDIUM | **File:** `backend/main.py` | **Effort:** Small

Counter de mensagens usa read-then-write, perde incrementos em concorrencia.

**Encontrar (~linha 4044-4047):**
```python
session = supabase.table("chat_sessions").select("total_messages").eq("id", session_id).single().execute()
current_count = session.data.get('total_messages', 0) if session.data else 0
supabase.table("chat_sessions").update({"total_messages": current_count + 1}).eq("id", session_id).execute()
```

**Opcao 1 — Criar RPC no Supabase SQL Editor:**
```sql
CREATE OR REPLACE FUNCTION increment_message_count(p_session_id UUID)
RETURNS void AS $$
  UPDATE chat_sessions
  SET total_messages = COALESCE(total_messages, 0) + 1
  WHERE id = p_session_id;
$$ LANGUAGE SQL;
```

**E no backend substituir por:**
```python
supabase.rpc("increment_message_count", {"p_session_id": session_id}).execute()
```

**Opcao 2 — Se RPC nao for viavel, usar update direto:**
```python
# Skip the read, just increment
supabase.table("chat_sessions").update({
    "total_messages": "total_messages + 1"  # PostgREST won't support this directly
}).eq("id", session_id).execute()
```
Opcao 1 e preferivel.

---

### FIX-V4-011: Fix N+1 queries em /users/{id}/stats
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Medium

Endpoint faz 7 queries sequenciais. Consolidar em 2.

**Encontrar a funcao get_user_stats (~linha 3396-3434).**

**Substituir por versao otimizada:**
```python
async def get_user_stats(user_id: str):
    """Optimized: 2 queries instead of 7"""
    try:
        # Query 1: All activities for this user (single query)
        activities_resp = supabase.table("user_activities") \
            .select("action, created_at, metadata") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        activities = activities_resp.data or []

        # Calculate all stats from the single result set
        completed_courses = [a for a in activities if a.get('action') == 'course_completed']
        started_courses = [a for a in activities if a.get('action') == 'course_started']
        time_activities = [a for a in activities if a.get('metadata', {}).get('time_spent')]
        quiz_activities = [a for a in activities if a.get('action') == 'quiz_completed']

        total_time = sum(
            a.get('metadata', {}).get('time_spent', 0)
            for a in time_activities
        )
        quiz_scores = [
            a.get('metadata', {}).get('score', 0)
            for a in quiz_activities
        ]

        # Query 2: Course progress (optional)
        progress_resp = supabase.table("course_progress") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()

        return {
            "courses_completed": len(completed_courses),
            "courses_started": len(started_courses),
            "total_activities": len(activities),
            "total_study_time_minutes": total_time,
            "last_activity": activities[0].get('created_at') if activities else None,
            "average_quiz_score": sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0,
            "course_progress": progress_resp.data or []
        }
    except Exception as e:
        logger.error(f"Error fetching user stats: {e}")
        return {
            "courses_completed": 0, "courses_started": 0,
            "total_activities": 0, "total_study_time_minutes": 0,
            "last_activity": None, "average_quiz_score": 0,
            "course_progress": []
        }
```

---

### FIX-V4-012: Adicionar pagination em list endpoints
**Severity:** HIGH | **File:** `backend/main.py` | **Effort:** Medium

Maioria dos endpoints de listagem retorna TODOS os registros sem limite.

**Para cada endpoint abaixo, adicionar parametros page/per_page:**

Endpoints a corrigir:
- `GET /courses`
- `GET /users`
- `GET /disciplines/{id}/students`
- `GET /disciplines/{id}/teachers`
- `GET /courses/{id}/chapters` (com contents)
- `GET /notifications/{user_id}`

**Pattern a seguir (ja existe em /disciplines):**
```python
@app.get("/courses", tags=["Courses"])
async def list_courses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    offset = (page - 1) * per_page

    response = supabase.table("courses") \
        .select("*", count="exact") \
        .range(offset, offset + per_page - 1) \
        .order("created_at", desc=True) \
        .execute()

    return {
        "data": response.data or [],
        "total": response.count or 0,
        "page": page,
        "per_page": per_page,
        "total_pages": -(-response.count // per_page) if response.count else 0
    }
```

**Nota para frontend:** Atualizar `services/api.ts` para passar `page` e `per_page` nas chamadas de listagem. Inicialmente manter `per_page=100` para nao quebrar a UI ate componentes de paginacao serem implementados.

---

## BLOCO 3 — FRONTEND: RESPONSIVIDADE (Mobile)

### FIX-V4-013: Sidebar responsiva com hamburger menu
**Severity:** CRITICAL | **File:** `harven.ai-platform-mockup/components/Sidebar.tsx` + `App.tsx` | **Effort:** Large

Sidebar e visivel em TODOS os viewports, tornando o app inutilizavel em mobile.

**Alteracoes necessarias:**

**1. Sidebar.tsx — Adicionar comportamento mobile:**
- Em telas `< 768px`: sidebar deve ser escondida por padrao
- Adicionar overlay (backdrop) quando sidebar aberta em mobile
- Fechar ao clicar fora ou pressionar Escape

**Implementar:**
```tsx
// Sidebar.tsx - adicionar logica responsiva
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userRole: string;
  // ... existing props
}

// Wrapper com overlay para mobile
<>
  {/* Backdrop for mobile */}
  {isOpen && (
    <div
      className="fixed inset-0 bg-black/50 z-30 md:hidden"
      onClick={onToggle}
    />
  )}

  {/* Sidebar */}
  <aside
    className={cn(
      "fixed top-0 left-0 h-full z-40 transition-transform duration-300",
      "bg-harven-sidebar text-white",
      // Desktop: always visible
      "md:translate-x-0",
      // Mobile: slide in/out
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      isOpen ? "w-64" : "w-16 md:w-16"
    )}
    role="navigation"
    aria-label="Menu principal"
  >
    {/* ... existing content */}
  </aside>
</>
```

**2. Header.tsx — Adicionar hamburger button:**
```tsx
// No inicio do Header, antes do titulo
<button
  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
  onClick={onToggleSidebar}
  aria-label="Abrir menu"
>
  <span className="material-symbols-outlined">menu</span>
</button>
```

**3. App.tsx — Gerenciar estado:**
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);

// Close sidebar on route change (mobile)
useEffect(() => {
  if (window.innerWidth < 768) {
    setSidebarOpen(false);
  }
}, [location.pathname]);
```

**Verificacao:**
- [ ] Em 375px: sidebar escondida, hamburger visivel
- [ ] Em 768px+: sidebar visivel como antes
- [ ] Backdrop fecha sidebar ao clicar
- [ ] Escape fecha sidebar

---

### FIX-V4-014: Search acessivel em mobile
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/components/Header.tsx` | **Effort:** Small

Search esta `hidden md:flex`, sem alternativa mobile.

**Encontrar (~linha 328):**
```tsx
<div className="hidden md:flex ...">
```

**Substituir por search expandivel:**
```tsx
// State
const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

// Mobile search icon (visible only on mobile)
<button
  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
  aria-label="Pesquisar"
>
  <span className="material-symbols-outlined">search</span>
</button>

// Desktop search (existing, keep hidden md:flex)
<div className="hidden md:flex ...">
  {/* existing search */}
</div>

// Mobile search bar (full width, below header)
{mobileSearchOpen && (
  <div className="absolute top-full left-0 right-0 p-3 bg-white dark:bg-gray-900 border-b shadow-lg md:hidden z-50">
    <input
      type="text"
      placeholder="Pesquisar..."
      className="w-full px-4 py-2 rounded-lg border"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      autoFocus
    />
    {/* Search results dropdown */}
  </div>
)}
```

---

### FIX-V4-015: ChapterReader TOC responsivo
**Severity:** CRITICAL | **File:** `harven.ai-platform-mockup/components/chapter-reader/TableOfContents.tsx` + `views/ChapterReader.tsx` | **Effort:** Medium

TOC usa `fixed right-4` que sobrepoe conteudo em mobile.

**Redesign:**
- Desktop (>=1024px): TOC fixo a esquerda do conteudo
- Tablet (768-1023px): TOC como drawer lateral, toggle button
- Mobile (<768px): TOC como bottom sheet ou drawer, botao flutuante

**Implementar:**

**ChapterReader.tsx — Layout responsivo:**
```tsx
<div className="flex flex-col lg:flex-row">
  {/* TOC - Desktop: sidebar fixo, Mobile: drawer */}
  <div className={cn(
    "lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto",
    "fixed inset-0 z-50 lg:relative lg:z-auto",
    showToc ? "block" : "hidden lg:block"
  )}>
    {/* Backdrop mobile */}
    <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={() => setShowToc(false)} />
    <div className="relative z-10 bg-white dark:bg-gray-900 h-full w-72 lg:w-full">
      <TableOfContents headings={headings} onClose={() => setShowToc(false)} />
    </div>
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    {/* ... existing content ... */}
  </div>
</div>

{/* FAB for TOC on mobile */}
<button
  className="fixed bottom-20 right-4 z-40 lg:hidden bg-primary text-accent p-3 rounded-full shadow-lg"
  onClick={() => setShowToc(true)}
  aria-label="Indice"
>
  <span className="material-symbols-outlined">toc</span>
</button>
```

---

### FIX-V4-016: Breadcrumb no ChapterReader
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/views/ChapterReader.tsx` | **Effort:** Small

Aluno nao sabe onde esta dentro da hierarquia de conteudo.

**Adicionar no topo do ChapterReader:**
```tsx
{/* Breadcrumb */}
<nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4 overflow-x-auto" aria-label="Breadcrumb">
  <button onClick={() => navigate(`/course/${courseId}`)} className="hover:text-primary whitespace-nowrap">
    {courseName}
  </button>
  <span className="material-symbols-outlined text-xs">chevron_right</span>
  <button onClick={() => navigate(`/course/${courseId}/chapter/${chapterId}`)} className="hover:text-primary whitespace-nowrap">
    {chapterName}
  </button>
  <span className="material-symbols-outlined text-xs">chevron_right</span>
  <span className="text-foreground font-medium whitespace-nowrap">{contentTitle}</span>
</nav>
```

**Nota:** `courseName` e `chapterName` precisam ser carregados junto com o conteudo. Se nao estiverem disponiveis no state, buscar via API ou passar como parametros de rota.

---

### FIX-V4-017: Fix dead-end buttons
**Severity:** HIGH | **Files:** Multiplos | **Effort:** Small

Botoes que nao fazem nada, confundindo o usuario.

**1. StudentDashboard.tsx — "Retomar Estudos" (~linha 75):**
```tsx
// Encontrar o botao "Retomar Estudos" e adicionar onClick
<button
  onClick={() => {
    // Navigate to last accessed content
    const lastActivity = activities.find(a => a.action === 'content_viewed');
    if (lastActivity?.metadata?.content_url) {
      navigate(lastActivity.metadata.content_url);
    } else {
      navigate('/courses');
    }
  }}
>
  Retomar Estudos
</button>
```

**2. Sidebar.tsx — "Portal do Aluno" (~linha 133):**
- Se nao existe portal externo: **REMOVER** o link inteiro
- Se existe: substituir `href="#"` pela URL real

**3. Login.tsx — "Primeira acesso" (~linha 148):**
- Se nao existe fluxo de primeiro acesso: **REMOVER** o link
- Se existe: implementar navegacao para rota de registro

**4. Login.tsx — "Esqueceu sua senha?" (~linha 112):**
- Se endpoint de reset existe: implementar navegacao
- Se nao existe: mostrar toast "Entre em contato com o administrador"

---

## BLOCO 4 — FRONTEND: ACESSIBILIDADE (WCAG)

### FIX-V4-018: Tabs com ARIA roles
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/components/ui/Tabs.tsx` | **Effort:** Small

Tabs nao tem ARIA semantico, violando WCAG 2.1.

**Adicionar ao componente Tabs:**
```tsx
// TabList wrapper
<div role="tablist" aria-label={ariaLabel} className="flex ...">
  {tabs.map((tab, index) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => setActiveTab(tab.id)}
      onKeyDown={(e) => {
        // Arrow key navigation
        if (e.key === 'ArrowRight') {
          const next = tabs[(index + 1) % tabs.length];
          setActiveTab(next.id);
          document.getElementById(`tab-${next.id}`)?.focus();
        }
        if (e.key === 'ArrowLeft') {
          const prev = tabs[(index - 1 + tabs.length) % tabs.length];
          setActiveTab(prev.id);
          document.getElementById(`tab-${prev.id}`)?.focus();
        }
      }}
      className={cn(
        "px-4 py-2 border-b-2 transition-colors",
        activeTab === tab.id
          ? "border-primary text-primary font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>

// Tab panel
<div
  role="tabpanel"
  id={`panel-${activeTab}`}
  aria-labelledby={`tab-${activeTab}`}
>
  {children}
</div>
```

---

### FIX-V4-019: Dialog com focus trap
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/components/ConfirmDialog.tsx` | **Effort:** Small

Dialog nao prende o foco nem restaura ao fechar.

**Adicionar hook useFocusTrap:**
```tsx
// hooks/useFocusTrap.ts (novo arquivo)
import { useEffect, useRef } from 'react';

export function useFocusTrap(isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement as HTMLElement;

    const element = ref.current;
    if (!element) return;

    const focusable = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  return ref;
}
```

**Usar no ConfirmDialog:**
```tsx
import { useFocusTrap } from '../hooks/useFocusTrap';

function ConfirmDialog({ isOpen, ... }) {
  const trapRef = useFocusTrap(isOpen);

  return isOpen ? (
    <div className="fixed inset-0 z-50 ...">
      <div ref={trapRef} role="dialog" aria-modal="true" ...>
        {/* existing content */}
      </div>
    </div>
  ) : null;
}
```

---

### FIX-V4-020: Contrast fixes
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/index.css` | **Effort:** Small

Cores muted e gold falham WCAG AA contrast ratio.

**Encontrar e ajustar no index.css:**
```css
/* Muted foreground: de #737373 para #595959 (ratio 7:1 em branco) */
--color-muted-foreground: #595959;

/* Gold: de #c0ac6f para #8a7a4f (ratio 4.6:1 em branco) */
--color-harven-gold: #8a7a4f;
```

**Tambem ajustar placeholders globalmente:**
```css
/* index.css — adicionar */
input::placeholder,
textarea::placeholder {
  color: #6b7280; /* gray-500, ratio 4.6:1 */
}
```

---

### FIX-V4-021: aria-live para conteudo dinamico
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/components/chapter-reader/SocraticChat.tsx` | **Effort:** Small

Mensagens do chat nao sao anunciadas por screen readers.

**Adicionar na area de mensagens:**
```tsx
<div
  className="flex flex-col gap-3 overflow-y-auto"
  role="log"
  aria-live="polite"
  aria-label="Mensagens do dialogo socratico"
>
  {messages.map(msg => (
    <div key={msg.id} className={cn(...)}>
      {msg.content}
    </div>
  ))}
</div>
```

**Tambem no Header (notifications dropdown):**
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {unreadCount > 0 && `${unreadCount} novas notificacoes`}
</div>
```

---

## BLOCO 5 — FRONTEND: LOADING & ERROR STATES

### FIX-V4-022: Criar componente Skeleton loader
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/components/ui/Skeleton.tsx` (novo) | **Effort:** Small

Nao existe componente de skeleton. Content jump quando dados carregam.

**Criar:**
```tsx
// components/ui/Skeleton.tsx
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  );
}

// Variants
export function SkeletonCard() {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
```

**Aplicar em StudentDashboard, CourseList, e ChapterReader nos estados de loading.**

---

### FIX-V4-023: Padronizar error handling no frontend
**Severity:** HIGH | **File:** `harven.ai-platform-mockup/services/api.ts` + views | **Effort:** Medium

Erro tratado de formas inconsistentes (red box, toast, silencio).

**Definir padrao:**
- **Toast success**: Para acoes que completam (save, create, delete)
- **Toast error**: Para erros de rede/servidor em operacoes de background
- **Inline error**: Para erros de formulario (validacao, login)
- **Error page**: Para 404/500 em navegacao

**Criar helper:**
```tsx
// lib/error-handler.ts
import { toast } from 'sonner';

export function handleApiError(error: any, context?: string) {
  const message = error.response?.data?.detail
    || error.message
    || 'Erro inesperado. Tente novamente.';

  if (context) {
    toast.error(`Erro ao ${context}: ${message}`);
  } else {
    toast.error(message);
  }

  console.error(`[API Error] ${context || 'Unknown'}:`, error);
}
```

**Usar nas views:**
```tsx
try {
  await coursesApi.delete(courseId);
  toast.success('Curso removido com sucesso');
} catch (error) {
  handleApiError(error, 'remover curso');
}
```

---

### FIX-V4-024: Adicionar confirmacao para acoes destrutivas
**Severity:** HIGH | **Files:** Views com delete | **Effort:** Small

Delete de curso, capitulo, conteudo nao pede confirmacao.

**Em cada view com botao de delete, adicionar ConfirmDialog:**
```tsx
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

// Botao de delete
<button onClick={() => setDeleteTarget(item.id)}>Excluir</button>

// Dialog
<ConfirmDialog
  isOpen={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={async () => {
    await api.delete(deleteTarget);
    setDeleteTarget(null);
    toast.success('Removido com sucesso');
    refreshData();
  }}
  title="Confirmar exclusao"
  message="Tem certeza que deseja excluir? Esta acao nao pode ser desfeita."
  variant="danger"
  confirmLabel="Excluir"
/>
```

**Views a corrigir:**
- CourseEdit.tsx (delete course)
- ChapterDetail.tsx (delete chapter)
- ContentCreation.tsx / ChapterReader.tsx (delete content)
- UserManagement.tsx (delete user, se existir)

---

## BLOCO 6 — BACKEND: ARQUITETURA (Lower Priority)

### FIX-V4-025: Resolver Pydantic models duplicados
**Severity:** MEDIUM | **File:** `backend/main.py` | **Effort:** Small

Dois `DisciplineCreate` models com campos diferentes. O segundo sobrescreve o primeiro.

**Encontrar as duas definicoes de DisciplineCreate e unificar:**
```python
class DisciplineCreate(BaseModel):
    title: str
    code: str
    department: str = ""
    description: str = ""
```

Remover a segunda definicao. Verificar que os endpoints usam os campos corretos.

---

### FIX-V4-026: Usar Supabase relations ao inves de manual joins
**Severity:** MEDIUM | **File:** `backend/main.py` | **Effort:** Medium

Multiplos endpoints fazem 2 queries (fetch IDs + fetch by IDs) ao inves de usar PostgREST relations.

**Pattern atual (2 queries):**
```python
response = supabase.table("discipline_teachers").select("teacher_id").eq("discipline_id", id).execute()
teacher_ids = [row['teacher_id'] for row in response.data]
users_response = supabase.table("users").select("*").in_("id", teacher_ids).execute()
```

**Substituir por (1 query):**
```python
response = supabase.table("discipline_teachers") \
    .select("*, users!teacher_id(id, name, email, role, avatar_url)") \
    .eq("discipline_id", id) \
    .execute()

teachers = [row['users'] for row in response.data if row.get('users')]
```

**Endpoints a migrar:**
- `GET /disciplines/{id}/teachers`
- `GET /disciplines/{id}/students`
- `GET /courses/{id}/chapters` (com contents)
- `GET /courses/{id}/export`

**Nota:** Testar com Supabase relations syntax. Se FK nao existir no banco, a relacao precisa ser configurada no Supabase dashboard antes.

---

## Resumo

| Bloco | Fixes | Severity | Effort Total |
|-------|-------|----------|-------------|
| **1. Backend Security** | 7 | 1 CRITICAL + 5 HIGH + 1 MED | ~20h |
| **2. Database** | 5 | 1 CRITICAL + 3 HIGH + 1 MED | ~18h |
| **3. Frontend Mobile** | 5 | 2 CRITICAL + 3 HIGH | ~32h |
| **4. Frontend A11y** | 4 | 4 HIGH | ~8h |
| **5. Frontend States** | 3 | 3 HIGH | ~12h |
| **6. Backend Arch** | 2 | 2 MEDIUM | ~8h |
| **TOTAL** | **26** | **4C + 18H + 4M** | **~98h** |

### Quick Wins (< 2h cada, alto impacto):
- FIX-V4-001: JWT secret (CRITICAL, 30min)
- FIX-V4-002: CORS (HIGH, 30min)
- FIX-V4-008: Indexes SQL (CRITICAL, 1h de SQL)
- FIX-V4-020: Contrast CSS (HIGH, 30min)
- FIX-V4-021: aria-live (HIGH, 30min)

---

*Fix Request gerado pelo workflow Brownfield Discovery*
*@qa + @architect — Orion (Orchestrator) — 2026-02-25*
