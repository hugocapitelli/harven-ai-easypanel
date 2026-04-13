# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Harven.ai is an educational platform with a React frontend and FastAPI backend, using Azure SQL + Azure Blob Storage (migrated from Supabase). The platform supports three user roles: Student, Instructor, and Admin.

## Development Commands

### Frontend (harven.ai-platform-mockup/)
```bash
cd harven.ai-platform-mockup
npm install          # Install dependencies
npm run dev          # Run development server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
```

### Backend (backend/)
```bash
cd backend
python -m venv venv                    # Create virtual environment
venv\Scripts\activate                  # Windows activation
pip install -r requirements.txt        # Install dependencies
uvicorn main:app --reload --port 8000  # Run development server
```

### Testing (backend/)
```bash
cd backend
python3 -m pytest tests/ -v       # Run all 60 tests
python3 -m pytest tests/ -v -k "test_select"  # Run specific tests
```

### Database Migrations (backend/)
```bash
cd backend
alembic upgrade head               # Apply all migrations
alembic revision --autogenerate -m "description"  # Create new migration
alembic downgrade -1               # Rollback one migration
```

### Environment Setup
- Frontend: Copy `.env.local` and set `GEMINI_API_KEY`
- Backend: Copy `.env.example` to `.env` and set `DATABASE_URL`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME`

## Architecture

### Frontend Structure (React + TypeScript + Vite)
- **App.tsx**: Main router using state-based navigation (no React Router). Manages `ViewType` state and history stack for back navigation.
- **views/**: Page components for each view (StudentDashboard, InstructorList, AdminConsole, etc.)
- **components/**: Reusable UI components (Sidebar, Header, ui/ folder with design system)
- **contexts/SettingsContext.tsx**: Global settings provider (fetches from `/admin/settings`)
- **types.ts**: TypeScript types including `ViewType`, `UserRole`, and data models
- **services/api.ts**: Axios HTTP client for backend API calls

### Backend Structure (FastAPI + SQLAlchemy + Azure)
- **main.py**: API with all routes. Uses FastAPI dependency injection with `Depends(get_db)` for SQLAlchemy sessions.
- **models/**: SQLAlchemy ORM models (23 tables) with `Base` and `UUIDPrimaryKeyMixin`
- **repositories/**: Data access layer — `BaseRepository` with CRUD, plus specialized repos (user, discipline, admin, chat, gamification, notification)
- **db_compat.py**: Supabase-compatible chainable query builder over SQLAlchemy (for gradual migration)
- **storage_bucket.py**: Azure Blob Storage wrapper mimicking supabase storage API
- **database.py**: SQLAlchemy engine setup and `get_db` session dependency
- **alembic/**: Database migration files (Alembic)

### Navigation Pattern
The frontend uses a custom state-based navigation system:
```typescript
handleNavigate(view: ViewType, data?: any)  // Navigate to view with optional data
handleBack()                                 // Pop from history stack
```
Views receive `onNavigate` prop and `activeResourceId` for passing data between views.

### API Routes (backend/main.py)
- `POST /auth/login`: Authentication via RA (student ID)
- `GET/POST /disciplines`: Discipline (class) management
- `GET/POST /disciplines/{id}/teachers|students`: Assignment management
- `GET/POST /courses`, `GET/PUT/DELETE /courses/{id}`: Course CRUD
- `GET/POST /courses/{id}/chapters`: Chapter management
- `GET/POST /chapters/{id}/contents`: Content management
- `GET/POST /contents/{id}/questions`: Question management
- `GET/POST /admin/settings`: System configuration
- `GET /admin/stats`, `GET /admin/logs`: Admin dashboard

### Database (Azure SQL via SQLAlchemy)
Key tables (23 total): `users`, `disciplines`, `discipline_students`, `discipline_teachers`, `courses`, `chapters`, `contents`, `questions`, `chat_sessions`, `chat_messages`, `system_settings`, `system_logs`, `system_backups`, `user_activities`, `user_stats`, `user_achievements`, `certificates`, `course_progress`, `notifications`, `token_usage`, `moodle_ratings`, `integration_logs`, `external_mappings`

### File Storage (Azure Blob Storage)
- `StorageBucket` class provides `.upload()`, `.get_public_url()`, `.remove()`, `.list()`, `.download()`
- Container configured via `AZURE_STORAGE_CONTAINER_NAME` env var

### User Roles
- **STUDENT**: Dashboard, course viewing, achievements
- **INSTRUCTOR**: Discipline management, course creation, content editing
- **ADMIN**: Console, user management, system settings, class management

### CORS Configuration
Backend allows origins: `localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`

## Key Conventions
- Role normalization: Backend converts `TEACHER` to `INSTRUCTOR` for frontend compatibility
- Auth tokens stored in `localStorage` as `harven-access-token` and `user-data`
- Settings context provides platform customization (logo, colors, modules enabled)
- All SQLAlchemy commits wrapped in try/except/rollback pattern
- Sensitive fields in `SystemSettings.to_dict()` are masked automatically (openai_key, moodle_token, smtp_password, etc.)
- SQL Server functions used: `func.getutcdate()`, `func.newid()`, `EXEC sp_increment_message_count`
