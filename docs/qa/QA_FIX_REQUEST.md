# QA Fix Request: Platform Code Review

**Generated:** 2026-02-12
**QA Report Source:** Full platform code review (backend + frontend)
**Reviewer:** Quinn (Test Architect)

---

## Instructions for @dev

Fix ONLY the issues listed below. Do not add features or refactor unrelated code.

**Process:**

1. Read each issue carefully
2. Fix the specific problem described
3. Verify using the verification steps provided
4. Mark the issue as fixed in this document: `[ ]` → `[x]`
5. Run all tests before marking complete

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 12 | **10 fixed** (FIX-CR-008 RLS requires Supabase dashboard) |
| MAJOR | 9 | Pending — Phase 2 |
| MINOR | 4 | Pending — Phase 3 |

---

## Issues to Fix

---

### 1. [CRITICAL] Authentication bypass — password check disabled

**Issue ID:** FIX-CR-001

**Location:** `backend/main.py:388-400`

**Problem:**
```python
if user.get('password_hash') != data.password and user.get('password') != data.password:
    pass  # raise HTTPException commented out
# ...
return {"token": "fake-jwt-token-for-local-dev", ...}
```

**Expected:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# On login:
if not pwd_context.verify(data.password, user.get('password_hash', '')):
    raise HTTPException(status_code=401, detail="Senha incorreta")

# Generate real JWT:
from jose import jwt
token = jwt.encode({"sub": user["id"], "role": user["role"], "exp": datetime.utcnow() + timedelta(hours=24)}, SECRET_KEY, algorithm="HS256")
return {"token": token, ...}
```

**Verification:**
- [ ] Wrong password returns 401
- [ ] Correct password returns valid JWT with expiration
- [ ] Token contains user ID and role claims
- [ ] bcrypt or argon2 used for password hashing

**Status:** [x] Fixed

---

### 2. [CRITICAL] No authorization middleware — any user can access admin routes

**Issue ID:** FIX-CR-002

**Location:** `backend/main.py` — all admin/instructor endpoints

**Problem:**
Endpoints like `/admin/settings`, `/admin/stats`, `force_logout_all_users` have no role check. Any authenticated (or unauthenticated) user can call them.

**Expected:**
```python
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido")

def require_role(*roles):
    async def role_checker(user = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado")
        return user
    return role_checker

# Usage:
@app.get("/admin/stats")
async def get_admin_stats(user = Depends(require_role("ADMIN"))):
    ...
```

**Verification:**
- [ ] Admin endpoints return 401 without token
- [ ] Admin endpoints return 403 for STUDENT role
- [ ] Admin endpoints return 200 for ADMIN role
- [ ] Instructor endpoints return 403 for STUDENT role

**Status:** [x] Fixed

---

### 3. [CRITICAL] API secrets exposed to frontend

**Issue ID:** FIX-CR-003

**Location:** `backend/main.py:641-671` — `GET /admin/settings`

**Problem:**
Settings response includes `openai_key`, `moodle_token`, `smtp_password`, `elevenlabs_key` as plaintext to any caller.

**Expected:**
```python
SENSITIVE_FIELDS = {"openai_key", "moodle_token", "smtp_password", "elevenlabs_key", "gemini_key"}

@app.get("/admin/settings")
async def get_settings(user = Depends(require_role("ADMIN"))):
    settings = fetch_settings()
    # Mask sensitive fields
    for field in SENSITIVE_FIELDS:
        if field in settings and settings[field]:
            settings[field] = "••••" + settings[field][-4:]
    return settings
```

**Verification:**
- [ ] Non-admin users cannot access settings
- [ ] API keys are masked in response (show only last 4 chars)
- [ ] Full keys are NEVER sent to frontend

**Status:** [x] Fixed

---

### 4. [CRITICAL] XSS via dangerouslySetInnerHTML without sanitization

**Issue ID:** FIX-CR-004

**Location:** `harven.ai-platform-mockup/src/views/ChapterReader.tsx:1408`, `ContentRevision.tsx:509`

**Problem:**
```tsx
<div dangerouslySetInnerHTML={{ __html: content }} />
```
User/API-provided HTML rendered without sanitization.

**Expected:**
```bash
npm install dompurify @types/dompurify
```
```tsx
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

**Verification:**
- [ ] Install DOMPurify dependency
- [ ] All `dangerouslySetInnerHTML` calls use `DOMPurify.sanitize()`
- [ ] Test with `<img src=x onerror=alert(1)>` — must be stripped

**Status:** [x] Fixed

---

### 5. [CRITICAL] GEMINI_API_KEY exposed in frontend bundle

**Issue ID:** FIX-CR-005

**Location:** `harven.ai-platform-mockup/vite.config.ts:14-15`

**Problem:**
```typescript
define: {
  'import.meta.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```
API key is embedded in the client-side JavaScript bundle, visible to anyone.

**Expected:**
Remove the key from vite.config. Create a backend proxy endpoint:
```python
@app.post("/api/ai/gemini/proxy")
async def gemini_proxy(request: dict, user = Depends(get_current_user)):
    # Call Gemini API server-side
    ...
```

**Verification:**
- [ ] `GEMINI_API_KEY` removed from vite.config.ts
- [ ] No API keys in frontend bundle (`npm run build && grep -r "AIza" dist/`)
- [ ] AI calls routed through backend proxy

**Status:** [x] Fixed

---

### 6. [CRITICAL] SQL injection risk in search queries

**Issue ID:** FIX-CR-006

**Location:** `backend/main.py:1064, 3266-3332`

**Problem:**
```python
search_term = f"%{q}%"
query = query.or_(f"msg.ilike.%{query}%,author.ilike.%{query}%")
```
User input interpolated directly into query filter strings.

**Expected:**
```python
import re

def sanitize_search(q: str) -> str:
    """Remove special SQL/ilike characters"""
    return re.sub(r'[%_\\]', '', q.strip())[:100]

search_term = f"%{sanitize_search(q)}%"
```

**Verification:**
- [ ] Search input sanitized (remove `%`, `_`, `\`)
- [ ] Input length capped (max 100 chars)
- [ ] Test with `%' OR 1=1--` — must return no results, no error

**Status:** [x] Fixed

---

### 7. [CRITICAL] Plaintext passwords in database

**Issue ID:** FIX-CR-007

**Location:** `users` table in Supabase, `backend/main.py` user creation endpoints

**Problem:**
Passwords stored as plaintext in the `password` or `password_hash` column without actual hashing.

**Expected:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# On user creation:
hashed = pwd_context.hash(data.password)
supabase.table("users").insert({"password_hash": hashed, ...}).execute()
```
Also run a one-time migration to hash all existing passwords.

**Verification:**
- [ ] New users created with bcrypt-hashed passwords
- [ ] Existing passwords migrated (one-time script)
- [ ] `password` plaintext column removed after migration
- [ ] Login still works after migration

**Status:** [x] Fixed

---

### 8. [CRITICAL] No Supabase RLS policies

**Issue ID:** FIX-CR-008

**Location:** Supabase dashboard — all 22 tables

**Problem:**
Row Level Security is disabled. Any user with the Supabase anon key can read/write any table directly, bypassing the backend entirely.

**Expected:**
Enable RLS on all tables and create policies:
```sql
-- Example: users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
```

**Verification:**
- [ ] RLS enabled on all tables
- [ ] Students can only access their own data
- [ ] Instructors can access their disciplines' data
- [ ] Admins have full access
- [ ] Direct Supabase client calls respect policies

**Status:** [ ] Fixed

---

### 9. [CRITICAL] File uploads without size limits or validation

**Issue ID:** FIX-CR-009

**Location:** `backend/main.py:2206-2373`

**Problem:**
No file size limits, minimal MIME validation, no malware scanning. A user can upload arbitrarily large files.

**Expected:**
```python
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4", "audio/mpeg"}

@app.post("/upload/{entity_type}/{entity_id}")
async def upload_file(file: UploadFile, user = Depends(get_current_user)):
    # Check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Max: {MAX_FILE_SIZE // 1024 // 1024}MB")

    # Check MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f"File type not allowed: {file.content_type}")

    # Validate magic bytes
    import magic
    detected = magic.from_buffer(contents, mime=True)
    if detected not in ALLOWED_TYPES:
        raise HTTPException(415, f"File content doesn't match declared type")
    ...
```

**Verification:**
- [ ] Files >50MB are rejected with 413
- [ ] Non-allowed MIME types rejected with 415
- [ ] Magic bytes validated (rename .exe to .jpg must fail)
- [ ] Authenticated users only

**Status:** [x] Fixed

---

### 10. [CRITICAL] Race condition in batch question operations

**Issue ID:** FIX-CR-010

**Location:** `backend/main.py:2148-2149`

**Problem:**
```python
supabase.table("questions").delete().eq("content_id", content_id).execute()
# If this next line fails, all questions are lost:
supabase.table("questions").insert(new_questions).execute()
```

**Expected:**
```python
# Use Supabase RPC for transactional operation, or soft-delete pattern:
try:
    # Mark old questions as replaced
    supabase.table("questions").update({"status": "replaced"}).eq("content_id", content_id).execute()
    # Insert new
    result = supabase.table("questions").insert(new_questions).execute()
    # Only now delete old
    supabase.table("questions").delete().eq("content_id", content_id).eq("status", "replaced").execute()
except Exception:
    # Rollback: restore old questions
    supabase.table("questions").update({"status": "active"}).eq("content_id", content_id).eq("status", "replaced").execute()
    raise
```

**Verification:**
- [ ] Simulate failure after delete — old data preserved
- [ ] Successful operation replaces all questions atomically
- [ ] No orphaned or lost data

**Status:** [x] Fixed

---

### 11. [CRITICAL] No rate limiting on any endpoint

**Issue ID:** FIX-CR-011

**Location:** `backend/main.py` — global

**Problem:**
No rate limiting. Login endpoint vulnerable to brute force. AI endpoints vulnerable to abuse (costly API calls).

**Expected:**
```bash
pip install slowapi
```
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginData):
    ...

@app.post("/api/ai/{agent}/generate")
@limiter.limit("10/minute")
async def ai_generate(request: Request, ...):
    ...
```

**Verification:**
- [ ] Login: max 5 attempts/minute per IP
- [ ] AI endpoints: max 10 requests/minute per IP
- [ ] Returns 429 Too Many Requests when exceeded

**Status:** [x] Fixed

---

### 12. [CRITICAL] Supabase fallback credentials in frontend

**Issue ID:** FIX-CR-012

**Location:** `harven.ai-platform-mockup/src/lib/supabase.ts:5-6`

**Problem:**
Hardcoded placeholder/fallback credentials that could be deployed accidentally.

**Expected:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Verification:**
- [ ] No fallback/placeholder credentials in code
- [ ] App fails fast with clear error if env vars missing
- [ ] `.env.local` is in `.gitignore`

**Status:** [x] Fixed

---

### 13. [MAJOR] 90+ native alert() calls — replace with toast system

**Issue ID:** FIX-CR-013

**Location:** 15 files across frontend (SystemSettings, AdminClassManagement, CourseEdit, etc.)

**Problem:**
```tsx
alert("Configuracoes salvas com sucesso!");
if (confirm("Tem certeza?")) { ... }
```
Blocks UI thread, poor UX, cannot be styled or auto-dismissed.

**Expected:**
```bash
npm install sonner
```
```tsx
// In App.tsx or layout:
import { Toaster } from 'sonner';
<Toaster position="top-right" />

// In components:
import { toast } from 'sonner';
toast.success("Configuracoes salvas com sucesso!");
toast.error("Erro ao salvar configuracoes");

// For confirmations, create a ConfirmDialog component with async pattern
```

**Verification:**
- [ ] Zero `alert()` calls in codebase
- [ ] Zero `confirm()` calls in codebase
- [ ] Toast notifications styled and auto-dismiss
- [ ] Confirmation dialogs are async modal components

**Status:** [ ] Fixed

---

### 14. [MAJOR] No Error Boundaries in React app

**Issue ID:** FIX-CR-014

**Location:** `harven.ai-platform-mockup/src/App.tsx`

**Problem:**
Any unhandled error in any component crashes the entire application with a white screen.

**Expected:**
```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{children: ReactNode; fallback?: ReactNode}, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2>Algo deu errado</h2>
          <button onClick={() => this.setState({ hasError: false })}>Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap routes in App.tsx:
<ErrorBoundary><RouteComponent /></ErrorBoundary>
```

**Verification:**
- [ ] ErrorBoundary component created
- [ ] Wraps each route-level component
- [ ] Shows user-friendly fallback UI on error
- [ ] Includes "retry" button

**Status:** [ ] Fixed

---

### 15. [MAJOR] ChapterReader.tsx — 2,033 lines, needs decomposition

**Issue ID:** FIX-CR-015

**Location:** `harven.ai-platform-mockup/src/views/ChapterReader.tsx`

**Problem:**
Single component with 2,033 lines handling content viewing, AI chat, questions, TTS, editing — violates single responsibility.

**Expected:**
Split into:
- `ChapterReader.tsx` — orchestrator (~200 lines)
- `components/ContentViewer.tsx` — content rendering
- `components/SocraticChat.tsx` — AI dialogue
- `components/QuestionPanel.tsx` — questions display
- `components/TTSControls.tsx` — text-to-speech
- `components/ContentEditor.tsx` — inline editing

**Verification:**
- [ ] ChapterReader.tsx under 300 lines
- [ ] Each sub-component is self-contained
- [ ] All existing functionality preserved
- [ ] No visual regressions

**Status:** [ ] Fixed

---

### 16. [MAJOR] 72 occurrences of `any` type — TypeScript safety bypassed

**Issue ID:** FIX-CR-016

**Location:** `services/api.ts` (primary), 15 other files

**Problem:**
```typescript
export const fetchCourses = async (data: any): Promise<any> => { ... }
```

**Expected:**
Define proper interfaces:
```typescript
interface Course { id: string; title: string; description: string; ... }
interface CreateCourseDTO { title: string; description: string; discipline_id: string; }

export const fetchCourses = async (): Promise<Course[]> => { ... }
export const createCourse = async (data: CreateCourseDTO): Promise<Course> => { ... }
```

**Verification:**
- [ ] Zero `any` types in `services/api.ts`
- [ ] Interfaces defined in `types.ts` for all API entities
- [ ] `tsconfig.json` has `"noImplicitAny": true`

**Status:** [ ] Fixed

---

### 17. [MAJOR] Backend monolith — 4,576 lines in single file

**Issue ID:** FIX-CR-017

**Location:** `backend/main.py`

**Problem:**
All 97 endpoints, models, utilities, and middleware in one file.

**Expected:**
```
backend/
├── main.py              # App init, middleware, lifespan (~100 lines)
├── auth/
│   ├── routes.py        # Login, token refresh
│   ├── middleware.py     # JWT validation, role guards
│   └── models.py        # Auth Pydantic models
├── routes/
│   ├── users.py
│   ├── disciplines.py
│   ├── courses.py
│   ├── chapters.py
│   ├── contents.py
│   ├── questions.py
│   ├── ai.py
│   ├── admin.py
│   ├── integrations.py
│   └── uploads.py
└── models/
    ├── user.py
    ├── course.py
    └── ...
```

**Verification:**
- [ ] `main.py` under 200 lines
- [ ] Each router file under 500 lines
- [ ] All endpoints still functional
- [ ] API docs unchanged

**Status:** [ ] Fixed

---

### 18. [MAJOR] No request cancellation on component unmount

**Issue ID:** FIX-CR-018

**Location:** All components with `useEffect` + API calls

**Problem:**
```tsx
useEffect(() => {
  fetchData().then(setData);  // Still sets state after unmount
}, []);
```

**Expected:**
```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal }).then(setData).catch(() => {});
  return () => controller.abort();
}, []);
```

**Verification:**
- [ ] All useEffect API calls use AbortController
- [ ] No "Can't perform state update on unmounted component" warnings
- [ ] Cleanup functions present in all data-fetching effects

**Status:** [ ] Fixed

---

### 19. [MAJOR] JSON.parse without try-catch — crashes on corrupt data

**Issue ID:** FIX-CR-019

**Location:** `App.tsx:48`, `Header.tsx:63`, and 14 other locations

**Problem:**
```tsx
const user = JSON.parse(localStorage.getItem('user-data'));
```
Crashes if localStorage contains invalid JSON.

**Expected:**
```tsx
function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

const user = safeJsonParse('user-data', null);
```

**Verification:**
- [ ] Create `safeJsonParse` utility
- [ ] All `JSON.parse(localStorage.*)` calls replaced
- [ ] Test with corrupt localStorage value — no crash

**Status:** [ ] Fixed

---

### 20. [MAJOR] 167 bare `except Exception` blocks in backend

**Issue ID:** FIX-CR-020

**Location:** Throughout `backend/main.py`

**Problem:**
```python
except Exception as e:
    print(f"Error: {e}")
    return []  # Silently returns empty
```

**Expected:**
```python
import logging
logger = logging.getLogger(__name__)

# Replace print() with structured logging:
except SpecificException as e:
    logger.error("Failed to fetch disciplines", exc_info=True, extra={"user_id": user_id})
    raise HTTPException(status_code=500, detail="Erro interno ao buscar disciplinas")
```

**Verification:**
- [ ] Zero `print()` for error logging
- [ ] Structured logging with `logging` module
- [ ] Specific exception types caught where possible
- [ ] HTTP errors returned (not empty arrays) on failure

**Status:** [ ] Fixed

---

### 21. [MAJOR] No code splitting — all views loaded eagerly

**Issue ID:** FIX-CR-021

**Location:** `harven.ai-platform-mockup/src/App.tsx` or `routes.tsx`

**Problem:**
All 23 views imported at top level, increasing initial bundle size.

**Expected:**
```tsx
import { lazy, Suspense } from 'react';

const ChapterReader = lazy(() => import('./views/ChapterReader'));
const SystemSettings = lazy(() => import('./views/SystemSettings'));
const AdminConsole = lazy(() => import('./views/AdminConsole'));
// ... etc

// In router:
<Suspense fallback={<LoadingSpinner />}>
  <ChapterReader />
</Suspense>
```

**Verification:**
- [ ] All view imports use `React.lazy()`
- [ ] Suspense boundaries with loading fallback
- [ ] Bundle split verified (`npm run build` shows multiple chunks)

**Status:** [ ] Fixed

---

### 22. [MINOR] Tailwind CSS loaded via CDN (~3MB)

**Issue ID:** FIX-CR-022

**Location:** `harven.ai-platform-mockup/index.html`

**Problem:**
Tailwind loaded via CDN script tag — no tree-shaking, ~3MB CSS downloaded.

**Expected:**
```bash
npm install -D tailwindcss @tailwindcss/vite
```
Configure in `vite.config.ts` and remove CDN script. Only used classes will be included.

**Verification:**
- [ ] CDN script tag removed from index.html
- [ ] Tailwind installed as dev dependency
- [ ] Production CSS size under 50KB
- [ ] All styles still work

**Status:** [ ] Fixed

---

### 23. [MINOR] No pagination on list endpoints

**Issue ID:** FIX-CR-023

**Location:** `backend/main.py` — `GET /courses`, `GET /users`, `GET /disciplines`, etc.

**Problem:**
All list endpoints return all records without limit.

**Expected:**
```python
@app.get("/courses")
async def list_courses(page: int = 1, per_page: int = 20, user = Depends(get_current_user)):
    offset = (page - 1) * per_page
    result = supabase.table("courses").select("*", count="exact").range(offset, offset + per_page - 1).execute()
    return {"data": result.data, "total": result.count, "page": page, "per_page": per_page}
```

**Verification:**
- [ ] All list endpoints support `page` and `per_page` params
- [ ] Response includes `total` count
- [ ] Default page size is 20
- [ ] Frontend updated to handle pagination

**Status:** [ ] Fixed

---

### 24. [MINOR] N+1 queries in discipline listing

**Issue ID:** FIX-CR-024

**Location:** `backend/main.py:274-292`

**Problem:**
```python
for d in disciplines:
    students = supabase.table("discipline_students").eq("discipline_id", d['id']).execute()
    teachers = supabase.table("discipline_teachers").eq("discipline_id", d['id']).execute()
```
Runs 2N extra queries for N disciplines.

**Expected:**
```python
# Batch fetch all counts
discipline_ids = [d['id'] for d in disciplines]
all_students = supabase.table("discipline_students").select("discipline_id").in_("discipline_id", discipline_ids).execute()
all_teachers = supabase.table("discipline_teachers").select("discipline_id").in_("discipline_id", discipline_ids).execute()

# Count in Python
from collections import Counter
student_counts = Counter(s['discipline_id'] for s in all_students.data)
teacher_counts = Counter(t['discipline_id'] for t in all_teachers.data)
```

**Verification:**
- [ ] Max 3 queries for discipline listing (regardless of N)
- [ ] Counts are correct
- [ ] Response time improved for large datasets

**Status:** [ ] Fixed

---

### 25. [MINOR] Missing ARIA attributes across entire frontend

**Issue ID:** FIX-CR-025

**Location:** All interactive components

**Problem:**
Zero `aria-label`, `aria-expanded`, `role`, or `aria-live` attributes found. Platform inaccessible to screen readers.

**Expected (minimum viable):**
- Icon buttons: `aria-label="Fechar"`, `aria-label="Menu"`
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Dynamic content: `aria-live="polite"` on toast/notification areas
- Forms: All inputs have associated `<label>` with `htmlFor`

**Verification:**
- [ ] All icon-only buttons have `aria-label`
- [ ] Modal dialogs have `role="dialog"`
- [ ] Form inputs have associated labels
- [ ] Run axe-core audit — zero critical violations

**Status:** [ ] Fixed

---

## Constraints

**CRITICAL: @dev must follow these constraints:**

- [ ] Fix ONLY the issues listed above
- [ ] Do NOT add new features
- [ ] Do NOT refactor unrelated code
- [ ] Test each fix individually before moving to next
- [ ] Run frontend build after changes: `npm run build`
- [ ] Run backend startup after changes: `uvicorn main:app`
- [ ] Update this document marking each fix as complete

---

## Suggested Fix Order

**Phase 1 — Auth & Security (FIX-CR-001 through FIX-CR-012):**
Start with authentication (001, 002, 007) since authorization (002) depends on it. Then secrets (003, 005, 012), injection (004, 006), and infrastructure (008, 009, 010, 011).

**Phase 2 — Stability & UX (FIX-CR-013 through FIX-CR-021):**
Start with Error Boundaries (014) and toast system (013). Then decompose components (015, 017), fix types (016), and improve patterns (018, 019, 020, 021).

**Phase 3 — Performance & Polish (FIX-CR-022 through FIX-CR-025):**
Tailwind build (022), pagination (023), N+1 (024), accessibility (025).

---

## After Fixing

1. Mark each issue as fixed in this document
2. Request QA re-review: `@qa *code-review committed`
3. Run full regression test before merge

---

_Generated by Quinn (Test Architect) - AIOS QA System_
