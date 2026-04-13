# QA Fix Request v2 — Harven.ai Platform Review

**Data:** 2026-02-12
**Reviewer:** Quinn (QA Agent)
**Scope:** Full platform review (frontend + backend)
**Commits reviewed:** up to `47287ee`

---

## Phase 0 — Security Critical (P0)

### FIX-V2-001: Add authentication to unprotected endpoints
**Severity:** CRITICAL | **File:** `backend/main.py`

**Endpoints missing auth:**
- `GET /disciplines` (line ~314)
- `GET /courses` (line ~1505)
- `GET /users/{user_id}` (line ~1451)
- `GET /notifications/{user_id}` (line ~3303)
- `GET /search` (line ~3383)
- `POST /users` (line ~1255)
- `POST /users/batch` (line ~1277)
- `POST /disciplines` (line ~391)
- `POST /disciplines/{id}/students/batch` (line ~618)

**Fix:** Add `current_user: dict = Depends(get_current_user)` and appropriate `require_role()` checks. POST endpoints for users/disciplines should require ADMIN or INSTRUCTOR role.

---

### FIX-V2-002: Remove hardcoded JWT secret fallback
**Severity:** CRITICAL | **File:** `backend/main.py:40`

**Current:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "harven-dev-secret-change-in-production")
```

**Fix:** Fail at startup if not configured:
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required")
```

---

### FIX-V2-003: Add null checks before `response.data[0]`
**Severity:** CRITICAL | **File:** `backend/main.py`

**Locations:** lines ~409, 470, 803, 834, 1100, 1425, 1460, 1580, 1741, 2111, 2165

**Fix:** Replace all `response.data[0]` with:
```python
if not response.data:
    raise HTTPException(status_code=404, detail="Resource not found")
result = response.data[0]
```

---

### FIX-V2-004: Sanitize error responses — stop exposing `str(e)`
**Severity:** CRITICAL | **File:** `backend/main.py`

**Locations:** lines ~412, 445, 559, 571, 616, 647, 660, 1073 (and more)

**Fix:** Replace all `detail=f"Erro ao ...: {str(e)}"` with generic messages:
```python
except Exception as e:
    logger.error(f"Error creating discipline: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Erro interno do servidor")
```

---

### FIX-V2-005: Add webhook signature validation
**Severity:** CRITICAL | **File:** `backend/main.py:4639`

**Fix:** Validate `X-Moodle-Signature` header using HMAC-SHA256 with configured `webhook_secret`. Reject unsigned requests with 401.

---

### FIX-V2-006: Validate MIME type on file uploads
**Severity:** HIGH | **File:** `backend/main.py:1367,2447`

**Fix:** Validate `file.content_type` against an allowlist:
```python
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf", ...}
if file.content_type not in ALLOWED_MIME_TYPES:
    raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")
```

---

### FIX-V2-007: Remove `traceback.print_exc()` calls
**Severity:** HIGH | **File:** `backend/main.py:1413,2420,2496`

**Fix:** Remove `traceback.print_exc()` — `logger.error(..., exc_info=True)` already captures the traceback.

---

### FIX-V2-008: Fix silent exception suppression
**Severity:** HIGH | **File:** `backend/main.py:1067,1101`

**Fix:** Replace `except Exception: pass` with at minimum:
```python
except Exception as e:
    logger.warning(f"Non-critical operation failed: {e}")
```

---

### FIX-V2-009: Fix duplicate DisciplineCreate model
**Severity:** MEDIUM | **File:** `backend/main.py:305,1495`

**Fix:** Remove the duplicate definition at line ~1495 or rename it to a distinct model (e.g., `ClassCreate`).

---

### FIX-V2-010: Add rate limiting to critical endpoints
**Severity:** MEDIUM | **File:** `backend/main.py`

**Endpoints needing limits:**
- File uploads: `5/minute`
- Webhook: `30/minute`
- Search: `20/minute`
- Notifications: `30/minute`
- User creation: `10/minute`

---

### FIX-V2-011: Add input validation for query parameters
**Severity:** MEDIUM | **File:** `backend/main.py`

**Fix:**
- `user_id` params: validate UUID format
- `role` params: validate against `["STUDENT", "INSTRUCTOR", "ADMIN"]`
- `per_page`: cap at max 100
- `page`: must be >= 1

---

### FIX-V2-012: Fix race condition in settings update
**Severity:** HIGH | **File:** `backend/main.py:1096-1100`

**Fix:** Use upsert instead of check-then-update:
```python
supabase.table("system_settings").upsert({...}).execute()
```

---

### FIX-V2-013: Standardize error response format
**Severity:** MEDIUM | **File:** `backend/main.py`

**Fix:** All error responses should follow:
```json
{"detail": "Human-readable message", "code": "ERROR_CODE"}
```
Remove `{"message": ...}`, `{"success": false, ...}`, `{"error": ...}` variations.

---

## Phase 1 — Frontend Stability (P1)

### FIX-V2-014: Replace unsafe `JSON.parse()` with `safeJsonParse()`
**Severity:** CRITICAL | **Files:**
- `views/StudentDashboard.tsx:29`
- `views/Achievements.tsx:52`
- `views/StudentHistory.tsx:52,87`
- `views/AccountSettings.tsx:43,73`
- `components/Header.tsx:63`

**Fix:** Import and use `safeJsonParse` from `lib/utils.ts` in all locations. The utility already exists but is not being used.

---

### FIX-V2-015: Add global axios error interceptor
**Severity:** CRITICAL | **File:** `services/api.ts`

**Fix:** Add response interceptor after the request interceptor:
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('user-data');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

---

### FIX-V2-016: Replace remaining `any` types in AI API
**Severity:** HIGH | **File:** `services/api.ts:475-520`

**Fix:** Create interfaces for AI API payloads:
```typescript
interface AIDetectRequest { text: string; context?: Record<string, unknown>; }
interface AIEditRequest { text: string; instruction: string; context?: Record<string, unknown>; }
interface AIOrganizeRequest { payload: Record<string, unknown>; metadata?: Record<string, unknown>; }
```

---

### FIX-V2-017: Replace `key={i}` with unique identifiers
**Severity:** HIGH | **Files:**
- `views/InstructorList.tsx:88`
- `views/AdminConsole.tsx:113,150`
- `views/StudentMonitor.tsx:37`
- `views/StudentDashboard.tsx:82`
- `views/StudentAchievements.tsx:255`
- `views/InstructorDetail.tsx:202`

**Fix:** Use item `.id` or generate stable keys from data.

---

### FIX-V2-018: Add keyboard support to interactive elements
**Severity:** HIGH | **Files:**
- `components/ConfirmDialog.tsx:28` — backdrop onClick
- `views/StudentMonitor.tsx:37` — div onClick
- `views/InstructorList.tsx:91` — card onClick

**Fix:** Add `onKeyDown` handler for Enter/Space, `role="button"`, `tabIndex={0}`.

---

### FIX-V2-019: Add missing loading/error states
**Severity:** MEDIUM | **Files:**
- `views/InstructorList.tsx` — no loading state
- `views/AdminConsole.tsx` — no error recovery UI
- `views/CourseDetails.tsx` — loading OK, missing error UI

**Fix:** Add consistent loading skeleton and error fallback UI to each view.

---

### FIX-V2-020: Fix N+1 in StudentDashboard
**Severity:** MEDIUM | **File:** `views/StudentDashboard.tsx:40-49`

**Fix:** Replace sequential loop with `Promise.all()`:
```typescript
const coursesArrays = await Promise.all(
  disciplinesData.slice(0, 3).map(disc => coursesApi.listByClass(disc.id))
);
const allCourses = coursesArrays.flat();
```

---

### FIX-V2-021: Remove console.log statements from production
**Severity:** MEDIUM | **Files:** 123 occurrences across codebase

**Fix:** Remove debug `console.log()`. Keep `console.error()` only where no better alternative exists, or replace with a lightweight logger utility.

---

## Phase 2 — Structural (P2, separate branch)

### FIX-V2-022: Decompose backend main.py into modules
**Severity:** MEDIUM | **File:** `backend/main.py` (4,705 lines)

Already tracked as task #19 (FIX-CR-017). Recommended structure:
```
backend/
├── main.py              # App init, middleware (~100 lines)
├── core/config.py       # Settings, CORS, JWT
├── core/security.py     # Auth dependencies
├── core/exceptions.py   # Error handlers
├── routes/auth.py
├── routes/users.py
├── routes/disciplines.py
├── routes/courses.py
├── routes/admin.py
├── routes/integrations.py
├── schemas/             # All Pydantic models
└── services/            # Business logic
```

---

### FIX-V2-023: Fix legacy plaintext password migration
**Severity:** MEDIUM | **File:** `backend/main.py:480-489`

**Fix:** Log migration failure at ERROR level. Add a management command to batch-migrate all remaining plaintext passwords. Consider forcing password reset for unmigrated users.

---

## Summary

| Phase | Issues | Severity Breakdown |
|-------|--------|--------------------|
| Phase 0 (Security) | 13 | 5 CRITICAL, 4 HIGH, 4 MEDIUM |
| Phase 1 (Frontend) | 8 | 2 CRITICAL, 3 HIGH, 3 MEDIUM |
| Phase 2 (Structural) | 2 | 2 MEDIUM |
| **Total** | **23** | **7 CRITICAL, 7 HIGH, 9 MEDIUM** |

---

*Generated by Quinn (QA Agent) — 2026-02-12*
