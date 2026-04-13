# QA Fix Request — Azure Migration (Epics 3 + 4)

**Reviewer:** Quinn (QA)
**Date:** 2026-02-28
**Gate Decision:** FAIL — 12 CRITICAL issues blocking deploy
**Target:** @dev (Dex)

---

## Priority 1 — CRITICAL (Must fix, causes runtime crashes)

### C1. 5 functions using `db` without it in scope

These functions call `db_table(db, ...)` or `get_integration_service(db)` but `db` is NOT a parameter.

| Function | File:Line | Fix |
|----------|-----------|-----|
| `search_admin_logs` | `main.py:1333` | Add `db: Session = Depends(get_db)` to signature |
| `batch_export_to_moodle` | `main.py:4460` | Add `db: Session = Depends(get_db)` to signature |
| `get_integration_logs` | `main.py:4551` | Add `db: Session = Depends(get_db)` to signature |
| `get_moodle_ratings` | `main.py:4714` | Add `db: Session = Depends(get_db)` to signature |
| `_sync_ai_token_limit` | `main.py:2788` | This is a plain function, not a route. Use `SessionLocal()` to create a local session, or accept `db` as parameter and pass from callers |

---

### C2. `check.data` on SQLAlchemy CursorResult (4 occurrences)

`db.execute(text("SELECT 1"))` returns a `CursorResult` which has NO `.data` attribute. This pattern was left over from the Supabase migration.

| Location | File:Line |
|----------|-----------|
| `force_logout_all_users` | `main.py:1280-1281` |
| `upload_system_logo` | `main.py:3355-3356` |
| `upload_login_logo` | `main.py:3395-3396` |
| `upload_login_background` | `main.py:3435-3436` |

**Fix:** Replace the pattern. The intent is to fetch the existing system_settings row:
```python
# BEFORE (broken):
check = db.execute(text("SELECT 1"))
if check.data:
    db_table(db, "system_settings").update({...}).eq("id", check.data[0]["id"]).execute()

# AFTER (correct):
check = db_table(db, "system_settings").select("*").limit(1).execute()
if check.data:
    db_table(db, "system_settings").update({...}).eq("id", check.data[0]["id"]).execute()
```

---

### C3. `"now()"` string literal in 13 inserts

With Supabase/PostgREST, `"now()"` was interpreted as SQL `NOW()`. With SQLAlchemy, it stores the literal string `"now()"`.

**Lines:** 932, 1461, 1487, 3501, 3761, 3803, 4031, 4121, 4146, 4201, 4283, 4314, 4442

**Fix (option A — recommended):** Remove all `"created_at": "now()"` entries and let the model's `server_default=func.getutcdate()` handle it. For columns without server_default (like `issued_at`, `unlocked_at`, `started_at`, `exported_at`, `completed_at`), replace with:
```python
from datetime import datetime, timezone
"created_at": datetime.now(timezone.utc).isoformat()
```

**Fix (option B — compat layer):** Add interception in `db_compat.py` `_do_insert()` and `_do_update()`:
```python
from datetime import datetime, timezone
for key, val in data.items():
    if val == "now()":
        data[key] = datetime.now(timezone.utc)
```

---

### C4. `_do_update()` only updates first matching row

**File:** `db_compat.py:176-188`

`scalar_one_or_none()` returns only 1 row. Routes that update multiple rows (e.g., mark all notifications as read, batch update question status) silently lose updates.

**Fix:** Replace with multi-row update:
```python
def _do_update(self):
    query = select(self.model)
    for col, val in self._filters:
        query = query.where(getattr(self.model, col) == val)
    objects = self.db.execute(query).scalars().all()
    results = []
    for obj in objects:
        for key, value in self._update_data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        results.append(obj)
    if results:
        self.db.commit()
        for obj in results:
            self.db.refresh(obj)
    return QueryResult(data=[self._to_dict(obj) for obj in results])
```

---

### C5. 3 missing tables — `moodle_ratings`, `integration_logs`, `external_mappings`

**File:** `services/integration_service.py` uses these tables but no models exist and they're not in `TABLE_MODEL_MAP`.

**Fix:** Create 3 new model files:

1. `models/moodle_rating.py` — `MoodleRating` (columns: id, user_id, session_id, moodle_rating, moodle_feedback, rated_at)
2. `models/integration_log.py` — `IntegrationLog` (columns: id, system, operation, direction, status, records_processed, error_message, created_at)
3. `models/external_mapping.py` — `ExternalMapping` (columns: id, entity_type, local_id, external_id, external_system, created_at)

Then add to `models/__init__.py` and `db_compat.py TABLE_MODEL_MAP`.

---

### C6. `is_()` and `not_` methods missing in TableQuery

**File:** `db_compat.py` — used in `integration_service.py:623,748`

**Fix:** Add to `TableQuery`:
```python
def is_(self, col, val):
    if val == "null":
        self._filters.append((col, None))
    return self

@property
def not_(self):
    self._negate_next = True
    return self
```
And update `_do_select` to handle negation on the next filter.

---

### C7. `or_()` method missing in TableQuery

**File:** `db_compat.py` — used in `main.py:1351`

**Fix:** Add `or_()` method that parses the Supabase filter string format, or refactor the caller in `search_admin_logs` to use two `ilike()` calls:
```python
# Simpler fix — replace the caller:
if query:
    safe_query = query.replace("%", "").replace("_", "")
    q = q.ilike("msg", f"%{safe_query}%")
    # Note: this loses the OR on "author", but alternatively add or_ support
```

Or add proper `or_` support:
```python
def or_(self, filter_string):
    # Parse "col1.ilike.%val%,col2.ilike.%val%"
    self._or_filters.append(filter_string)
    return self
```

---

### C8. 8 missing columns on ChatSession model

**File:** `models/chat.py`

Missing: `moodle_exported_at`, `moodle_portfolio_id`, `moodle_rating`, `discipline_id`, `discipline_name`, `content_title`, `ai_summary`, `score`

**Fix:** Add to `ChatSession`:
```python
moodle_exported_at = Column(DateTime, nullable=True)
moodle_portfolio_id = Column(String(255), nullable=True)
moodle_rating = Column(String(50), nullable=True)
discipline_id = Column(String(36), nullable=True)
discipline_name = Column(String(255), nullable=True)
content_title = Column(String(500), nullable=True)
ai_summary = Column(Text, nullable=True)
score = Column(Float, nullable=True)
```

---

### C9. Missing columns on User and Discipline models

**File:** `models/user.py` — missing `jacad_ra` column
**File:** `models/discipline.py` — missing `department`, `jacad_codigo` columns

**Fix:** Add:
```python
# user.py
jacad_ra = Column(String(50), nullable=True)

# discipline.py (Discipline class)
department = Column(String(255), nullable=True)
jacad_codigo = Column(String(100), nullable=True)
```

Also: integration_service.py line 484 sets `"password": ra` — this should be `"password_hash": pwd_context.hash(ra)`.

---

### C10. `password_hash` leaked via `User.to_dict()`

**File:** `models/user.py`

**Fix:** Exclude from `to_dict()`:
```python
def to_dict(self):
    result = {c.name: getattr(self, c.name) for c in self.__table__.columns}
    result.pop("password_hash", None)
    for key, val in result.items():
        if hasattr(val, "isoformat"):
            result[key] = val.isoformat()
    return result
```

---

### C11. `get_public_settings` references undefined `response`

**File:** `main.py:848-849`

**Fix:** Replace:
```python
# BEFORE:
settings_obj = admin_repo.get_settings()
if response.data:
    settings = response.data[0]

# AFTER:
settings_obj = admin_repo.get_settings()
if settings_obj:
    settings = settings_obj.to_dict()
```

---

### C12. `get_db()` crash when DATABASE_URL not set

**File:** `database.py`

**Fix:** Add guard:
```python
def get_db() -> Session:
    if SessionLocal is None:
        raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Priority 2 — HIGH (Should fix before merge)

### H1. `extra_metadata` attribute mismatch

**Files:** `models/question.py`, `models/chat.py`, `models/gamification.py`

Insert dicts pass `"metadata": value` but the Python attribute is `extra_metadata`. SQLAlchemy rejects unknown kwargs.

**Fix (recommended — in db_compat.py `_do_insert`):**
```python
COLUMN_ALIAS_MAP = {
    "metadata": "extra_metadata",
}

def _do_insert(self):
    data = self._insert_data
    if isinstance(data, dict):
        data = {COLUMN_ALIAS_MAP.get(k, k): v for k, v in data.items()}
    elif isinstance(data, list):
        data = [{COLUMN_ALIAS_MAP.get(k, k): v for k, v in d.items()} for d in data]
    # ... rest of method
```
Apply same mapping in `_do_update` and `_do_upsert`.

---

### H2. No rollback on commit failure

**Files:** `repositories/base.py`, `db_compat.py`

**Fix:** Wrap commits in try/except:
```python
try:
    self.db.commit()
except Exception:
    self.db.rollback()
    raise
```

---

### H3. `storage.client is None` crash

**File:** `storage.py`

**Fix:** Add guard to all methods:
```python
def upload(self, container, file_path, content, content_type="application/octet-stream", upsert=True):
    if not self.client:
        raise RuntimeError("Azure Blob Storage not configured")
    # ... rest
```

---

### H4. `.env.example` files still document Supabase

**Files:** `backend/.env.example`, root `.env.example`, `docker-compose.yml`

**Fix:** Replace Supabase variables with:
```
DATABASE_URL=mssql+pyodbc://user:password@server.database.windows.net/harven-db?driver=ODBC+Driver+18+for+SQL+Server
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_ACCOUNT_NAME=harvenstorage
AZURE_STORAGE_ACCOUNT_KEY=...
```

---

### H5. `sys.path.insert` hack in integration_service.py

**File:** `services/integration_service.py:25-27`

**Fix:** Remove the sys.path hack. Since main.py imports from the backend directory, `from db_compat import db_table` works directly:
```python
# Remove these 3 lines:
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Keep only:
from db_compat import db_table
```

---

## Priority 3 — MEDIUM (Nice to fix)

| # | Issue | Fix |
|---|-------|-----|
| M1 | `package-lock.json` still has supabase | Run `cd harven.ai-platform-mockup && npm install` |
| M2 | `CLAUDE.md` documents Supabase | Update architecture section |
| M3 | `to_dict()` duplicated in 15 models | Extract to `ToDictMixin` in `base.py` |
| M4 | Missing `pool_pre_ping=True` | Add to `create_engine()` in `database.py` |
| M5 | `Notification.read == False` | Change to `Notification.read.is_(False)` in `notification_repo.py` |
| M6 | Missing cascades on 13 FKs | Add `ondelete="CASCADE"` or `"SET NULL"` as appropriate |

---

## Execution Order

1. **C12** → `database.py` guard (1 min)
2. **C10** → `password_hash` exclusion in `User.to_dict()` (2 min)
3. **C1** → Add `db` param to 5 functions (5 min)
4. **C2** → Fix `check.data` pattern, 4 occurrences (5 min)
5. **C11** → Fix `get_public_settings` undefined var (2 min)
6. **C3** → Replace `"now()"` strings, 13 occurrences (10 min)
7. **C4** → Fix `_do_update` multi-row (10 min)
8. **H1** → `extra_metadata` alias mapping (10 min)
9. **H2** → Add rollback to commits (10 min)
10. **H3** → Storage null guards (5 min)
11. **C6+C7** → Add `is_()`, `not_`, `or_()` to TableQuery (30 min)
12. **C5+C8+C9** → Missing models + columns (45 min)
13. **H4+H5** → Env files + sys.path cleanup (15 min)
14. **M1-M6** → Medium fixes (30 min)

**Estimated total:** ~3 hours

---

*Generated by Quinn (QA) — guardião da qualidade 🛡️*
