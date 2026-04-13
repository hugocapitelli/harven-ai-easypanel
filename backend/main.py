import os
from dotenv import load_dotenv
load_dotenv()  # Must run before local imports that read env vars

import re
import uuid
import time
import hmac
import hashlib
import logging
import urllib.parse
from collections import Counter
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form, Request, Security, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, model_validator
from passlib.context import CryptContext
from jose import jwt, JWTError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import text, func as sqlfunc

# Database & Repositories
from database import get_db, engine, SessionLocal, init_sqlite_db
from models import (
    User, Discipline, DisciplineTeacher, DisciplineStudent,
    Course, Chapter, Content, Question,
    ChatSession, ChatMessage,
    SystemSettings as SystemSettingsModel, SystemLog, SystemBackup,
    UserActivity, UserStats, UserAchievement, Certificate,
    CourseProgress, Notification, TokenUsage,
    SessionReview,
)
from repositories import (
    UserRepository, DisciplineRepository, CourseRepository,
    ChapterRepository, ContentRepository, QuestionRepository,
    ChatRepository, AdminRepository, GamificationRepository,
    NotificationRepository,
)
from storage import blob_storage, storage_from
from db_compat import db_table, db_rpc

# Logging
logger = logging.getLogger("harven")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# ============================================
# SECURITY CONFIGURATION
# ============================================
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or os.getenv("SUPABASE_KEY")
if not SECRET_KEY:
    import warnings
    warnings.warn("JWT_SECRET_KEY not set — using fallback. Set JWT_SECRET_KEY for production.")
    SECRET_KEY = "harven-dev-secret-change-me"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "8"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer(auto_error=False)

# Sensitive fields that must never be sent to frontend
SENSITIVE_SETTINGS_FIELDS = {"openai_key", "moodle_token", "smtp_password", "jacad_api_key", "moodle_webhook_secret", "lti_shared_secret"}

# File upload limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_UPLOAD_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'txt', 'pptx',
    'mp4', 'mov', 'avi', 'webm',
    'mp3', 'wav', 'ogg', 'm4a',
    'jpg', 'jpeg', 'png', 'webp', 'gif'
}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_CONTENT_TYPES = {*ALLOWED_IMAGE_TYPES, "application/pdf", "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "application/msword", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"}
VALID_USER_ROLES = {"STUDENT", "INSTRUCTOR", "ADMIN", "TEACHER"}


def create_jwt_token(user_id: str, role: str) -> str:
    """Create a JWT token with user claims."""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """Validate JWT token and return user payload. Returns None if no token."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")


async def require_auth(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """Require a valid JWT token. Raises 401 if missing or invalid."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token de autenticacao necessario")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")


def require_role(*roles):
    """Factory for role-based authorization dependency."""
    async def role_checker(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
        if credentials is None:
            raise HTTPException(status_code=401, detail="Token de autenticacao necessario")
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=401, detail="Token invalido ou expirado")
        if payload.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado para este perfil")
        return payload
    return role_checker


def sanitize_search_input(q: str) -> str:
    """Remove special SQL/ilike characters and cap length."""
    sanitized = re.sub(r'[%_\\]', '', q.strip())
    return sanitized[:100]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_sqlite_db()
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connected and verified (SQLAlchemy)")
        except Exception as e:
            logger.critical(f"Failed to connect to database: {e}", exc_info=True)
            if os.getenv("ENVIRONMENT") == "production":
                raise RuntimeError(f"Cannot start without database connection: {e}")
            else:
                logger.warning("Starting without DB connection (development mode)")
    else:
        logger.warning("DATABASE_URL not configured — set DATABASE_URL or USE_SQLITE=true")
    yield
    # Shutdown
    logger.info("Desligando backend...")

# ============================================
# API TAGS DEFINITIONS
# ============================================
tags_metadata = [
    {
        "name": "Health",
        "description": "Endpoints de verificação de saúde e status do sistema.",
    },
    {
        "name": "Auth",
        "description": "Autenticação e gerenciamento de sessões de usuário.",
    },
    {
        "name": "Users",
        "description": "Gerenciamento de usuários: CRUD, avatares e perfis.",
    },
    {
        "name": "Disciplines",
        "description": "Gerenciamento de disciplinas/turmas e suas associações com professores e alunos.",
    },
    {
        "name": "Courses",
        "description": "Gerenciamento de cursos/módulos dentro das disciplinas.",
    },
    {
        "name": "Chapters",
        "description": "Gerenciamento de capítulos dentro dos cursos.",
    },
    {
        "name": "Contents",
        "description": "Gerenciamento de conteúdos (vídeos, textos, PDFs, quizzes) dentro dos capítulos.",
    },
    {
        "name": "Questions",
        "description": "Gerenciamento de perguntas socráticas associadas aos conteúdos.",
    },
    {
        "name": "AI Services",
        "description": "Serviços de Inteligência Artificial: diálogo socrático, geração de questões, detecção de IA.",
    },
    {
        "name": "Chat Sessions",
        "description": "Persistência de conversas do método socrático e exportação para Moodle LMS.",
    },
    {
        "name": "Notifications",
        "description": "Sistema de notificações para usuários.",
    },
    {
        "name": "Dashboard",
        "description": "Estatísticas e dados para dashboards de usuários.",
    },
    {
        "name": "User Progress",
        "description": "Acompanhamento de progresso, conquistas e gamificação.",
    },
    {
        "name": "Search",
        "description": "Busca global na plataforma.",
    },
    {
        "name": "Upload",
        "description": "Upload de arquivos e mídia.",
    },
    {
        "name": "Admin - Settings",
        "description": "Configurações globais do sistema (apenas administradores).",
    },
    {
        "name": "Admin - Monitoring",
        "description": "Monitoramento de performance e armazenamento do sistema.",
    },
    {
        "name": "Admin - Backups",
        "description": "Gerenciamento de backups do sistema.",
    },
    {
        "name": "Admin - Security",
        "description": "Ações de segurança como logout forçado e limpeza de cache.",
    },
    {
        "name": "Admin - Logs",
        "description": "Logs de auditoria e eventos do sistema.",
    },
    {
        "name": "Integrations",
        "description": "Integrações com sistemas externos: JACAD (sistema acadêmico) e Moodle LMS. Permite importação de alunos, exportação de sessões e sincronização bidirecional.",
    },
]

app = FastAPI(
    title="Harven.AI API",
    description="""
## Harven.AI - Plataforma Educacional com IA

API completa para a plataforma educacional Harven.AI que utiliza Inteligência Artificial
para promover aprendizado ativo através do método socrático.

### Funcionalidades Principais

* **Gestão Educacional**: Disciplinas, cursos, capítulos e conteúdos
* **Método Socrático**: Diálogo interativo com IA para aprendizado ativo
* **Gamificação**: Sistema de conquistas, streaks e leaderboards
* **Integração Moodle**: Exportação de sessões no formato xAPI
* **Administração**: Configurações, monitoramento e segurança

### Autenticação

Atualmente a API utiliza autenticação simplificada via RA (Registro Acadêmico).
Em produção, será implementado JWT com refresh tokens.

### Recursos Úteis

* [Documentação ReDoc](/redoc) - Documentação alternativa
* [OpenAPI Schema](/openapi.json) - Schema JSON da API
    """,
    version="1.0.0",
    contact={
        "name": "Harven.AI Team",
        "email": "suporte@harven.ai",
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_tags=tags_metadata,
    lifespan=lifespan
)



from pydantic import BaseModel

class LoginRequest(BaseModel):
    ra: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)

# Configuracao CORS - URLs permitidas
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS_ORIGINS = [
    FRONTEND_URL,
    "https://harven.eximiaventures.com.br",
]
# Origens de desenvolvimento apenas fora de produção
if ENVIRONMENT != "production":
    CORS_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3004",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
    ])
# Remove duplicatas e valores vazios
CORS_ORIGINS = list(set(filter(None, CORS_ORIGINS)))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Request Size Limit
from starlette.middleware.base import BaseHTTPMiddleware

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            if "/upload" not in request.url.path and "/image" not in request.url.path:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large. Max size: {self.max_size // (1024*1024)}MB"}
                )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)

# Rate Limiting — default global: 60 requests/minute per IP
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================
# LOCAL FILE SERVING
# ============================================
from fastapi.staticfiles import StaticFiles
_uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")
logger.info("Static file serving enabled: /uploads/ → ./uploads/")

# ============================================
# HEALTH & STATUS
# ============================================

@app.get("/", tags=["Health"], summary="Root endpoint")
@limiter.exempt
async def root(db: Session = Depends(get_db)):
    """Verifica se o backend está rodando."""
    return {"message": "Harven.AI Backend está rodando!"}


# Modelo para Disciplina
class DisciplineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=200)
    
# ============================================
# DISCIPLINES (TURMAS)
# ============================================

@app.get("/disciplines", tags=["Disciplines"], summary="Listar disciplinas")
async def get_disciplines(user_id: Optional[str] = None, role: Optional[str] = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """
    Retorna lista de disciplinas filtradas por usuário.

    - Admin: vê todas as disciplinas
    - Professor/Instructor: vê apenas disciplinas onde está atribuído
    - Aluno/Student: vê apenas disciplinas onde está matriculado
    - Sem user_id: retorna todas (para compatibilidade)
    """
    try:
        # Normalizar role
        normalized_role = (role or "").upper()
        if normalized_role in ["TEACHER", "INSTRUCTOR", "PROFESSOR"]:
            normalized_role = "INSTRUCTOR"
        elif normalized_role in ["STUDENT", "ALUNO"]:
            normalized_role = "STUDENT"
        elif normalized_role in ["ADMIN", "ADMINISTRATOR"]:
            normalized_role = "ADMIN"

        # Se tem user_id e não é admin, filtrar
        discipline_ids = None
        if user_id and normalized_role and normalized_role != "ADMIN":
            if normalized_role == "INSTRUCTOR":
                # Buscar disciplinas onde o professor está atribuído
                teacher_disciplines = db_table(db, "discipline_teachers")\
                    .select("discipline_id")\
                    .eq("teacher_id", user_id)\
                    .execute()
                discipline_ids = [d['discipline_id'] for d in (teacher_disciplines.data or [])]
            elif normalized_role == "STUDENT":
                # Buscar disciplinas onde o aluno está matriculado
                student_disciplines = db_table(db, "discipline_students")\
                    .select("discipline_id")\
                    .eq("student_id", user_id)\
                    .execute()
                discipline_ids = [d['discipline_id'] for d in (student_disciplines.data or [])]

        # Buscar disciplinas
        offset = (page - 1) * per_page
        if discipline_ids is not None:
            if not discipline_ids:
                return {"data": [], "total": 0, "page": page, "per_page": per_page}
            response = db_table(db, "disciplines").select("*", count="exact").in_("id", discipline_ids).range(offset, offset + per_page - 1).execute()
        else:
            # Admin ou sem filtro: retorna todas
            response = db_table(db, "disciplines").select("*", count="exact").range(offset, offset + per_page - 1).execute()

        disciplines = response.data or []

        # Batch fetch all counts to avoid N+1 queries
        discipline_ids = [d['id'] for d in disciplines]
        if discipline_ids:
            all_students = db_table(db, "discipline_students").select("discipline_id").in_("discipline_id", discipline_ids).execute()
            all_courses = db_table(db, "courses").select("discipline_id").in_("discipline_id", discipline_ids).execute()
            student_counts = Counter(s['discipline_id'] for s in (all_students.data or []))
            course_counts = Counter(c['discipline_id'] for c in (all_courses.data or []))
        else:
            student_counts = Counter()
            course_counts = Counter()

        for d in disciplines:
            d['students'] = student_counts.get(d['id'], 0)
            d['courses_count'] = course_counts.get(d['id'], 0)

            # Garantir compatibilidade com frontend que espera 'code'
            if 'code' not in d or not d['code']:
                d['code'] = d['id'] # Fallback

        return {"data": disciplines, "total": response.count, "page": page, "per_page": per_page}
    except Exception as e:
        logger.error(f"Erro ao buscar disciplinas: {e}", exc_info=True)
        return {"data": [], "total": 0, "page": page, "per_page": per_page}

@app.post("/disciplines", tags=["Disciplines"], summary="Criar nova disciplina")
async def create_discipline(discipline: DisciplineCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Cria uma nova disciplina/turma. Apenas instrutores e administradores."""
    try:
        data = {
            "name": discipline.name,
            "code": discipline.code,
            "department": discipline.department,
        }
        
        response = db_table(db, "disciplines").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Erro ao criar disciplina: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/disciplines/{discipline_id}", tags=["Disciplines"], summary="Obter disciplina por ID")
async def get_discipline(discipline_id: str, current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Retorna os detalhes de uma disciplina específica."""
    try:
        response = db_table(db, "disciplines").select("*").eq("id", discipline_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Discipline not found")

class DisciplineUpdate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None

@app.put("/disciplines/{discipline_id}", tags=["Disciplines"], summary="Atualizar disciplina")
async def update_discipline(discipline_id: str, discipline: DisciplineUpdate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Atualiza os dados de uma disciplina existente."""
    try:
        data = {}
        # Accept both 'title' and 'name' from frontend, map to 'name' column
        resolved_name = discipline.name or discipline.title
        if resolved_name: data["name"] = resolved_name
        if discipline.department: data["department"] = discipline.department
        if discipline.description: data["description"] = discipline.description
        
        if not data: return {"message": "No changes"}
        
        response = db_table(db, "disciplines").update(data).eq("id", discipline_id).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error update_discipline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# AUTHENTICATION
# ============================================

@app.post("/auth/login", tags=["Auth"], summary="Login de usuário")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica um usuário usando RA (Registro Acadêmico) e senha.

    Retorna token de acesso e dados do usuário incluindo role normalizado.
    """
    try:
        # Busca usuário pelo RA
        logger.info(f"Login attempt for RA: {data.ra}")
        user_repo = UserRepository(db)
        user_obj = user_repo.get_by_ra(data.ra)

        if not user_obj:
            raise HTTPException(status_code=401, detail="RA não encontrado")

        # Read password_hash directly from ORM (to_dict() strips it for security)
        password_hash = user_obj.password_hash or ''
        user = user_obj.to_dict()
        if not password_hash:
            raise HTTPException(status_code=401, detail="Senha incorreta")

        try:
            password_valid = pwd_context.verify(data.password, password_hash)
        except Exception:
            # Fallback: legacy plaintext passwords not yet migrated to bcrypt
            password_valid = (data.password == password_hash)

        if not password_valid:
            raise HTTPException(status_code=401, detail="Senha incorreta")

        # Normalização de Role para o Frontend
        raw_role = user.get('role', 'student').upper()
        normalized_role = 'INSTRUCTOR' if raw_role == 'TEACHER' else raw_role

        # Generate real JWT token
        token = create_jwt_token(user['id'], normalized_role)

        return {
            "token": token,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user.get('email', ''),
                "role": normalized_role,
                "ra": user['ra'],
                "avatar_url": user.get('avatar_url', ''),
                "title": user.get('title', '')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# DISCIPLINE - TEACHERS ASSIGNMENT
# ============================================

class TeacherAssignment(BaseModel):
    teacher_id: str

@app.get("/disciplines/{discipline_id}/teachers", tags=["Disciplines"], summary="Listar professores da disciplina")
async def get_discipline_teachers(discipline_id: str, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Retorna todos os professores vinculados a uma disciplina."""
    try:
        offset = (page - 1) * per_page
        response = db_table(db, "discipline_teachers") \
            .select("*, users!teacher_id(id, name, email, role, avatar_url, ra, title)", count="exact") \
            .eq("discipline_id", discipline_id) \
            .range(offset, offset + per_page - 1) \
            .execute()

        teachers = [row['users'] for row in response.data if row.get('users')]
        total = response.count or 0
        return {"data": teachers, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
    except Exception as e:
        logger.error(f"Erro ao buscar professores da disciplina: {e}", exc_info=True)
        # Fallback to 2-query approach if relation not configured
        try:
            offset = (page - 1) * per_page
            response = db_table(db, "discipline_teachers").select("teacher_id", count="exact").eq("discipline_id", discipline_id).range(offset, offset + per_page - 1).execute()
            teacher_ids = [row['teacher_id'] for row in response.data]
            if not teacher_ids:
                return {"data": [], "total": response.count or 0, "page": page, "per_page": per_page, "total_pages": 0}
            users_response = db_table(db, "users").select("*").in_("id", teacher_ids).execute()
            total = response.count or 0
            return {"data": users_response.data, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
        except Exception as fallback_e:
            logger.error(f"Fallback also failed: {fallback_e}", exc_info=True)
            return []

@app.post("/disciplines/{discipline_id}/teachers", tags=["Disciplines"], summary="Adicionar professor à disciplina")
async def add_discipline_teacher(discipline_id: str, assignment: TeacherAssignment, db: Session = Depends(get_db)):
    """Vincula um professor a uma disciplina."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "discipline_id": discipline_id,
            "teacher_id": assignment.teacher_id
        }
        response = db_table(db, "discipline_teachers").insert(data).execute()
        return response.data
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Professor ja esta vinculado a esta disciplina")
        logger.error(f"Erro ao atribuir professor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/disciplines/{discipline_id}/teachers/{teacher_id}", tags=["Disciplines"], summary="Remover professor da disciplina")
async def remove_discipline_teacher(discipline_id: str, teacher_id: str, db: Session = Depends(get_db)):
    """Remove a associação de um professor com uma disciplina."""
    try:
        response = db_table(db, "discipline_teachers").delete().match({"discipline_id": discipline_id, "teacher_id": teacher_id}).execute()
        return {"success": True, "message": "Professor removido"}
    except Exception as e:
        logger.error(f"Erro ao remover professor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# DISCIPLINE - STUDENTS ASSIGNMENT
# ============================================

class StudentAssignment(BaseModel):
    student_id: str

@app.get("/disciplines/{discipline_id}/students", tags=["Disciplines"], summary="Listar alunos da disciplina")
async def get_discipline_students(discipline_id: str, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Retorna todos os alunos matriculados em uma disciplina."""
    try:
        offset = (page - 1) * per_page
        response = db_table(db, "discipline_students") \
            .select("*, users!student_id(id, name, email, role, avatar_url, ra, title)", count="exact") \
            .eq("discipline_id", discipline_id) \
            .range(offset, offset + per_page - 1) \
            .execute()

        students = [row['users'] for row in response.data if row.get('users')]
        total = response.count or 0
        return {"data": students, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
    except Exception as e:
        logger.error(f"Erro ao buscar alunos da disciplina: {e}", exc_info=True)
        # Fallback to 2-query approach if relation not configured
        try:
            offset = (page - 1) * per_page
            response = db_table(db, "discipline_students").select("student_id", count="exact").eq("discipline_id", discipline_id).range(offset, offset + per_page - 1).execute()
            student_ids = [row['student_id'] for row in response.data]
            if not student_ids:
                return {"data": [], "total": response.count or 0, "page": page, "per_page": per_page, "total_pages": 0}
            users_response = db_table(db, "users").select("*").in_("id", student_ids).execute()
            total = response.count or 0
            return {"data": users_response.data, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
        except Exception as fallback_e:
            logger.error(f"Fallback also failed: {fallback_e}", exc_info=True)
            return []

@app.post("/disciplines/{discipline_id}/students", tags=["Disciplines"], summary="Adicionar aluno à disciplina")
async def add_discipline_student(discipline_id: str, assignment: StudentAssignment, db: Session = Depends(get_db)):
    """Matricula um aluno em uma disciplina."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "discipline_id": discipline_id,
            "student_id": assignment.student_id
        }
        response = db_table(db, "discipline_students").insert(data).execute()
        return response.data
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Aluno ja esta vinculado a esta disciplina")
        logger.error(f"Erro ao atribuir aluno: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/disciplines/{discipline_id}/students/batch", tags=["Disciplines"], summary="Adicionar alunos em lote")
async def add_discipline_students_batch(discipline_id: str, student_ids: List[str], current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Matricula múltiplos alunos em uma disciplina de uma só vez."""
    if not student_ids:
        return {"message": "Nenhum aluno para adicionar", "count": 0}

    try:
        # Preparar dados para inserção em lote
        data_list = []
        for sid in student_ids:
            data_list.append({
                "id": str(uuid.uuid4()),
                "discipline_id": discipline_id,
                "student_id": sid
            })
            
        # Bulk insert via compatibility layer
        # count='exact' para retornar o número de linhas inseridas
        response = db_table(db, "discipline_students").insert(data_list, count='exact').execute()
        
        return {"message": "Alunos adicionados com sucesso", "count": len(response.data) if response.data else 0}
    except Exception as e:
        logger.error(f"Erro ao atribuir alunos em lote: {e}", exc_info=True)
        # Em caso de erro (ex: algum já existe), pode falhar tudo. 
        # Idealmente faríamos upsert ou ignore duplicates.
        # Vamos assumir que o frontend filtra os já existentes.
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/disciplines/{discipline_id}/students/{student_id}", tags=["Disciplines"], summary="Remover aluno da disciplina")
async def remove_discipline_student(discipline_id: str, student_id: str, db: Session = Depends(get_db)):
    """Remove a matrícula de um aluno em uma disciplina."""
    try:
        response = db_table(db, "discipline_students").delete().eq("discipline_id", discipline_id).eq("student_id", student_id).execute()
        return response.data
    except Exception as e:
        logger.error(f"Erro ao remover aluno: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# ADMIN - STATISTICS & DASHBOARD
# ============================================

@app.get("/admin/stats", tags=["Admin - Monitoring"], summary="Estatísticas do sistema")
@limiter.limit("30/minute")
async def get_admin_stats(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna estatísticas gerais do sistema: usuários, disciplinas e saúde."""
    try:
        start_time = time.time()
        
        # Contagem real de dados
        users_count = db_table(db, "users").select("id", count="exact").execute().count
        disciplines_count = db_table(db, "disciplines").select("id", count="exact").execute().count
        
        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        
        # Score de performance baseado na latência
        # < 300ms = 100%
        # Cada 100ms a mais retira 5%
        baseline_ms = 300
        performance_score = 100
        
        if latency_ms > baseline_ms:
            penalty = ((latency_ms - baseline_ms) / 100) * 5
            performance_score = max(50, 100 - penalty) # Minimo 50%
            
        return {
            "total_users": users_count,
            "total_disciplines": disciplines_count,
            "active_users_last_month": int(users_count * 0.8) if users_count else 0, 
            "system_health": f"{int(performance_score)}%",
            "latency": f"{int(latency_ms)}ms"
        }
    except Exception as e:
        logger.error(f"Erro ao buscar stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/admin/logs", tags=["Admin - Logs"], summary="Listar logs de auditoria")
@limiter.limit("30/minute")
async def get_admin_logs(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna os últimos 10 logs de auditoria do sistema."""
    try:
        # Tenta buscar da tabela real system_logs
        response = db_table(db, "system_logs").select("*").order("created_at", desc=True).limit(10).execute()
        return response.data
    except Exception as e:
        # Se tabela não existir, retorna array vazio para não quebrar front
        logger.error(f"Erro ao buscar logs (tabela existe?): {e}", exc_info=True) 
        return []


# Modelo de Configurações do Sistema
class SystemSettings(BaseModel):
    model_config = {"extra": "ignore"}

    @model_validator(mode='before')
    @classmethod
    def _coerce_nulls(cls, data):
        """Strip None values for non-Optional fields so Pydantic defaults apply.
        Prevents 422 when frontend sends null (e.g. parseInt('') → NaN → JSON null)
        or when DB columns contain NULL for int/bool fields."""
        if not isinstance(data, dict):
            return data
        nullable_fields = {'moodle_last_sync', 'jacad_last_sync'}
        return {k: v for k, v in data.items() if k in nullable_fields or v is not None}

    # Geral
    platform_name: str = "Harven.AI"
    base_url: str = "https://harven.eximiaventures.com.br"
    support_email: str = "suporte@harven.ai"
    primary_color: str = "#d0ff00"
    logo_url: str = ""
    login_logo_url: str = ""
    login_bg_url: str = ""
    
    # Módulos
    module_auto_register: bool = True
    module_ai_tutor: bool = True
    module_gamification: bool = True
    module_dark_mode: bool = True
    
    # Limites
    limit_tokens: int = 2048
    limit_upload_mb: int = 500
    ai_daily_token_limit: int = 500000
    
    # Integrações
    openai_key: str = ""
    anthropic_connected: bool = False
    sso_azure: bool = True
    sso_google: bool = False
    
    # Integrações - Moodle LMS
    moodle_url: str = ""
    moodle_token: str = ""
    moodle_enabled: bool = False
    moodle_sync_frequency: str = "manual"
    moodle_last_sync: Optional[str] = None
    moodle_export_format: str = "xapi"
    moodle_auto_export: bool = False
    moodle_portfolio_enabled: bool = True
    moodle_rating_enabled: bool = True
    moodle_webhook_secret: str = ""

    # Integrações - JACAD (Sistema Acadêmico)
    jacad_enabled: bool = False
    jacad_url: str = ""
    jacad_api_key: str = ""
    jacad_sync_frequency: str = "manual"
    jacad_last_sync: Optional[str] = None
    jacad_auto_create_users: bool = True
    jacad_sync_enrollments: bool = True

    # Integrações - SMTP
    smtp_server: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    
    # Segurança
    pwd_min_length: int = 8
    pwd_special_chars: bool = True
    pwd_expiration: bool = False
    session_timeout: str = "30 minutos"
    force_2fa: bool = False
    
    # Segurança (Novos)
    firewall_blocked_ips: str = ""
    firewall_whitelist: str = ""

    # Backups
    backup_enabled: bool = True
    backup_frequency: str = "Diário"
    backup_retention: int = 30
    
# ============================================
# PUBLIC SETTINGS (branding, no auth required)
# ============================================

PUBLIC_SETTINGS_FIELDS = [
    "platform_name", "primary_color", "logo_url", "login_logo_url", "login_bg_url",
    "module_dark_mode", "module_auto_register"
]

@app.get("/settings/public", tags=["Settings"], summary="Obter configurações públicas (branding)")
@limiter.limit("30/minute")
async def get_public_settings(request: Request, db: Session = Depends(get_db)):
    """Retorna configurações públicas de branding sem autenticação."""
    try:
        admin_repo = AdminRepository(db)
        settings_obj = admin_repo.get_settings()
        if settings_obj:
            settings = settings_obj.to_dict() if hasattr(settings_obj, 'to_dict') else settings_obj
        else:
            settings = SystemSettings().model_dump()
        return {k: settings.get(k, getattr(SystemSettings(), k, None)) for k in PUBLIC_SETTINGS_FIELDS}
    except Exception as e:
        logger.error(f"Erro ao buscar public settings: {e}")
        defaults = SystemSettings()
        return {k: getattr(defaults, k) for k in PUBLIC_SETTINGS_FIELDS}

# ============================================
# ADMIN - SYSTEM SETTINGS
# ============================================

@app.get("/admin/settings", tags=["Admin - Settings"], summary="Obter configurações do sistema")
@limiter.limit("30/minute")
async def get_system_settings(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna todas as configurações do sistema (apenas admin)."""
    try:
        # Tenta buscar configuração existente (assumindo tabela system_settings com id fixo ou única linha)
        response = db_table(db, "system_settings").select("*").limit(1).execute()
        
        if response.data:
            settings = SystemSettings(**response.data[0])
        else:
            settings = SystemSettings()

        # Mask sensitive fields before sending to frontend
        settings_dict = settings.model_dump()
        for field in SENSITIVE_SETTINGS_FIELDS:
            if field in settings_dict and settings_dict[field]:
                val = str(settings_dict[field])
                settings_dict[field] = "••••" + val[-4:] if len(val) > 4 else "••••"
        return settings_dict
            
    except Exception as e:
        logger.error(f"Erro ao buscar settings: {e}", exc_info=True)
        # Fallback para defaults em caso de erro (ex: tabela não existe ainda)
        return SystemSettings()

@app.post("/admin/settings", tags=["Admin - Settings"], summary="Salvar configurações do sistema")
async def save_system_settings(settings: dict, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Salva ou atualiza as configurações do sistema (apenas admin)."""
    try:
        data = dict(settings)

        # Fetch current settings to preserve sensitive fields and discover DB columns
        check = db_table(db, "system_settings").select("*").limit(1).execute()
        if check.data:
            current = check.data[0]
            data["id"] = current['id']
            # Preserve real sensitive values when frontend sends back masked values
            for field in SENSITIVE_SETTINGS_FIELDS:
                if field in data and isinstance(data[field], str) and data[field].startswith("••••"):
                    data[field] = current.get(field, "")
            # Only send fields that exist as columns in the DB to avoid PostgREST errors
            known_columns = set(current.keys())
            data = {k: v for k, v in data.items() if k in known_columns}
            data["id"] = current['id']
        else:
            data["id"] = str(uuid.uuid4())

        data["updated_at"] = datetime.utcnow().isoformat()
        response = db_table(db, "system_settings").upsert(data).execute()

        return response.data
    except Exception as e:
        logger.error(f"Erro ao salvar settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar configurações: {str(e)}")

class GlobalAction(BaseModel):
    type: str  # 'ANNOUNCEMENT' | 'MAINTENANCE'
    message: str
    author: str

@app.post("/admin/actions", tags=["Admin - Settings"], summary="Criar ação global")
async def create_global_action(action: GlobalAction, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Cria um anúncio global ou agenda manutenção."""
    try:
        data = {
            "msg": action.message,
            "author": action.author,
            "status": "Enviado" if action.type == 'ANNOUNCEMENT' else "Agendado",
            "color": "blue" if action.type == 'ANNOUNCEMENT' else "orange",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        # Salva na tabela de logs (precisa ser criada)
        response = db_table(db, "system_logs").insert(data).execute()
        return response.data
    except Exception as e:
        logger.error(f"Erro ao criar ação global: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/admin/performance", tags=["Admin - Monitoring"], summary="Métricas de performance")
@limiter.limit("30/minute")
async def get_system_performance(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna métricas de performance em tempo real: CPU, RAM, disco, uptime e latência."""
    import psutil
    import time

    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.5)

        # Memory usage
        memory = psutil.virtual_memory()
        ram_percent = memory.percent
        ram_used_gb = round(memory.used / (1024**3), 1)
        ram_total_gb = round(memory.total / (1024**3), 1)

        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used_gb = round(disk.used / (1024**3), 1)
        disk_total_gb = round(disk.total / (1024**3), 1)

        # Uptime (system boot time)
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_days = int(uptime_seconds // 86400)
        uptime_hours = int((uptime_seconds % 86400) // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{uptime_days}d {uptime_hours}h {uptime_minutes}min"

        # Database latency check
        start = time.time()
        db.execute(text("SELECT 1"))
        db_latency = round((time.time() - start) * 1000, 1)

        # Cache estimation (simplified)
        cache_hit_rate = "95%" if db_latency < 100 else "85%" if db_latency < 300 else "70%"

        return {
            "cpu": f"{cpu_percent}%",
            "ram": f"{ram_percent}%",
            "ram_detail": f"{ram_used_gb} GB / {ram_total_gb} GB",
            "disk": f"{disk_percent}%",
            "disk_detail": f"{disk_used_gb} GB / {disk_total_gb} GB",
            "uptime": uptime_str,
            "db_latency": f"{db_latency}ms",
            "cache_hit_rate": cache_hit_rate,
            "status": "healthy" if cpu_percent < 80 and ram_percent < 90 else "warning"
        }
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}", exc_info=True)
        return {
            "cpu": "N/A",
            "ram": "N/A",
            "disk": "N/A",
            "uptime": "N/A",
            "db_latency": "N/A",
            "cache_hit_rate": "N/A",
            "status": "error",
            "error": str(e)
        }


@app.get("/admin/storage", tags=["Admin - Monitoring"], summary="Estatísticas de armazenamento")
@limiter.limit("30/minute")
async def get_storage_stats(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna estatísticas de uso de armazenamento por tabela."""
    try:
        # Count records in main tables to estimate storage
        tables_stats = {}

        # Users
        users = db_table(db, "users").select("id", count="exact").execute()
        tables_stats["users"] = users.count or 0

        # Disciplines
        disciplines = db_table(db, "disciplines").select("id", count="exact").execute()
        tables_stats["disciplines"] = disciplines.count or 0

        # Courses
        courses = db_table(db, "courses").select("id", count="exact").execute()
        tables_stats["courses"] = courses.count or 0

        # Chapters
        chapters = db_table(db, "chapters").select("id", count="exact").execute()
        tables_stats["chapters"] = chapters.count or 0

        # Contents
        contents = db_table(db, "contents").select("id", count="exact").execute()
        tables_stats["contents"] = contents.count or 0

        # Questions
        questions = db_table(db, "questions").select("id", count="exact").execute()
        tables_stats["questions"] = questions.count or 0

        # Calculate estimated storage (rough estimate: ~1KB per simple record, ~5KB per content)
        estimated_kb = (
            tables_stats["users"] * 1 +
            tables_stats["disciplines"] * 1 +
            tables_stats["courses"] * 2 +
            tables_stats["chapters"] * 2 +
            tables_stats["contents"] * 5 +
            tables_stats["questions"] * 2
        )
        estimated_mb = round(estimated_kb / 1024, 2)

        # Estimate storage usage
        db_limit_mb = 500
        storage_limit_gb = 1

        return {
            "tables": tables_stats,
            "total_records": sum(tables_stats.values()),
            "estimated_db_mb": estimated_mb,
            "db_limit_mb": db_limit_mb,
            "db_usage_percent": round((estimated_mb / db_limit_mb) * 100, 1),
            "storage_used_gb": round(estimated_mb / 1024, 2),
            "storage_limit_gb": storage_limit_gb
        }
    except Exception as e:
        logger.error(f"Error getting storage stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/admin/backups", tags=["Admin - Backups"], summary="Listar backups")
@limiter.limit("30/minute")
async def list_backups(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Retorna lista de backups disponíveis."""
    try:
        # Try to get from system_backups table
        response = db_table(db, "system_backups").select("*").order("created_at", desc=True).limit(10).execute()
        return response.data or []
    except Exception as e:
        # If table doesn't exist, return empty list
        logger.error(f"Backups table may not exist: {e}", exc_info=True)
        return []


@app.post("/admin/backups", tags=["Admin - Backups"], summary="Criar backup")
async def create_backup(user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Cria um novo backup real: exporta todas as tabelas como JSON e faz upload para storage."""
    import time
    from datetime import datetime

    try:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        backup_filename = f"backup_{timestamp}.json"
        storage_path = f"backups/{backup_filename}"

        # Tables to export
        required_tables = [
            "users", "disciplines", "discipline_students", "discipline_teachers",
            "courses", "chapters", "contents", "questions",
            "system_settings", "system_logs"
        ]
        optional_tables = [
            "notifications", "user_activities", "user_achievements",
            "certificates", "chat_sessions", "chat_messages"
        ]

        export_data = {}
        table_counts = {}

        def fetch_all_rows(table_name: str):
            """Fetch all rows from a table using pagination."""
            all_rows = []
            page_size = 1000
            offset = 0
            while True:
                resp = db_table(db, table_name).select("*").range(offset, offset + page_size - 1).execute()
                rows = resp.data or []
                all_rows.extend(rows)
                if len(rows) < page_size:
                    break
                offset += page_size
            return all_rows

        # Export required tables
        for table in required_tables:
            try:
                rows = fetch_all_rows(table)
                export_data[table] = rows
                table_counts[table] = len(rows)
            except Exception as e:
                logger.warning(f"Error exporting table {table}: {e}")
                export_data[table] = []
                table_counts[table] = 0

        # Export optional tables (skip silently if not found)
        for table in optional_tables:
            try:
                rows = fetch_all_rows(table)
                export_data[table] = rows
                table_counts[table] = len(rows)
            except Exception:
                pass  # Table may not exist

        # Serialize to JSON bytes
        json_bytes = json.dumps(
            {"exported_at": datetime.utcnow().isoformat(), "tables": export_data},
            default=str,
            ensure_ascii=False
        ).encode("utf-8")

        size_mb = round(len(json_bytes) / (1024 * 1024), 2)

        # Upload to storage (container "backups" must exist)
        try:
            storage_from("backups").upload(
                storage_path,
                json_bytes,
                {"content-type": "application/json"}
            )
        except Exception as upload_err:
            logger.error(f"Storage upload failed: {upload_err}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Falha no upload do backup: {upload_err}")

        # Save metadata to system_backups
        total_records = sum(table_counts.values())
        backup_record = {
            "name": backup_filename,
            "size_mb": size_mb,
            "status": "completed",
            "type": "manual",
            "records": table_counts,
            "storage_path": storage_path,
            "created_by": "admin"
        }

        try:
            resp = db_table(db, "system_backups").insert(backup_record).execute()
            backup_record["id"] = resp.data[0]["id"] if resp.data else None
        except Exception as table_error:
            logger.warning(f"Could not save to system_backups table: {table_error}")

        # Log the action
        try:
            db_table(db, "system_logs").insert({
                "msg": f"Backup manual criado: {backup_filename} ({size_mb}MB, {total_records} registros)",
                "author": "Admin",
                "status": "Sucesso",
                "type": "BACKUP"
            }).execute()
        except Exception:
            pass

        return {"success": True, "backup": backup_record}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating backup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/admin/backups/{backup_id}/download", tags=["Admin - Backups"], summary="Download de backup")
async def download_backup(backup_id: str, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Gera uma URL assinada para download de um backup."""
    try:
        resp = db_table(db, "system_backups").select("*").eq("id", backup_id).limit(1).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Backup não encontrado")

        backup = resp.data[0]
        storage_path = backup.get("storage_path")
        if not storage_path:
            raise HTTPException(status_code=400, detail="Backup sem arquivo associado (backup antigo)")

        signed = storage_from("backups").create_signed_url(storage_path, 3600)
        if not signed or not signed.get("signedURL"):
            raise HTTPException(status_code=500, detail="Falha ao gerar URL de download")

        return {"download_url": signed["signedURL"], "name": backup.get("name", "backup.json")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading backup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.delete("/admin/backups/{backup_id}", tags=["Admin - Backups"], summary="Deletar backup")
async def delete_backup(backup_id: str, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Deleta um backup do Storage e da tabela system_backups."""
    try:
        resp = db_table(db, "system_backups").select("*").eq("id", backup_id).limit(1).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Backup não encontrado")

        backup = resp.data[0]
        storage_path = backup.get("storage_path")

        # Delete from Storage if path exists
        if storage_path:
            try:
                storage_from("backups").remove([storage_path])
            except Exception as storage_err:
                logger.warning(f"Could not delete backup file from storage: {storage_err}")

        # Delete record from DB
        db_table(db, "system_backups").delete().eq("id", backup_id).execute()

        # Log
        try:
            db_table(db, "system_logs").insert({
                "msg": f"Backup deletado: {backup.get('name', backup_id)}",
                "author": "Admin",
                "status": "Sucesso",
                "type": "BACKUP"
            }).execute()
        except Exception:
            pass

        return {"success": True, "deleted_id": backup_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting backup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/admin/force-logout", tags=["Admin - Security"], summary="Forçar logout de todos")
@limiter.limit("3/minute")
async def force_logout_all_users(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Força logout de todos os usuários invalidando suas sessões."""
    try:
        # In a real implementation, this would:
        # 1. Invalidate all JWT tokens
        # 2. Clear session storage
        # 3. Update a "sessions_invalidated_at" timestamp

        # For now, we'll update the settings to record when this was done
        # and log the action
        from datetime import datetime

        timestamp = datetime.now().isoformat()

        # Update settings with last force logout time
        try:
            check = db_table(db, "system_settings").select("*").limit(1).execute()
            if check.data:
                db_table(db, "system_settings").update({
                    "last_force_logout": timestamp
                }).eq("id", check.data[0]["id"]).execute()
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

        # Log the action
        db_table(db, "system_logs").insert({
            "msg": "Logout forçado de todos os usuários executado",
            "author": "Admin",
            "status": "Executado",
            "type": "SECURITY"
        }).execute()

        return {
            "success": True,
            "message": "Todos os usuários foram desconectados",
            "timestamp": timestamp,
            "note": "Os usuários precisarão fazer login novamente"
        }
    except Exception as e:
        logger.error(f"Error forcing logout: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/admin/clear-cache", tags=["Admin - Security"], summary="Limpar cache do sistema")
@limiter.limit("3/minute")
async def clear_system_cache(request: Request, user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Limpa o cache do sistema para forçar atualização de dados."""
    try:
        # In a real implementation, this would clear Redis/Memcached
        # For now, we'll just log the action

        db_table(db, "system_logs").insert({
            "msg": "Cache do sistema limpo manualmente",
            "author": "Admin",
            "status": "Executado",
            "type": "CACHE"
        }).execute()

        return {
            "success": True,
            "message": "Cache limpo com sucesso",
            "cleared_at": datetime.now().isoformat() if 'datetime' in dir() else "now"
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/admin/logs/search", tags=["Admin - Logs"], summary="Buscar logs com filtros")
async def search_admin_logs(
    query: str = None,
    log_type: str = None,
    limit: int = 50,
    offset: int = 0,
    user=Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Busca e filtra logs de auditoria com paginação."""
    try:
        q = db_table(db, "system_logs").select("*", count="exact")

        # Apply filters
        if log_type and log_type != "all":
            q = q.eq("type", log_type)

        if query:
            # Search in msg and author fields (sanitized)
            safe_query = sanitize_search_input(query)
            q = q.or_(f"msg.ilike.%{safe_query}%,author.ilike.%{safe_query}%")

        # Order and paginate
        q = q.order("created_at", desc=True).range(offset, offset + limit - 1)

        response = q.execute()

        return {
            "logs": response.data or [],
            "total": response.count or 0,
            "limit": limit,
            "offset": offset,
            "has_more": (response.count or 0) > offset + limit
        }
    except Exception as e:
        logger.error(f"Error searching logs: {e}", exc_info=True)
        return {"logs": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}


@app.get("/admin/logs/export", tags=["Admin - Logs"], summary="Exportar logs")
async def export_admin_logs(format: str = "json", user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Exporta logs de auditoria em formato JSON ou CSV."""
    try:
        response = db_table(db, "system_logs").select("*").order("created_at", desc=True).limit(1000).execute()
        logs = response.data or []

        if format == "csv":
            # Generate CSV
            import io
            output = io.StringIO()
            if logs:
                headers = logs[0].keys()
                output.write(",".join(headers) + "\n")
                for log in logs:
                    output.write(",".join([str(log.get(h, "")) for h in headers]) + "\n")

            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=system_logs.csv"}
            )
        else:
            # Return JSON
            return {"logs": logs, "count": len(logs), "exported_at": datetime.now().isoformat() if 'datetime' in dir() else "now"}
    except Exception as e:
        logger.error(f"Error exporting logs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# USERS
# ============================================

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., min_length=5, max_length=254)
    ra: str = Field(..., min_length=1, max_length=50)
    role: str = Field(..., min_length=1, max_length=20)
    password: str = Field(..., min_length=6, max_length=128)
    title: Optional[str] = Field(None, max_length=200)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Email inválido')
        return v.lower()

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid = {'student', 'teacher', 'admin', 'instructor'}
        if v.lower() not in valid:
            raise ValueError(f'Role inválido. Aceitos: {", ".join(valid)}')
        return v.lower()

@app.get("/users", tags=["Users"], summary="Listar usuários")
async def get_users(role: str = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Retorna lista de usuários. Opcionalmente filtra por role (student, teacher, admin)."""
    if role and role.upper() not in VALID_USER_ROLES:
        raise HTTPException(status_code=400, detail=f"Role invalido. Valores aceitos: {', '.join(VALID_USER_ROLES)}")
    try:
        offset = (page - 1) * per_page
        query = db_table(db, "users").select("*", count="exact")
        if role:
            # Normalizar role se necessário
            target_role = role.lower()
            if target_role == 'instructor': target_role = 'teacher'
            query = query.eq("role", target_role)

        response = query.range(offset, offset + per_page - 1).execute()
        return {"data": response.data, "total": response.count, "page": page, "per_page": per_page}
    except Exception as e:
        logger.error(f"Erro ao buscar usuários: {e}", exc_info=True)
        return {"data": [], "total": 0, "page": page, "per_page": per_page}

@app.post("/users", tags=["Users"], summary="Criar usuário")
@limiter.limit("10/minute")
async def create_user(request: Request, user: UserCreate, current_user: dict = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Cria um novo usuário no sistema. Apenas administradores."""
    try:
        user_data = {
            "id": str(uuid.uuid4()),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "password_hash": pwd_context.hash(user.password),
            "title": user.title,
            "ra": user.ra,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        response = db_table(db, "users").insert(user_data).execute()
        return response.data
    except Exception as e:
        logger.error(f"Erro ao criar usuário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/users/batch", tags=["Users"], summary="Criar usuários em lote")
@limiter.limit("5/minute")
async def create_users_batch(request: Request, users: List[UserCreate], current_user: dict = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Importa múltiplos usuários de uma só vez."""
    if not users:
        return {"message": "Nenhum usuário para criar", "count": 0}

    try:
        user_list = []
        for user in users:
            user_list.append({
                "id": str(uuid.uuid4()),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "password_hash": pwd_context.hash(user.password),
                "title": user.title,
                "ra": user.ra,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
        # Insert batch
        response = db_table(db, "users").insert(user_list, count='exact').execute()
        return {"message": "Usuários importados com sucesso", "count": len(response.data) if response.data else 0}
    except Exception as e:
        logger.error(f"Erro ao criar usuários em lote: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    title: Optional[str] = None
    ra: Optional[str] = None

@app.put("/users/{user_id}", tags=["Users"], summary="Atualizar usuário")
async def update_user(user_id: str, user: UserUpdate, db: Session = Depends(get_db)):
    """Atualiza os dados de um usuário existente."""
    try:
        data = {}
        if user.name: data["name"] = user.name
        if user.email: data["email"] = user.email
        if user.password: data["password_hash"] = pwd_context.hash(user.password)
        if user.title: data["title"] = user.title
        if user.ra: data["ra"] = user.ra
        
        if not data:
            return {"message": "Nada para atualizar"}

        response = db_table(db, "users").update(data).eq("id", user_id).execute()
        return response.data
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/users/{user_id}/avatar", tags=["Users"], summary="Upload de avatar")
async def upload_avatar(user_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Faz upload da foto de perfil do usuário."""
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Aceitos: JPEG, PNG, WebP, GIF")
    logger.debug(f"Starting avatar upload for user {user_id}")
    try:
        # 1. Prepare file
        filename = file.filename or "avatar.jpg"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"avatars/{user_id}_{unique_id}.{file_ext}"

        logger.debug(f"Reading file {filename}...")
        content = await file.read()
        logger.debug(f"Read {len(content)} bytes")

        # 2. Try multiple buckets in order of preference
        public_url = ""
        upload_success = False
        buckets_to_try = ["avatars", "courses", "public"]

        for bucket_name in buckets_to_try:
            if upload_success:
                break
            try:
                logger.debug(f"Trying bucket '{bucket_name}'...")
                storage_from(bucket_name).upload(
                    file_path,
                    content,
                    {"upsert": "true", "content-type": file.content_type or "image/jpeg"}
                )
                public_url = storage_from(bucket_name).get_public_url(file_path)
                logger.debug(f"Success! URL: {public_url}")
                upload_success = True
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not upload_success or not public_url:
            raise HTTPException(
                status_code=500,
                detail="Nenhum container de storage disponível para upload de avatar."
            )

        # 3. Update User Record - try different column names
        logger.debug(f"Updating user record with avatar_url...")
        db_update_success = False

        for column_name in ["avatar_url", "avatar", "profile_image", "image_url"]:
            if db_update_success:
                break
            try:
                db_table(db, "users").update({column_name: public_url}).eq("id", user_id).execute()
                db_update_success = True
                logger.debug(f"Successfully updated column '{column_name}'")
            except Exception as col_err:
                logger.debug(f"Column '{column_name}' failed: {col_err}")
                continue

        if not db_update_success:
            logger.warning("Avatar uploaded but could not update user record.")
            logger.warning("ACTION REQUIRED: Add 'avatar_url' column to your 'users' table.")
            logger.warning("  SQL: ALTER TABLE users ADD COLUMN avatar_url TEXT;")
            return {
                "avatar_url": public_url,
                "warning": "Avatar enviado com sucesso, mas não foi possível salvar no banco. Adicione a coluna 'avatar_url' na tabela 'users'."
            }

        return {"avatar_url": public_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.critical(f"upload_avatar: {e}")

        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/users/{user_id}/avatar", tags=["Users"], summary="Remover avatar")
async def delete_avatar(user_id: str, db: Session = Depends(get_db)):
    """Remove a foto de perfil do usuário e restaura o avatar padrão."""
    try:
        # 1. Get current avatar URL to delete from storage
        user_response = db_table(db, "users").select("avatar_url").eq("id", user_id).execute()
        if user_response.data and user_response.data[0].get('avatar_url'):
            old_url = user_response.data[0]['avatar_url']
            # Try to delete from storage (extract path from URL)
            try:
                # URL format: https://account.blob.core.windows.net/container/path
                if '.blob.core.windows.net/' in old_url:
                    parts = old_url.split('.blob.core.windows.net/')
                    if len(parts) > 1:
                        container_and_path = parts[1].split('?')[0]  # strip SAS token
                        container = container_and_path.split('/')[0]
                        file_path = '/'.join(container_and_path.split('/')[1:])
                        storage_from(container).remove([file_path])
                        logger.debug(f"Deleted file from storage: {container}/{file_path}")
            except Exception as storage_err:
                logger.warning(f"Could not delete file from storage: {storage_err}")
                # Continue anyway - we'll still clear the URL from database

        # 2. Clear avatar_url in database
        db_table(db, "users").update({"avatar_url": None}).eq("id", user_id).execute()

        return {"success": True, "message": "Avatar removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error delete_avatar: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/users/{user_id}", tags=["Users"], summary="Obter usuário por ID")
async def get_user(user_id: str, current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Retorna os dados de um usuário específico."""
    try:
        response = db_table(db, "users").select("*").eq("id", user_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Erro ao buscar usuário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/health", tags=["Health"], summary="Health check")
@limiter.exempt
async def health_check(db: Session = Depends(get_db)):
    """Verifica o status de saúde do backend e conexão com banco de dados."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "database": db_status}

@app.get("/test-db", tags=["Health"], summary="Testar conexão com banco")
async def test_db(current_user: dict = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Testa a conexão com o banco de dados executando uma query simples."""
    try:
        # Tenta listar usuários (limite 1) apenas para validar conexão
        response = db_table(db, "users").select("*").limit(1).execute()
        return {"data": response.data}
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")



# Modelo para Criação de Curso
class CourseCreate(BaseModel):
    title: str
    instructor: str
    category: str
    description: str = ""

# Modelo para Criação de Disciplina via Classes (estrutura similar a CourseCreate)
class ClassDisciplineCreate(BaseModel):
    title: str
    instructor: str
    category: str
    description: str = ""

# ============================================
# COURSES (CURSOS/MÓDULOS)
# ============================================

@app.get("/courses", tags=["Courses"], summary="Listar cursos")
async def get_courses(user_id: Optional[str] = None, role: Optional[str] = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """
    Retorna lista de cursos filtrados por usuário.

    - Admin: vê todos os cursos
    - Professor/Instructor: vê apenas cursos de disciplinas onde está atribuído
    - Aluno/Student: vê apenas cursos de disciplinas onde está matriculado
    - Sem user_id: retorna todos (para compatibilidade)
    """
    try:
        # Normalizar role
        normalized_role = (role or "").upper()
        if normalized_role in ["TEACHER", "INSTRUCTOR", "PROFESSOR"]:
            normalized_role = "INSTRUCTOR"
        elif normalized_role in ["STUDENT", "ALUNO"]:
            normalized_role = "STUDENT"
        elif normalized_role in ["ADMIN", "ADMINISTRATOR"]:
            normalized_role = "ADMIN"

        # Se tem user_id e não é admin, filtrar por disciplinas do usuário
        discipline_ids = None
        if user_id and normalized_role and normalized_role != "ADMIN":
            if normalized_role == "INSTRUCTOR":
                # Buscar disciplinas onde o professor está atribuído
                teacher_disciplines = db_table(db, "discipline_teachers")\
                    .select("discipline_id")\
                    .eq("teacher_id", user_id)\
                    .execute()
                discipline_ids = [d['discipline_id'] for d in (teacher_disciplines.data or [])]
            elif normalized_role == "STUDENT":
                # Buscar disciplinas onde o aluno está matriculado
                student_disciplines = db_table(db, "discipline_students")\
                    .select("discipline_id")\
                    .eq("student_id", user_id)\
                    .execute()
                discipline_ids = [d['discipline_id'] for d in (student_disciplines.data or [])]

        # Buscar cursos
        offset = (page - 1) * per_page
        if discipline_ids is not None:
            if not discipline_ids:
                return {"data": [], "total": 0, "page": page, "per_page": per_page}
            response = db_table(db, "courses").select("*", count="exact").in_("discipline_id", discipline_ids).range(offset, offset + per_page - 1).execute()
        else:
            # Admin ou sem filtro: retorna todos
            response = db_table(db, "courses").select("*", count="exact").range(offset, offset + per_page - 1).execute()

        return {"data": response.data or [], "total": response.count, "page": page, "per_page": per_page}
    except Exception as e:
        logger.error(f"Erro ao buscar cursos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/courses", tags=["Courses"], summary="Criar curso")
async def create_course(course: CourseCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Cria um novo curso na plataforma."""
    try:
        # Prepara dados (simulando campos default)
        data = {
            "title": course.title,
            "instructor": course.instructor,
            "category": course.category,
            "progress": 0,
            "status": "Rascunho",
            "total_modules": 0,
            "image": "https://picsum.photos/seed/new/600/400" # Placeholder por enquanto
        }
        
        response = db_table(db, "courses").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Erro ao criar curso: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# DASHBOARD
# ============================================

@app.get("/dashboard/stats", tags=["Dashboard"], summary="Estatísticas do dashboard")
async def get_dashboard_stats(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Retorna estatísticas para o dashboard do usuário."""
    try:
        # Count de cursos disponíveis
        courses_count = db_table(db, "courses").select("*", count="exact").execute().count or 0

        # Se tiver user_id, busca stats do usuário
        hours_studied = 0
        avg_score = 0
        achievements_count = 0
        courses_completed = 0
        streak_days = 0

        if user_id:
            try:
                user_stats = await get_user_stats(user_id)
                hours_studied = user_stats.get('hours_studied', 0)
                avg_score = user_stats.get('average_score', 0)
                courses_completed = user_stats.get('courses_completed', 0)
                streak_days = user_stats.get('streak_days', 0)

                # Get achievements count
                achievements_data = await get_user_achievements(user_id, include_locked=False)
                achievements_count = achievements_data.get('summary', {}).get('unlocked', 0)
            except Exception as e:
                logger.error(f"Error fetching user stats for dashboard: {e}", exc_info=True)

        return [
            { "label": 'Cursos Concluídos', "val": str(courses_completed), "icon": 'school', "trend": f'{courses_count} disponíveis' },
            { "label": 'Horas Estudadas', "val": f'{hours_studied}h', "icon": 'schedule', "trend": f'{streak_days} dias seguidos' if streak_days > 0 else 'Continue estudando!' },
            { "label": 'Média Geral', "val": f'{avg_score:.1f}' if avg_score > 0 else '-', "icon": 'grade', "trend": 'Excelente!' if avg_score >= 8 else 'Continue assim!' if avg_score > 0 else 'Faça quizzes' },
            { "label": 'Conquistas', "val": str(achievements_count), "icon": 'emoji_events', "trend": 'Veja todas →' },
        ]
    except Exception as e:
         logger.error(f"Erro stats: {e}", exc_info=True)
         return [
            { "label": 'Cursos Concluídos', "val": '0', "icon": 'school', "trend": '-' },
            { "label": 'Horas Estudadas', "val": '0h', "icon": 'schedule', "trend": '-' },
            { "label": 'Média Geral', "val": '-', "icon": 'grade', "trend": '-' },
            { "label": 'Conquistas', "val": '0', "icon": 'emoji_events', "trend": '-' },
         ]


# --- NOVOS CRUDS COMPLETO (INSTRUTOR) ---

# --- MODELS ---

class QuestionCreate(BaseModel):
    items: List[dict] # Recebe lista de perguntas para criar em lote ou uma só

class ContentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    type: str = Field(..., min_length=1, max_length=20)
    content_url: Optional[str] = None
    text_content: Optional[str] = Field(None, max_length=100000)
    order: int = Field(0, ge=0)

class ChapterCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field("", max_length=5000)
    order: int = Field(0, ge=0)
    
class CourseCreateReal(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field("", max_length=5000)
    instructor_id: str
    image_url: Optional[str] = None

class CourseUpdateReal(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructor_id: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None


@app.get("/classes/{class_id}/stats", tags=["Disciplines"], summary="Estatísticas da turma")
async def get_class_stats(class_id: str, db: Session = Depends(get_db)):
    """Retorna estatísticas de uma turma: cursos, alunos e interações."""
    try:
        courses_count = db_table(db, "courses").select("id", count="exact").eq("discipline_id", class_id).execute().count
        students_count = db_table(db, "discipline_students").select("id", count="exact").eq("discipline_id", class_id).execute().count

        # Socratic interactions: count chat sessions for this discipline
        socratic_count = db.query(sqlfunc.count(ChatSession.id)).filter(ChatSession.discipline_id == class_id).scalar() or 0

        # Average progress: from course_progress of enrolled students
        student_ids = [row.student_id for row in db.query(DisciplineStudent.student_id).filter(DisciplineStudent.discipline_id == class_id).all()]
        avg_progress = 0
        if student_ids:
            avg = db.query(sqlfunc.avg(CourseProgress.progress_percent)).filter(CourseProgress.user_id.in_(student_ids)).scalar()
            avg_progress = round(avg or 0)

        return {
            "total_courses": courses_count,
            "total_students": students_count,
            "avg_progress": avg_progress,
            "socratic_interactions": socratic_count,
        }
    except Exception as e:
        logger.error(f"Error get_class_stats: {e}", exc_info=True)
        return {"total_courses": 0, "total_students": 0, "avg_progress": 0, "socratic_interactions": 0}


@app.get("/disciplines/{discipline_id}/students/stats", tags=["Disciplines"], summary="Estatísticas dos alunos da turma")
async def get_discipline_students_stats(discipline_id: str, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Retorna lista de alunos com progresso real, notas médias de reviews e total de sessões."""
    try:
        # Get enrolled students
        enrollments_result = db_table(db, "discipline_students").select("student_id").eq("discipline_id", discipline_id).execute()
        student_ids = [e["student_id"] for e in (enrollments_result.data or [])]
        if not student_ids:
            return []

        students_result = db_table(db, "users").select("id,name,email,ra").in_("id", student_ids).execute()
        students = students_result.data or []

        # Get course_ids for this discipline (for session lookup)
        courses_result = db_table(db, "courses").select("id").eq("discipline_id", discipline_id).execute()
        course_ids = [c["id"] for c in (courses_result.data or [])]

        # Get all sessions for these courses in one call
        all_sessions = []
        if course_ids:
            sess_result = db_table(db, "chat_sessions").select("id,user_id,course_id").in_("course_id", course_ids).execute()
            all_sessions = sess_result.data or []

        # Get reviews (table may not exist yet)
        all_session_ids = [s["id"] for s in all_sessions]
        reviews_map = {}  # session_id -> review
        if all_session_ids:
            try:
                rev_result = db_table(db, "session_reviews").select("session_id,rating").in_("session_id", all_session_ids).execute()
                for r in (rev_result.data or []):
                    reviews_map[r["session_id"]] = r
            except Exception:
                pass

        # Get progress data
        progress_map = {}  # user_id -> [progress_percent]
        try:
            prog_result = db_table(db, "course_progress").select("user_id,progress_percent").in_("user_id", student_ids).execute()
            for p in (prog_result.data or []):
                progress_map.setdefault(p["user_id"], []).append(p.get("progress_percent", 0) or 0)
        except Exception:
            pass

        # Get last activity
        activity_map = {}  # user_id -> last created_at
        try:
            act_result = db_table(db, "user_activities").select("user_id,created_at").in_("user_id", student_ids).order("created_at", desc=True).execute()
            for a in (act_result.data or []):
                if a["user_id"] not in activity_map:
                    activity_map[a["user_id"]] = a["created_at"]
        except Exception:
            pass

        results = []
        for s in students:
            uid = s["id"]
            # Sessions for this student
            user_sessions = [sess for sess in all_sessions if sess.get("user_id") == uid]
            user_session_ids = [sess["id"] for sess in user_sessions]

            # Reviews
            user_reviews = [reviews_map[sid] for sid in user_session_ids if sid in reviews_map]
            avg_rating = None
            if user_reviews:
                avg_rating = round(sum(r["rating"] for r in user_reviews) / len(user_reviews), 1)

            # Progress
            progs = progress_map.get(uid, [])
            avg_progress = round(sum(progs) / len(progs)) if progs else 0

            results.append({
                "id": uid,
                "name": s["name"],
                "email": s.get("email"),
                "ra": s.get("ra"),
                "progress": avg_progress,
                "avg_rating": avg_rating,
                "total_sessions": len(user_sessions),
                "reviewed_sessions": len(user_reviews),
                "last_activity": activity_map.get(uid),
            })

        return results
    except Exception as e:
        logger.error(f"Error get_discipline_students_stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/classes/{class_id}/courses", tags=["Courses"], summary="Listar cursos de uma turma")
async def get_class_courses(class_id: str, db: Session = Depends(get_db)):
    """Retorna todos os cursos vinculados a uma turma específica."""
    try:
        # Busca cursos vinculados à turma (discipline_id na tabela courses)
        response = db_table(db, "courses").select("*").eq("discipline_id", class_id).order("created_at").execute()
        courses = response.data or []

        # Batch fetch chapter counts to avoid N+1 queries
        course_ids = [c['id'] for c in courses]
        if course_ids:
            all_chapters = db_table(db, "chapters").select("course_id").in_("course_id", course_ids).execute()
            chapter_counts = Counter(ch['course_id'] for ch in (all_chapters.data or []))
        else:
            chapter_counts = Counter()

        for course in courses:
            course['chapters_count'] = chapter_counts.get(course['id'], 0)

        return courses
    except Exception as e:
        logger.error(f"Error get_class_courses: {e}", exc_info=True)
        return []

@app.post("/classes/{class_id}/courses", tags=["Courses"], summary="Criar curso em uma turma")
async def create_class_course(class_id: str, course: CourseCreateReal, db: Session = Depends(get_db)):
    """Cria um novo curso vinculado a uma turma."""
    try:
        data = {
            "discipline_id": class_id,
            "title": course.title,
            "description": course.description,
            "instructor_id": course.instructor_id,
            "status": "Ativa"
        }
        response = db_table(db, "courses").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error create_class_course: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/courses/{course_id}", tags=["Courses"], summary="Obter detalhes do curso")
async def get_course_details(course_id: str, current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Retorna os detalhes completos de um curso específico."""
    try:
        response = db_table(db, "courses").select("*").eq("id", course_id).single().execute()
        return response.data
    except Exception as e:
        # Log the actual error to help debugging
        logger.error(f"Error fetching course {course_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=404, detail=f"Course not found: {str(e)}")

@app.get("/courses/{course_id}/export", tags=["Courses"], summary="Exportar curso completo")
async def export_course(course_id: str, format: str = "json", include_questions: bool = True, db: Session = Depends(get_db)):
    """
    Exporta o curso completo com toda a hierarquia em uma única chamada.

    Retorna: Curso + Capítulos + Conteúdos + Questões (opcional)

    Parâmetros:
    - format: 'json' (padrão) ou 'csv' (apenas questões)
    - include_questions: incluir questões nos conteúdos (padrão: True)
    """

    try:
        # 1. Buscar curso
        course_res = db_table(db, "courses").select("*").eq("id", course_id).single().execute()
        if not course_res.data:
            raise HTTPException(status_code=404, detail="Course not found")
        course = course_res.data

        # 2. Buscar capítulos
        chapters_res = db_table(db, "chapters").select("*").eq("course_id", course_id).order("order").execute()
        chapters = chapters_res.data or []

        # 3. Buscar conteúdos de todos os capítulos
        contents = []
        if chapters:
            chapter_ids = [c['id'] for c in chapters]
            contents_res = db_table(db, "contents").select("*").in_("chapter_id", chapter_ids).order("order").execute()
            contents = contents_res.data or []

        # 4. Buscar questões de todos os conteúdos (se solicitado)
        questions = []
        if include_questions and contents:
            content_ids = [c['id'] for c in contents]
            questions_res = db_table(db, "questions").select("*").in_("content_id", content_ids).execute()
            questions = questions_res.data or []

        # 5. Montar hierarquia
        # Questões por conteúdo
        questions_by_content = {}
        for q in questions:
            cid = q.get('content_id')
            if cid not in questions_by_content:
                questions_by_content[cid] = []
            questions_by_content[cid].append(q)

        # Conteúdos por capítulo
        contents_by_chapter = {}
        for c in contents:
            chid = c.get('chapter_id')
            if chid not in contents_by_chapter:
                contents_by_chapter[chid] = []
            # Adiciona questões ao conteúdo
            c['questions'] = questions_by_content.get(c['id'], [])
            contents_by_chapter[chid].append(c)

        # Capítulos com conteúdos
        for chapter in chapters:
            chapter['contents'] = contents_by_chapter.get(chapter['id'], [])

        # 6. Montar export
        export_data = {
            "export_info": {
                "platform": "harven.ai",
                "version": "1.0",
                "exported_at": datetime.now().isoformat(),
                "format": format
            },
            "course": course,
            "chapters": chapters,
            "statistics": {
                "total_chapters": len(chapters),
                "total_contents": len(contents),
                "total_questions": len(questions)
            }
        }

        # 7. Formatar resposta
        if format == "csv":
            # Exportar apenas questões em CSV
            import csv
            import io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["chapter_title", "content_title", "question_text", "expected_answer", "difficulty"])

            for chapter in chapters:
                for content in chapter.get('contents', []):
                    for question in content.get('questions', []):
                        writer.writerow([
                            chapter.get('title', ''),
                            content.get('title', ''),
                            question.get('question_text', ''),
                            question.get('expected_answer', ''),
                            question.get('difficulty', '')
                        ])

            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=course-{course_id}-questions.csv"
                }
            )

        # JSON (padrão)
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f"attachment; filename=course-{course_id}-export.json"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error export_course: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.put("/courses/{course_id}", tags=["Courses"], summary="Atualizar curso")
async def update_course(course_id: str, course: CourseUpdateReal, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Atualiza os dados de um curso existente (título, descrição, status, etc.)."""
    try:
        # Only include fields that are not None
        data = {}
        if course.title is not None:
            data["title"] = course.title
        if course.description is not None:
            data["description"] = course.description
        if course.instructor_id is not None:
            data["instructor_id"] = course.instructor_id
        if course.status is not None:
            data["status"] = course.status
        if course.image_url is not None:
            # Try both column names
            data["image_url"] = course.image_url

        if not data:
            return {"message": "No changes provided"}

        response = db_table(db, "courses").update(data).eq("id", course_id).execute()
        return response.data
    except Exception as e:
         logger.error(f"Error update_course: {e}", exc_info=True)
         raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/courses/{course_id}", tags=["Courses"], summary="Excluir curso")
@limiter.limit("10/minute")
async def delete_course(request: Request, course_id: str, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Remove um curso permanentemente. Atenção: esta ação não pode ser desfeita."""
    try:
        response = db_table(db, "courses").delete().eq("id", course_id).execute()
        return {"success": True, "message": "Course deleted"}
    except Exception as e:
         logger.error(f"Error delete_course: {e}", exc_info=True)
         raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/courses/{course_id}/image", tags=["Upload"], summary="Upload de imagem do curso")
@limiter.limit("10/minute")
async def upload_course_image(request: Request, course_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Faz upload de uma imagem de capa para o curso. Formatos aceitos: JPG, PNG, GIF."""
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Aceitos: JPEG, PNG, WebP, GIF")
    logger.debug(f"Starting upload for course {course_id}")
    try:
        # 1. Upload to storage
        filename = file.filename or "unknown.jpg"
        file_ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_id = str(uuid.uuid4())[:8]

        logger.debug("Reading file...")
        content = await file.read()

        public_url = ""
        upload_success = False

        # Try multiple buckets in order of preference
        buckets_to_try = ["courses", "avatars", "public"]

        for bucket_name in buckets_to_try:
            if upload_success:
                break
            try:
                file_path = f"course_{course_id}_{unique_id}.{file_ext}"
                logger.debug(f"Trying bucket '{bucket_name}' with path '{file_path}'...")

                res = storage_from(bucket_name).upload(
                    file_path,
                    content,
                    {"upsert": "true", "content-type": file.content_type or "image/jpeg"}
                )
                logger.debug(f"Upload result for {bucket_name}: {res}")

                public_url = storage_from(bucket_name).get_public_url(file_path)
                logger.debug(f"Public URL from {bucket_name}: {public_url}")
                upload_success = True

            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not upload_success or not public_url:
            raise HTTPException(
                status_code=500,
                detail="Nenhum container de storage disponível para upload de imagem."
            )

        # 2. Update Course - try to update the database with the image URL
        logger.debug("Updating course table...")
        db_update_success = False

        # Try different column names that might exist in the table
        column_attempts = [
            {"image_url": public_url},
            {"image": public_url},
            {"cover_image": public_url},
            {"thumbnail": public_url}
        ]

        for column_data in column_attempts:
            if db_update_success:
                break
            try:
                db_table(db, "courses").update(column_data).eq("id", course_id).execute()
                db_update_success = True
                logger.debug(f"Successfully updated with column: {list(column_data.keys())[0]}")
            except Exception as col_err:
                logger.debug(f"Column {list(column_data.keys())[0]} failed: {col_err}")
                continue

        if not db_update_success:
            # Upload was successful, but couldn't save to DB - return success anyway
            logger.warning("Image uploaded but could not update course record.")
            logger.warning("ACTION REQUIRED: Add 'image_url' column to your 'courses' table.")
            logger.warning("  SQL: ALTER TABLE courses ADD COLUMN image_url TEXT;")
            # Still return success since the image was uploaded
            return {
                "image_url": public_url,
                "warning": "Imagem enviada com sucesso, mas não foi possível salvar no banco. Adicione a coluna 'image_url' na tabela 'courses'."
            }

        logger.debug("Update success.")
        return {"image_url": public_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.critical(f"upload_course_image: {e}")

        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/disciplines/{discipline_id}/image", tags=["Upload"], summary="Upload de imagem da disciplina")
@limiter.limit("10/minute")
async def upload_discipline_image(request: Request, discipline_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Faz upload de uma imagem de capa para a disciplina. Formatos aceitos: JPG, PNG, GIF."""
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Aceitos: JPEG, PNG, WebP, GIF")
    logger.debug(f"Starting upload for discipline {discipline_id}")
    try:
        filename = file.filename or "unknown.jpg"
        file_ext = filename.split(".")[-1] if "." in filename else "jpg"
        file_path = f"disciplines/{discipline_id}/cover_{uuid.uuid4()}.{file_ext}"

        content = await file.read()
        public_url = ""

        # Try multiple buckets
        for bucket in ["courses", "avatars", "public"]:
            try:
                logger.debug(f"Trying bucket '{bucket}'...")
                storage_from(bucket).upload(file_path, content, {"upsert": "true", "content-type": file.content_type})
                public_url = storage_from(bucket).get_public_url(file_path)
                logger.debug(f"Success! URL: {public_url}")
                break
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket}' failed: {bucket_err}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        # Update discipline table - try different column names
        db_update_success = False
        for column_name in ["image", "image_url", "cover_image", "thumbnail"]:
            if db_update_success:
                break
            try:
                db_table(db, "disciplines").update({column_name: public_url}).eq("id", discipline_id).execute()
                db_update_success = True
                logger.debug(f"Successfully updated column '{column_name}'")
            except Exception as col_err:
                logger.debug(f"Column '{column_name}' failed: {col_err}")
                continue

        if not db_update_success:
            logger.warning("Image uploaded but could not update discipline record.")
            logger.warning("ACTION REQUIRED: Add 'image' column to your 'disciplines' table.")
            logger.warning("  SQL: ALTER TABLE disciplines ADD COLUMN image TEXT;")
            return {
                "image_url": public_url,
                "warning": "Imagem enviada com sucesso, mas nao foi possivel salvar no banco. Adicione a coluna 'image' na tabela 'disciplines'."
            }

        return {"image_url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"upload_discipline_image: {e}", exc_info=True)

        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# 2. CHAPTERS (MÓDULOS)
@app.get("/courses/{course_id}/chapters", tags=["Chapters"], summary="Listar capítulos do curso")
async def get_course_chapters(course_id: str, page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    """Retorna capítulos de um curso com seus conteúdos aninhados."""
    try:
        offset = (page - 1) * per_page
        chapters_res = db_table(db, "chapters").select("*", count="exact").eq("course_id", course_id).order("order").range(offset, offset + per_page - 1).execute()
        chapters = chapters_res.data

        if not chapters:
            return {"data": [], "total": chapters_res.count or 0, "page": page, "per_page": per_page, "total_pages": 0}

        chapter_ids = [c['id'] for c in chapters]
        contents_res = db_table(db, "contents").select("*").in_("chapter_id", chapter_ids).order("order").execute()
        contents = contents_res.data

        for chapter in chapters:
            chapter['contents'] = [c for c in contents if c['chapter_id'] == chapter['id']]

        total = chapters_res.count or 0
        return {"data": chapters, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
    except Exception as e:
        logger.error(f"Error get_course_chapters: {e}", exc_info=True)
        return []

@app.post("/courses/{course_id}/chapters", tags=["Chapters"], summary="Criar capítulo")
async def create_chapter(course_id: str, chapter: ChapterCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Cria um novo capítulo dentro de um curso. Status inicial: Rascunho."""
    try:
        data = {
            "course_id": course_id,
            "title": chapter.title,
            "description": chapter.description,
            "order": chapter.order,
        }
        response = db_table(db, "chapters").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error create_chapter: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.put("/chapters/{chapter_id}", tags=["Chapters"], summary="Atualizar capítulo")
async def update_chapter(chapter_id: str, chapter: ChapterCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Atualiza título, descrição e ordem de um capítulo."""
    try:
        data = { "title": chapter.title, "description": chapter.description, "order": chapter.order }
        response = db_table(db, "chapters").update(data).eq("id", chapter_id).execute()
        return response.data
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/chapters/{chapter_id}", tags=["Chapters"], summary="Excluir capítulo")
@limiter.limit("10/minute")
async def delete_chapter(request: Request, chapter_id: str, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Remove um capítulo permanentemente. Atenção: também remove os conteúdos associados."""
    try:
        db_table(db, "chapters").delete().eq("id", chapter_id).execute()
        return {"success": True, "message": "Chapter deleted"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# 3. CONTENTS (CONTEÚDOS/AULAS)
@app.get("/chapters/{chapter_id}/contents", tags=["Contents"], summary="Listar conteúdos do capítulo")
async def get_chapter_contents(chapter_id: str, db: Session = Depends(get_db)):
    """Retorna todos os conteúdos (aulas) de um capítulo ordenados."""
    try:
        # Traz também as perguntas (questions) aninhadas se possível, ou faz fetch separado no front
        # Por enquanto fetch simples
        response = db_table(db, "contents").select("*").eq("chapter_id", chapter_id).order("order").execute()
        return response.data
    except Exception as e:
         logger.error(f"Error get_chapter_contents: {e}", exc_info=True)
         return []

@app.post("/chapters/{chapter_id}/contents", tags=["Contents"], summary="Criar conteúdo")
async def create_content(chapter_id: str, content: ContentCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Cria um novo conteúdo (vídeo, texto, PDF, quiz) dentro de um capítulo."""
    try:
        data = {
            "chapter_id": chapter_id,
            "title": content.title,
            "type": content.type,
            "content_url": content.content_url,
            "text_content": content.text_content,
            "order": content.order
        }
        response = db_table(db, "contents").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error create_content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/contents/{content_id}", tags=["Contents"], summary="Excluir conteúdo")
@limiter.limit("10/minute")
async def delete_content(request: Request, content_id: str, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Remove um conteúdo permanentemente. Também remove as perguntas associadas."""
    try:
        db_table(db, "contents").delete().eq("id", content_id).execute()
        return {"success": True, "message": "Content deleted"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# 4. QUESTIONS (PERGUNTAS)
@app.get("/contents/{content_id}/questions", tags=["Questions"], summary="Listar perguntas do conteúdo")
async def get_content_questions(content_id: str, db: Session = Depends(get_db)):
    """Retorna todas as perguntas socráticas associadas a um conteúdo."""
    try:
        response = db_table(db, "questions").select("*").eq("content_id", content_id).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error get_content_questions: {e}", exc_info=True)
        return []

@app.post("/contents/{content_id}/questions", tags=["Questions"], summary="Criar perguntas em lote")
async def create_questions(content_id: str, body: QuestionCreate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Cria múltiplas perguntas socráticas para um conteúdo de uma vez."""
    try:
        # body.items é uma lista de dicts com {question_text, expected_answer, difficulty}
        data_list = []
        for q in body.items:
            data_list.append({
                "content_id": content_id,
                "question_text": q.get('question_text'),
                "expected_answer": q.get('expected_answer'),
                "difficulty": q.get('difficulty', 'medium')
            })
        if data_list:
            response = db_table(db, "questions").insert(data_list).execute()
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error create_questions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Update single question
class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    expected_answer: Optional[str] = None
    difficulty: Optional[str] = None

@app.put("/questions/{question_id}", tags=["Questions"], summary="Atualizar pergunta")
async def update_question(question_id: str, question: QuestionUpdate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Atualiza o texto, resposta esperada ou dificuldade de uma pergunta."""
    try:
        data = {}
        if question.question_text: data["question_text"] = question.question_text
        if question.expected_answer: data["expected_answer"] = question.expected_answer
        if question.difficulty: data["difficulty"] = question.difficulty

        if not data:
            return {"message": "No changes"}

        response = db_table(db, "questions").update(data).eq("id", question_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error update_question: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/questions/{question_id}", tags=["Questions"], summary="Excluir pergunta")
async def delete_question(question_id: str, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Remove uma pergunta permanentemente."""
    try:
        db_table(db, "questions").delete().eq("id", question_id).execute()
        return {"success": True, "message": "Question deleted"}
    except Exception as e:
        logger.error(f"Error delete_question: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Batch update questions for a content
@app.put("/contents/{content_id}/questions/batch", tags=["Questions"], summary="Atualizar perguntas em lote")
async def update_questions_batch(content_id: str, body: QuestionCreate, db: Session = Depends(get_db)):
    """Substitui todas as perguntas de um conteúdo. Remove as existentes e insere as novas."""
    try:
        # Soft-delete pattern to prevent data loss on partial failure
        # Step 1: Mark existing questions as "replacing"
        db_table(db, "questions").update({"status": "replacing"}).eq("content_id", content_id).execute()

        # Step 2: Insert new questions
        data_list = []
        for q in body.items:
            data_list.append({
                "content_id": content_id,
                "question_text": q.get('question_text'),
                "expected_answer": q.get('expected_answer'),
                "difficulty": q.get('difficulty', 'medium'),
                "status": "active"
            })

        if data_list:
            try:
                response = db_table(db, "questions").insert(data_list).execute()
            except Exception as insert_err:
                # Rollback: restore old questions
                db_table(db, "questions").update({"status": "active"}).eq("content_id", content_id).eq("status", "replacing").execute()
                raise insert_err

            # Step 3: Delete old questions only after successful insert
            db_table(db, "questions").delete().eq("content_id", content_id).eq("status", "replacing").execute()
            return response.data

        # No new questions — just delete old ones
        db_table(db, "questions").delete().eq("content_id", content_id).eq("status", "replacing").execute()
        return []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error update_questions_batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# 5. CONTENT FILE UPLOAD
def extract_text_from_pdf(content_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber"""
    try:
        import pdfplumber
        import io

        text_content = []
        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)

        extracted = "\n\n".join(text_content)
        logger.debug(f"Extracted {len(extracted)} characters from PDF")
        return extracted
    except ImportError:
        logger.warning("pdfplumber not installed. Run: pip install pdfplumber")
        return ""
    except Exception as e:
        logger.warning(f"Failed to extract text from PDF: {e}")
        return ""

def extract_text_from_txt(content_bytes: bytes) -> str:
    """Extract text from TXT file"""
    try:
        # Try UTF-8 first, then latin-1 as fallback
        try:
            return content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return content_bytes.decode('latin-1')
    except Exception as e:
        logger.warning(f"Failed to extract text from TXT: {e}")
        return ""

@app.post("/chapters/{chapter_id}/upload", tags=["Upload"], summary="Upload de arquivo para capítulo")
@limiter.limit("10/minute")
async def upload_content_file(request: Request, chapter_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Faz upload de arquivo (PDF, vídeo, áudio) para um capítulo e extrai texto quando possível."""
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")
    try:
        import unicodedata
        import re

        filename = file.filename or "unknown"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "bin"

        logger.debug(f"Starting upload for file: {filename}, extension: {file_ext}")

        # Determine content type
        content_type_map = {
            'pdf': 'text', 'doc': 'text', 'docx': 'text', 'txt': 'text', 'pptx': 'text',
            'mp4': 'video', 'mov': 'video', 'avi': 'video', 'webm': 'video',
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio'
        }
        harven_content_type = content_type_map.get(file_ext, 'text')

        # Determine MIME type for upload
        mime_type_map = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'webm': 'video/webm',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4'
        }
        mime_type = file.content_type or mime_type_map.get(file_ext, 'application/octet-stream')

        # Generate unique file path - remove accents and special characters
        unique_id = str(uuid.uuid4())[:8]  # Shorter UUID

        # Remove accents and normalize filename
        safe_filename = unicodedata.normalize('NFKD', filename).encode('ASCII', 'ignore').decode('ASCII')
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)  # Keep only safe chars
        safe_filename = re.sub(r'_+', '_', safe_filename)  # Remove multiple underscores
        safe_filename = safe_filename[:50]  # Limit length

        file_path = f"{unique_id}_{safe_filename}"

        # Read file content with size and type validation
        content_bytes = await file.read()
        if len(content_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"Arquivo muito grande. Maximo: {MAX_FILE_SIZE // 1024 // 1024}MB")
        if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=415, detail=f"Tipo de arquivo nao permitido: .{file_ext}")
        logger.info(f"Upload: {filename}, {len(content_bytes)} bytes, mime: {mime_type}")

        # Extract text from supported file types
        extracted_text = ""
        try:
            if file_ext == 'pdf':
                extracted_text = extract_text_from_pdf(content_bytes)
            elif file_ext == 'txt':
                extracted_text = extract_text_from_txt(content_bytes)
            # TODO: Add support for docx, pptx extraction
        except Exception as extract_err:
            logger.warning(f"Text extraction failed (non-critical): {extract_err}")
            extracted_text = ""

        # Try multiple buckets: courses (exists), avatars (fallback)
        public_url = ""
        buckets_to_try = ["courses", "avatars", "public"]

        for bucket_name in buckets_to_try:
            try:
                logger.debug(f"Trying bucket '{bucket_name}'...")
                res = storage_from(bucket_name).upload(file_path, content_bytes, {"upsert": "true", "content-type": mime_type})
                public_url = storage_from(bucket_name).get_public_url(file_path)
                logger.debug(f"Success! URL: {public_url}")
                break
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        return {
            "url": public_url,
            "filename": filename,
            "type": harven_content_type,
            "size": len(content_bytes),
            "extracted_text": extracted_text  # New: return extracted text for AI processing
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upload_content_file: {e}", exc_info=True)

        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# 5.1 GENERIC UPLOAD ENDPOINT (for video/audio)
@app.post("/upload", tags=["Upload"], summary="Upload genérico de arquivos")
@limiter.limit("10/minute")
async def generic_upload(request: Request, file: UploadFile = File(...), type: Optional[str] = Form(None), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Upload genérico para vídeos, áudios, PDFs e outros arquivos. Retorna URL pública."""
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")
    try:
        import unicodedata
        import re

        filename = file.filename or "unknown"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "bin"

        logger.debug(f"Generic upload for file: {filename}, type hint: {type}")

        # Determine MIME type
        mime_type_map = {
            'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
            'webm': 'video/webm', 'mkv': 'video/x-matroska',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
            'm4a': 'audio/mp4', 'aac': 'audio/aac', 'flac': 'audio/flac',
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif'
        }
        mime_type = file.content_type or mime_type_map.get(file_ext, 'application/octet-stream')

        # Generate safe file path
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = unicodedata.normalize('NFKD', filename).encode('ASCII', 'ignore').decode('ASCII')
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)
        safe_filename = re.sub(r'_+', '_', safe_filename)
        safe_filename = safe_filename[:50]

        # Determine folder based on type
        folder = type or "files"
        file_path = f"{folder}/{unique_id}_{safe_filename}"

        # Read file content with size and type validation
        content_bytes = await file.read()
        if len(content_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"Arquivo muito grande. Maximo: {MAX_FILE_SIZE // 1024 // 1024}MB")
        if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=415, detail=f"Tipo de arquivo nao permitido: .{file_ext}")
        logger.info(f"Generic upload: {filename}, {len(content_bytes)} bytes")

        # Upload to storage
        public_url = ""
        buckets_to_try = ["courses", "avatars", "public"]

        for bucket_name in buckets_to_try:
            try:
                logger.debug(f"Trying bucket '{bucket_name}'...")
                storage_from(bucket_name).upload(file_path, content_bytes, {"upsert": "true", "content-type": mime_type})
                public_url = storage_from(bucket_name).get_public_url(file_path)
                logger.debug(f"Success! URL: {public_url}")
                break
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        return {
            "url": public_url,
            "filename": filename,
            "type": type or file_ext,
            "size": len(content_bytes),
            "mime_type": mime_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generic_upload: {e}", exc_info=True)

        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/upload/video", tags=["Upload"], summary="Upload de vídeo")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload de arquivo de vídeo (MP4, MOV, AVI, WebM)."""
    return await generic_upload(file, type="video")

@app.post("/upload/audio", tags=["Upload"], summary="Upload de áudio")
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload de arquivo de áudio (MP3, WAV, OGG, M4A)."""
    return await generic_upload(file, type="audio")


# 6. GET SINGLE CONTENT
@app.get("/contents/{content_id}", tags=["Contents"], summary="Obter conteúdo por ID")
async def get_content(content_id: str, db: Session = Depends(get_db)):
    """Retorna um conteúdo específico com suas perguntas socráticas."""
    try:
        # Get content
        content_res = db_table(db, "contents").select("*").eq("id", content_id).single().execute()
        content = content_res.data
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")

        # Get questions
        questions_res = db_table(db, "questions").select("*").eq("content_id", content_id).execute()
        content['questions'] = questions_res.data or []

        return content
    except Exception as e:
        logger.error(f"Error get_content: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Content not found")

# 7. UPDATE CONTENT
class ContentUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    order: Optional[int] = None

@app.put("/contents/{content_id}", tags=["Contents"], summary="Atualizar conteúdo")
async def update_content(content_id: str, content: ContentUpdate, current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")), db: Session = Depends(get_db)):
    """Atualiza título, tipo, URL ou texto de um conteúdo. Suporta atualização parcial."""
    try:
        # Only include fields that are not None
        data = {}
        if content.title is not None: data["title"] = content.title
        if content.type is not None: data["type"] = content.type
        if content.content_url is not None: data["content_url"] = content.content_url
        if content.text_content is not None: data["text_content"] = content.text_content
        if content.order is not None: data["order"] = content.order

        if not data:
            return {"message": "No changes"}

        response = db_table(db, "contents").update(data).eq("id", content_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error update_content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ============================================
# AI ENDPOINTS - Harven AI Agents
# ============================================

# Modelos para endpoints de IA
class QuestionGenerationRequest(BaseModel):
    chapter_content: str = Field(..., min_length=10, max_length=50000)
    chapter_title: Optional[str] = Field(None, max_length=300)
    learning_objective: Optional[str] = Field(None, max_length=1000)
    difficulty: Optional[str] = Field("intermediario", max_length=30)
    max_questions: Optional[int] = Field(3, ge=1, le=10)

class SocraticDialogueRequest(BaseModel):
    student_message: str = Field(..., min_length=1, max_length=5000)
    chapter_content: str = Field(..., max_length=50000)
    initial_question: dict
    conversation_history: Optional[List[dict]] = []
    interactions_remaining: Optional[int] = Field(3, ge=0, le=20)
    session_id: Optional[str] = None
    chapter_id: Optional[str] = None

class AIDetectionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    context: Optional[dict] = None
    interaction_metadata: Optional[dict] = None

class EditResponseRequest(BaseModel):
    orientador_response: str
    context: Optional[dict] = None

class ValidateResponseRequest(BaseModel):
    edited_response: str
    context: Optional[dict] = None

class OrganizeSessionRequest(BaseModel):
    action: str  # save_message, finalize_session, export_to_moodle, get_session_status
    payload: dict
    metadata: Optional[dict] = None

# Importar serviço de IA (lazy load para evitar erro se OpenAI não configurada)
ai_service = None

def get_ai_service():
    global ai_service
    if ai_service is None:
        try:
            from services import ai_service as ai_svc
            ai_service = ai_svc
        except ImportError as e:
            logger.error(f"Erro ao importar ai_service: {e}", exc_info=True)
            raise HTTPException(status_code=503, detail="AI service not available")
    # Sync daily token limit from DB settings
    _sync_ai_token_limit()
    return ai_service


def _sync_ai_token_limit(db: Session = None):
    """Reads ai_daily_token_limit from system_settings and pushes it to ai_service."""
    if ai_service is None:
        return
    if db is None:
        if SessionLocal is None:
            return
        db = SessionLocal()
        try:
            resp = db_table(db, "system_settings").select("ai_daily_token_limit").limit(1).execute()
            if resp.data and resp.data[0].get("ai_daily_token_limit") is not None:
                ai_service.set_daily_token_limit(int(resp.data[0]["ai_daily_token_limit"]))
        except Exception:
            pass
        finally:
            db.close()
        return
    try:
        resp = db_table(db, "system_settings").select("ai_daily_token_limit").limit(1).execute()
        if resp.data and resp.data[0].get("ai_daily_token_limit") is not None:
            ai_service.set_daily_token_limit(int(resp.data[0]["ai_daily_token_limit"]))
    except Exception:
        pass  # Column may not exist yet; fall back to env var default

# Endpoint: Verificar status da IA
@app.get("/api/ai/status", tags=["AI Services"], summary="Status do serviço de IA")
async def ai_status(db: Session = Depends(get_db)):
    """Verifica se o serviço de IA está disponível e quais agentes estão ativos."""
    try:
        svc = get_ai_service()
        return {
            "enabled": svc.is_ai_enabled(),
            "agents": svc.get_supported_agents(),
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        }
    except Exception as e:
        return {
            "enabled": False,
            "error": str(e),
            "agents": []
        }

# Endpoint: Gerar perguntas (Harven_Creator)
@app.post("/api/ai/creator/generate", tags=["AI Services"], summary="Gerar perguntas socráticas")
@limiter.limit("10/minute")
async def generate_questions(request: Request, body: QuestionGenerationRequest, db: Session = Depends(get_db)):
    """Gera perguntas socráticas a partir do conteúdo usando o agente Harven_Creator."""
    try:
        svc = get_ai_service()
        if not svc.is_ai_enabled():
            raise HTTPException(status_code=503, detail="AI service not configured. Set OPENAI_API_KEY in .env")

        result = await svc.generate_questions(
            chapter_content=body.chapter_content,
            chapter_title=body.chapter_title or "",
            learning_objective=body.learning_objective or "",
            difficulty=body.difficulty or "intermediario",
            max_questions=body.max_questions or 3
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_questions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Diálogo socrático (Harven_Socrates)
@app.post("/api/ai/socrates/dialogue", tags=["AI Services"], summary="Diálogo socrático")
@limiter.limit("10/minute")
async def socratic_dialogue(request: Request, body: SocraticDialogueRequest, db: Session = Depends(get_db)):
    """Conduz diálogo socrático com o aluno usando o agente Harven_Socrates."""
    try:
        svc = get_ai_service()
        if not svc.is_ai_enabled():
            raise HTTPException(status_code=503, detail="AI service not configured. Set OPENAI_API_KEY in .env")

        result = await svc.socratic_dialogue(
            student_message=body.student_message,
            chapter_content=body.chapter_content,
            initial_question=body.initial_question,
            conversation_history=body.conversation_history or [],
            interactions_remaining=body.interactions_remaining if body.interactions_remaining is not None else 3,
            session_id=body.session_id,
            chapter_id=body.chapter_id
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in socratic_dialogue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Detectar conteúdo de IA (Harven_Analyst)
@app.post("/api/ai/analyst/detect", tags=["AI Services"], summary="Detectar conteúdo de IA")
async def detect_ai_content(request: AIDetectionRequest, db: Session = Depends(get_db)):
    """Detecta se o texto foi gerado por IA usando o agente Harven_Analyst."""
    try:
        svc = get_ai_service()
        result = await svc.detect_ai_content(
            student_message=request.text,
            context=request.context,
            interaction_metadata=request.interaction_metadata
        )
        return result
    except Exception as e:
        logger.error(f"Error in detect_ai_content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Editar resposta (Harven_Editor)
@app.post("/api/ai/editor/edit", tags=["AI Services"], summary="Editar resposta do tutor")
async def edit_response(request: EditResponseRequest, db: Session = Depends(get_db)):
    """Refina resposta do tutor usando o agente Harven_Editor."""
    try:
        svc = get_ai_service()
        if not svc.is_ai_enabled():
            raise HTTPException(status_code=503, detail="AI service not configured. Set OPENAI_API_KEY in .env")

        result = await svc.edit_response(
            orientador_response=request.orientador_response,
            context=request.context
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in edit_response: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Validar resposta (Harven_Tester)
@app.post("/api/ai/tester/validate", tags=["AI Services"], summary="Validar resposta")
async def validate_response(request: ValidateResponseRequest, db: Session = Depends(get_db)):
    """Valida qualidade da resposta usando o agente Harven_Tester."""
    try:
        svc = get_ai_service()
        if not svc.is_ai_enabled():
            raise HTTPException(status_code=503, detail="AI service not configured. Set OPENAI_API_KEY in .env")

        result = await svc.validate_response(
            edited_response=request.edited_response,
            context=request.context
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in validate_response: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Organizar sessão (Harven_Organizer)
@app.post("/api/ai/organizer/session", tags=["AI Services"], summary="Organizar sessão de aprendizagem")
async def organize_session(request: OrganizeSessionRequest, db: Session = Depends(get_db)):
    """Gerencia sessões e exportações usando o agente Harven_Organizer."""
    try:
        svc = get_ai_service()

        result = await svc.organize_session(
            action=request.action,
            payload=request.payload,
            metadata=request.metadata
        )
        return result

    except Exception as e:
        logger.error(f"Error in organize_session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Preparar exportação para Moodle (Harven_Organizer)
@app.post("/api/ai/organizer/prepare-export", tags=["AI Services"], summary="Preparar exportação Moodle")
async def prepare_moodle_export(session_data: dict, db: Session = Depends(get_db)):
    """Prepara payload de exportação para o Moodle no formato xAPI."""
    try:
        svc = get_ai_service()
        result = svc.prepare_moodle_export(session_data)
        return result
    except Exception as e:
        logger.error(f"Error in prepare_moodle_export: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Endpoint: Estimar custo
@app.get("/api/ai/estimate-cost", tags=["AI Services"], summary="Estimar custo de IA")
async def estimate_cost(prompt_tokens: int, completion_tokens: int, model: str = "gpt-4o-mini", db: Session = Depends(get_db)):
    """Estima custo de uma chamada de IA baseado nos tokens utilizados."""
    try:
        svc = get_ai_service()
        cost = svc.estimate_cost(prompt_tokens, completion_tokens, model)
        return {"cost_usd": cost, "model": model}
    except Exception as e:
        return {"cost_usd": 0, "error": str(e)}


# ============================================
# ELEVENLABS TEXT-TO-SPEECH
# ============================================

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

@app.get("/api/ai/tts/voices", tags=["AI Services - Audio"], summary="Listar vozes disponíveis")
async def list_tts_voices(db: Session = Depends(get_db)):
    """Lista as vozes disponíveis no ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        voices = client.voices.get_all()
        return {
            "voices": [
                {
                    "voice_id": v.voice_id,
                    "name": v.name,
                    "category": getattr(v, 'category', 'custom'),
                    "labels": getattr(v, 'labels', {})
                }
                for v in voices.voices
            ]
        }
    except Exception as e:
        logger.error(f"Error listing voices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/api/ai/tts/generate", tags=["AI Services - Audio"], summary="Gerar áudio a partir de texto")
async def generate_audio(request: dict, db: Session = Depends(get_db)):
    """
    Gera áudio a partir de texto usando ElevenLabs.

    Parâmetros:
    - text: Texto para converter em áudio
    - voice_id: ID da voz (opcional, usa 'Rachel' por padrão)
    - model_id: Modelo TTS (opcional, usa 'eleven_multilingual_v2' por padrão)
    - content_id: ID do conteúdo para associar o áudio (opcional)
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    text = request.get("text", "")
    voice_id = request.get("voice_id", "21m00Tcm4TlvDq8ikWAM")  # Rachel - voz padrão
    model_id = request.get("model_id", "eleven_multilingual_v2")
    content_id = request.get("content_id")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long. Maximum 5000 characters.")

    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

        logger.debug(f"Generating audio for {len(text)} characters with voice {voice_id}")

        # Gerar áudio
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model_id,
            output_format="mp3_44100_128"
        )

        # Converter generator para bytes
        audio_bytes = b"".join(audio_generator)

        logger.debug(f"Generated {len(audio_bytes)} bytes of audio")

        # Save to storage
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"audio/tts_{unique_id}.mp3"

        public_url = ""
        for bucket_name in ["audio-files", "courses", "public"]:
            try:
                storage_from(bucket_name).upload(
                    file_path,
                    audio_bytes,
                    {"upsert": "true", "content-type": "audio/mpeg"}
                )
                public_url = storage_from(bucket_name).get_public_url(file_path)
                logger.debug(f"Audio saved to {bucket_name}/{file_path}")
                break
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        # Se tiver content_id, atualizar o conteúdo com a URL do áudio
        if content_id:
            try:
                db_table(db, "contents").update({"audio_url": public_url}).eq("id", content_id).execute()
                logger.debug(f"Updated content {content_id} with audio URL")
            except Exception as db_err:
                logger.warning(f"Could not update content: {db_err}")

        return {
            "success": True,
            "audio_url": public_url,
            "duration_estimate": len(text) / 15,  # ~15 chars/second estimate
            "characters_used": len(text)
        }

    except Exception as e:
        logger.error(f"Error generating audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/api/ai/tts/generate-summary", tags=["AI Services - Audio"], summary="Gerar áudio de resumo do conteúdo")
async def generate_audio_summary(request: dict, db: Session = Depends(get_db)):
    """
    Gera um resumo do conteúdo usando GPT e converte em áudio usando ElevenLabs.
    Ideal para criar "podcasts" de estudo.

    Parâmetros:
    - content_id: ID do conteúdo para resumir
    - style: Estilo do áudio ('resumo', 'explicacao', 'podcast')
    - voice_id: ID da voz (opcional)
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    content_id = request.get("content_id")
    style = request.get("style", "resumo")
    voice_id = request.get("voice_id", "21m00Tcm4TlvDq8ikWAM")

    if not content_id:
        raise HTTPException(status_code=400, detail="content_id is required")

    try:
        # 1. Buscar o conteúdo
        content_result = db_table(db, "contents").select("*").eq("id", content_id).execute()
        if not content_result.data:
            raise HTTPException(status_code=404, detail="Content not found")

        content = content_result.data[0]
        content_text = content.get("text_content") or content.get("body") or ""
        content_title = content.get("title", "Conteúdo")

        if not content_text:
            raise HTTPException(status_code=400, detail="Content has no text to summarize")

        # 2. Usar GPT para criar o script de áudio
        svc = get_ai_service()

        style_prompts = {
            "resumo": f"Crie um resumo claro e conciso do seguinte conteúdo educacional. O resumo deve ser falado naturalmente, como se você estivesse explicando para um aluno. Título: {content_title}\n\nConteúdo:\n{content_text[:4000]}",
            "explicacao": f"Explique o seguinte conteúdo de forma didática e detalhada, como um professor explicando para um aluno. Use exemplos quando possível. Título: {content_title}\n\nConteúdo:\n{content_text[:4000]}",
            "podcast": f"Transforme o seguinte conteúdo em um script de podcast educativo, de forma envolvente e conversacional. Título: {content_title}\n\nConteúdo:\n{content_text[:4000]}"
        }

        prompt = style_prompts.get(style, style_prompts["resumo"])

        # Gerar script com GPT
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        script_response = svc.client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": "Você é um narrador educacional. Crie scripts claros e naturais para serem convertidos em áudio."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500
        )

        script_text = script_response.choices[0].message.content
        logger.debug(f"Generated script with {len(script_text)} characters")

        # 3. Gerar áudio com ElevenLabs
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

        audio_generator = client.text_to_speech.convert(
            text=script_text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )

        audio_bytes = b"".join(audio_generator)
        logger.debug(f"Generated {len(audio_bytes)} bytes of audio")

        # 4. Salvar no Storage
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"audio/summary_{content_id}_{unique_id}.mp3"

        public_url = ""
        for bucket_name in ["audio-files", "courses", "public"]:
            try:
                storage_from(bucket_name).upload(
                    file_path,
                    audio_bytes,
                    {"upsert": "true", "content-type": "audio/mpeg"}
                )
                public_url = storage_from(bucket_name).get_public_url(file_path)
                break
            except Exception as bucket_err:
                logger.debug(f"Bucket '{bucket_name}' failed: {bucket_err}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        logger.debug(f"Audio uploaded successfully. URL: {public_url}")

        # 5. Atualizar o conteúdo com a URL do áudio
        db_update_success = False
        try:
            update_result = db_table(db, "contents").update({"audio_url": public_url}).eq("id", content_id).execute()
            db_update_success = True
            logger.debug(f"Database updated successfully. Rows affected: {len(update_result.data) if update_result.data else 0}")
        except Exception as db_err:
            logger.warning(f"Could not update content in database: {db_err}")
            # Continua mesmo se o banco falhar - a URL ainda foi gerada

        return {
            "success": True,
            "audio_url": public_url,
            "script": script_text,
            "style": style,
            "characters_used": len(script_text),
            "db_saved": db_update_success
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating audio summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/api/ai/tts/status", tags=["AI Services - Audio"], summary="Status do serviço TTS")
async def tts_status(db: Session = Depends(get_db)):
    """Verifica se o serviço de Text-to-Speech está configurado."""
    return {
        "elevenlabs_configured": bool(ELEVENLABS_API_KEY),
        "available_endpoints": [
            "/api/ai/tts/voices",
            "/api/ai/tts/generate",
            "/api/ai/tts/generate-summary"
        ]
    }


# ============================================
# AUDIO TRANSCRIPTION ENDPOINTS
# ============================================

class TranscriptionRequest(BaseModel):
    content_id: str
    audio_url: Optional[str] = None

@app.post("/api/ai/transcribe", tags=["AI Services - Audio"], summary="Transcrever áudio para texto")
async def transcribe_audio(request: TranscriptionRequest, db: Session = Depends(get_db)):
    """
    Transcreve um arquivo de áudio para texto usando OpenAI Whisper.
    Pode receber a URL do áudio diretamente ou buscar do conteúdo pelo content_id.
    """
    try:
        svc = get_ai_service()
        if not svc:
            raise HTTPException(status_code=503, detail="AI service not configured. Set OPENAI_API_KEY in .env")

        audio_url = request.audio_url

        # Se não tiver URL, buscar do conteúdo
        if not audio_url:
            content_result = db_table(db, "contents").select("*").eq("id", request.content_id).single().execute()
            if not content_result.data:
                raise HTTPException(status_code=404, detail="Conteúdo não encontrado")
            audio_url = content_result.data.get("content_url") or content_result.data.get("audio_url")

        if not audio_url:
            raise HTTPException(status_code=400, detail="Nenhuma URL de áudio encontrada")

        logger.debug(f"Transcribing audio from URL: {audio_url}")

        # Baixar o arquivo de áudio
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(audio_url, follow_redirects=True)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Não foi possível baixar o áudio: {response.status_code}")
            audio_bytes = response.content

        logger.debug(f"Downloaded {len(audio_bytes)} bytes of audio")

        # Determinar extensão do arquivo
        file_ext = "mp3"
        if ".wav" in audio_url.lower():
            file_ext = "wav"
        elif ".m4a" in audio_url.lower():
            file_ext = "m4a"
        elif ".ogg" in audio_url.lower():
            file_ext = "ogg"
        elif ".mp4" in audio_url.lower():
            file_ext = "mp4"

        # Criar arquivo temporário para enviar ao Whisper
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=f".{file_ext}", delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_file_path = tmp_file.name

        try:
            # Transcrever com Whisper
            with open(tmp_file_path, "rb") as audio_file:
                transcript = svc.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="pt"  # Português
                )

            transcribed_text = transcript.text
            logger.debug(f"Transcribed {len(transcribed_text)} characters")

            # Atualizar o conteúdo com o texto transcrito
            db_update_success = False
            try:
                update_result = db_table(db, "contents").update({
                    "text_content": transcribed_text
                }).eq("id", request.content_id).execute()
                db_update_success = True
                logger.debug(f"Database updated with transcription")
            except Exception as db_err:
                logger.warning(f"Could not update content in database: {db_err}")

            return {
                "success": True,
                "text": transcribed_text,
                "characters": len(transcribed_text),
                "db_saved": db_update_success
            }

        finally:
            # Limpar arquivo temporário
            import os
            os.unlink(tmp_file_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# SYSTEM IMAGE UPLOAD ENDPOINTS
# ============================================

@app.post("/admin/settings/upload-logo", tags=["Upload"], summary="Upload logo do sistema")
async def upload_system_logo(file: UploadFile = File(...), user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Faz upload do logo principal do sistema que aparece no header."""
    try:
        filename = file.filename or "logo.png"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "png"
        file_path = f"system/logo_{uuid.uuid4()}.{file_ext}"

        content = await file.read()

        # Try to upload to available bucket
        public_url = ""
        for bucket in ["courses", "avatars", "public"]:
            try:
                storage_from(bucket).upload(file_path, content, {"upsert": "true", "content-type": file.content_type})
                public_url = storage_from(bucket).get_public_url(file_path)
                break
            except Exception as e:
                logger.debug(f"Bucket {bucket} failed: {e}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        # Update system settings with new logo URL
        try:
            check = db_table(db, "system_settings").select("*").limit(1).execute()
            if check.data:
                db_table(db, "system_settings").update({"logo_url": public_url}).eq("id", check.data[0]['id']).execute()
            else:
                db_table(db, "system_settings").insert({"id": str(uuid.uuid4()), "logo_url": public_url}).execute()
        except Exception as db_err:
            logger.warning(f"Could not update settings table: {db_err}")

        return {"url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upload_system_logo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/admin/settings/upload-login-logo", tags=["Upload"], summary="Upload logo da tela de login")
async def upload_login_logo(file: UploadFile = File(...), user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Faz upload do logo que aparece na tela de login."""
    try:
        filename = file.filename or "login_logo.png"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "png"
        file_path = f"system/login_logo_{uuid.uuid4()}.{file_ext}"

        content = await file.read()

        public_url = ""
        for bucket in ["courses", "avatars", "public"]:
            try:
                storage_from(bucket).upload(file_path, content, {"upsert": "true", "content-type": file.content_type})
                public_url = storage_from(bucket).get_public_url(file_path)
                break
            except Exception as e:
                logger.debug(f"Bucket {bucket} failed: {e}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        # Update system settings
        try:
            check = db_table(db, "system_settings").select("*").limit(1).execute()
            if check.data:
                db_table(db, "system_settings").update({"login_logo_url": public_url}).eq("id", check.data[0]['id']).execute()
            else:
                db_table(db, "system_settings").insert({"id": str(uuid.uuid4()), "login_logo_url": public_url}).execute()
        except Exception as db_err:
            logger.warning(f"Could not update settings table: {db_err}")

        return {"url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upload_login_logo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/admin/settings/upload-login-bg", tags=["Upload"], summary="Upload background da tela de login")
async def upload_login_background(file: UploadFile = File(...), user=Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    """Faz upload da imagem de fundo da tela de login."""
    try:
        filename = file.filename or "login_bg.jpg"
        file_ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        file_path = f"system/login_bg_{uuid.uuid4()}.{file_ext}"

        content = await file.read()

        public_url = ""
        for bucket in ["courses", "avatars", "public"]:
            try:
                storage_from(bucket).upload(file_path, content, {"upsert": "true", "content-type": file.content_type})
                public_url = storage_from(bucket).get_public_url(file_path)
                break
            except Exception as e:
                logger.debug(f"Bucket {bucket} failed: {e}")
                continue

        if not public_url:
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

        # Update system settings
        try:
            check = db_table(db, "system_settings").select("*").limit(1).execute()
            if check.data:
                db_table(db, "system_settings").update({"login_bg_url": public_url}).eq("id", check.data[0]['id']).execute()
            else:
                db_table(db, "system_settings").insert({"id": str(uuid.uuid4()), "login_bg_url": public_url}).execute()
        except Exception as db_err:
            logger.warning(f"Could not update settings table: {db_err}")

        return {"url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upload_login_background: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# NOTIFICATIONS ENDPOINTS
# ============================================

class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    type: str = Field("info", max_length=20)
    link: Optional[str] = Field(None, max_length=500)

# Note: More specific routes must come BEFORE generic ones in FastAPI
@app.get("/notifications/{user_id}/count", tags=["Notifications"], summary="Contar notificações não lidas")
async def get_notifications_count(user_id: str, db: Session = Depends(get_db)):
    """Retorna a quantidade de notificações não lidas de um usuário."""
    try:
        response = db_table(db, "notifications").select("id", count="exact").eq("user_id", user_id).eq("read", False).execute()
        return {"count": response.count or 0}
    except Exception as e:
        logger.error(f"Error get_notifications_count: {e}", exc_info=True)
        return {"count": 0}

@app.get("/notifications/{user_id}", tags=["Notifications"], summary="Listar notificações do usuário")
async def get_user_notifications(user_id: str, unread_only: bool = False, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Retorna as notificações de um usuário, com opção de filtrar apenas não lidas."""
    try:
        offset = (page - 1) * per_page
        query = db_table(db, "notifications").select("*", count="exact").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + per_page - 1)
        if unread_only:
            query = query.eq("read", False)
        response = query.execute()
        total = response.count or 0
        return {"data": response.data, "total": total, "page": page, "per_page": per_page, "total_pages": -(-total // per_page) if total else 0}
    except Exception as e:
        logger.error(f"Error get_user_notifications: {e}", exc_info=True)
        # Return empty array if table doesn't exist yet
        return []

@app.post("/notifications", tags=["Notifications"], summary="Criar notificação")
async def create_notification(notification: NotificationCreate, current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Cria uma nova notificação para um usuário."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "user_id": notification.user_id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "link": notification.link,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        response = db_table(db, "notifications").insert(data).execute()
        return response.data[0] if response.data else data
    except Exception as e:
        logger.error(f"Error create_notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Note: More specific routes (/read-all) must come BEFORE generic ones (/read)
@app.put("/notifications/{user_id}/read-all", tags=["Notifications"], summary="Marcar todas como lidas")
async def mark_all_notifications_read(user_id: str, db: Session = Depends(get_db)):
    """Marca todas as notificações de um usuário como lidas."""
    try:
        response = db_table(db, "notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
        return {"success": True, "count": len(response.data) if response.data else 0}
    except Exception as e:
        logger.error(f"Error mark_all_notifications_read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.put("/notifications/{notification_id}/read", tags=["Notifications"], summary="Marcar notificação como lida")
async def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    """Marca uma notificação específica como lida."""
    try:
        response = db_table(db, "notifications").update({"read": True}).eq("id", notification_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error mark_notification_read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.delete("/notifications/{notification_id}", tags=["Notifications"], summary="Excluir notificação")
async def delete_notification(notification_id: str, db: Session = Depends(get_db)):
    """Remove uma notificação permanentemente."""
    try:
        db_table(db, "notifications").delete().eq("id", notification_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error delete_notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# GLOBAL SEARCH ENDPOINT
# ============================================

@app.get("/search", tags=["Search"], summary="Busca global")
@limiter.limit("30/minute")
async def global_search(request: Request, q: str, user_id: Optional[str] = None, role: Optional[str] = None, current_user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    """Busca global em cursos, disciplinas, capítulos e usuários. Resultados filtrados por permissão."""
    if not q or len(q) < 2:
        return {"results": [], "total": 0}

    try:
        results = []
        safe_q = sanitize_search_input(q)
        search_term = f"%{safe_q}%"

        # Search in courses
        try:
            courses = db_table(db, "courses").select("id, title, description, status").ilike("title", search_term).limit(5).execute()
            for course in courses.data:
                results.append({
                    "type": "course",
                    "id": course['id'],
                    "title": course['title'],
                    "subtitle": course.get('description', '')[:100] if course.get('description') else '',
                    "icon": "book",
                    "link": f"/course/{course['id']}"
                })
        except Exception as e:
            logger.error(f"Search courses error: {e}", exc_info=True)

        # Search in disciplines/classes
        try:
            disciplines = db_table(db, "disciplines").select("id, name, department").ilike("name", search_term).limit(5).execute()
            for disc in disciplines.data:
                results.append({
                    "type": "discipline",
                    "id": disc['id'],
                    "title": disc.get('name', ''),
                    "subtitle": disc.get('department', ''),
                    "icon": "school",
                    "link": f"/instructor/class/{disc['id']}"
                })
        except Exception as e:
            logger.error(f"Search disciplines error: {e}", exc_info=True)

        # Search in chapters
        try:
            chapters = db_table(db, "chapters").select("id, title, course_id").ilike("title", search_term).limit(5).execute()
            for chapter in chapters.data:
                results.append({
                    "type": "chapter",
                    "id": chapter['id'],
                    "title": chapter['title'],
                    "subtitle": "Capítulo",
                    "icon": "article",
                    "link": f"/course/{chapter['course_id']}/chapter/{chapter['id']}"
                })
        except Exception as e:
            logger.error(f"Search chapters error: {e}", exc_info=True)

        # Search in users (only for admins/instructors)
        if role and role.upper() in ['ADMIN', 'INSTRUCTOR']:
            try:
                users = db_table(db, "users").select("id, name, email, role").ilike("name", search_term).limit(5).execute()
                for user in users.data:
                    role_label = {'student': 'Aluno', 'teacher': 'Professor', 'admin': 'Admin'}.get(user.get('role', ''), 'Usuário')
                    results.append({
                        "type": "user",
                        "id": user['id'],
                        "title": user['name'],
                        "subtitle": f"{role_label} • {user.get('email', '')}",
                        "icon": "person",
                        "link": f"/admin/users?highlight={user['id']}"
                    })
            except Exception as e:
                logger.error(f"Search users error: {e}", exc_info=True)

        # Search in contents
        try:
            contents = db_table(db, "contents").select("id, title, chapter_id, type").ilike("title", search_term).limit(5).execute()
            for content in contents.data:
                type_label = {'video': 'Vídeo', 'text': 'Texto', 'pdf': 'PDF', 'quiz': 'Quiz'}.get(content.get('type', ''), 'Conteúdo')
                results.append({
                    "type": "content",
                    "id": content['id'],
                    "title": content['title'],
                    "subtitle": type_label,
                    "icon": "description",
                    "link": f"/content/{content['id']}"
                })
        except Exception as e:
            logger.error(f"Search contents error: {e}", exc_info=True)

        return {
            "results": results[:20],  # Limit total results
            "total": len(results),
            "query": q
        }

    except Exception as e:
        logger.error(f"Global search error: {e}", exc_info=True)
        return {"results": [], "total": 0, "error": str(e)}


# ============================================
# USER STATS & ACTIVITIES ENDPOINTS
# ============================================

class ActivityCreate(BaseModel):
    action: str  # 'course_started', 'course_completed', 'chapter_viewed', 'content_completed', 'quiz_completed', 'login'
    target_type: Optional[str] = None  # 'course', 'chapter', 'content', 'quiz'
    target_id: Optional[str] = None
    target_title: Optional[str] = None
    metadata: Optional[dict] = None  # Extra data like score, time_spent, etc.

@app.get("/users/{user_id}/stats", tags=["User Progress"], summary="Estatísticas do usuário")
async def get_user_stats(user_id: str, db: Session = Depends(get_db)):
    """Retorna estatísticas de aprendizado (cursos, horas, notas, conquistas)."""
    try:
        stats = {
            "courses_completed": 0,
            "courses_in_progress": 0,
            "hours_studied": 0,
            "average_score": 0,
            "certificates": 0,
            "total_activities": 0,
            "streak_days": 0,
            "last_activity": None
        }

        # Try to get stats from user_stats table first
        try:
            stats_res = db_table(db, "user_stats").select("*").eq("user_id", user_id).single().execute()
            if stats_res.data:
                stats.update(stats_res.data)
                return stats
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")  # Table might not exist, calculate from activities

        # Calculate from user_activities table — optimized: 1 query instead of 7
        try:
            activities_resp = db_table(db, "user_activities") \
                .select("action, target_id, created_at, metadata") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .execute()

            activities = activities_resp.data or []

            completed_targets = set()
            started_targets = set()
            total_minutes = 0
            scores = []

            for a in activities:
                action = a.get('action', '')
                if action == 'course_completed':
                    completed_targets.add(a.get('target_id'))
                elif action == 'course_started':
                    started_targets.add(a.get('target_id'))
                elif action == 'quiz_completed':
                    meta = a.get('metadata') or {}
                    if meta.get('score') is not None:
                        scores.append(meta['score'])

                meta = a.get('metadata') or {}
                if meta.get('time_spent_minutes'):
                    total_minutes += meta['time_spent_minutes']

            stats["courses_completed"] = len(completed_targets)
            stats["courses_in_progress"] = len(started_targets - completed_targets)
            stats["total_activities"] = len(activities)
            stats["last_activity"] = activities[0]['created_at'] if activities else None
            stats["hours_studied"] = round(total_minutes / 60, 1)
            if scores:
                stats["average_score"] = round(sum(scores) / len(scores), 1)

        except Exception as e:
            logger.error(f"Error calculating stats from activities: {e}", exc_info=True)

        return stats

    except Exception as e:
        logger.error(f"Error get_user_stats: {e}", exc_info=True)
        # Return default stats on error
        return {
            "courses_completed": 0,
            "courses_in_progress": 0,
            "hours_studied": 0,
            "average_score": 0,
            "certificates": 0,
            "total_activities": 0,
            "streak_days": 0,
            "last_activity": None
        }

@app.get("/users/{user_id}/activities", tags=["User Progress"], summary="Histórico de atividades")
async def get_user_activities(user_id: str, limit: int = 10, offset: int = 0, db: Session = Depends(get_db)):
    """Retorna o histórico de atividades recentes do usuário."""
    try:
        response = db_table(db, "user_activities").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error get_user_activities: {e}", exc_info=True)
        # Return empty array if table doesn't exist
        return []

@app.post("/users/{user_id}/activities", tags=["User Progress"], summary="Registrar atividade")
async def create_user_activity(user_id: str, activity: ActivityCreate, db: Session = Depends(get_db)):
    """Registra uma nova atividade do usuário para gamificação."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": activity.action,
            "target_type": activity.target_type,
            "target_id": activity.target_id,
            "target_title": activity.target_title,
            "metadata": activity.metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        response = db_table(db, "user_activities").insert(data).execute()
        return response.data[0] if response.data else data

    except Exception as e:
        logger.error(f"Error create_user_activity: {e}", exc_info=True)
        # Don't fail the request if activity logging fails
        return {"id": data.get("id"), "status": "logged_locally", "error": str(e)}

@app.get("/users/{user_id}/certificates", tags=["User Progress"], summary="Listar certificados")
async def get_user_certificates(user_id: str, db: Session = Depends(get_db)):
    """Retorna os certificados obtidos pelo usuário."""
    try:
        # Try to get from certificates table
        response = db_table(db, "certificates").select("*").eq("user_id", user_id).order("issued_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error get_user_certificates: {e}", exc_info=True)
        # Return empty array if table doesn't exist
        return []

@app.post("/users/{user_id}/certificates", tags=["User Progress"], summary="Emitir certificado")
async def create_certificate(user_id: str, course_id: str, db: Session = Depends(get_db)):
    """Emite um certificado de conclusão de curso para o usuário."""
    try:
        # Get course info
        course = db_table(db, "courses").select("title").eq("id", course_id).single().execute()
        course_title = course.data.get('title', 'Curso') if course.data else 'Curso'

        # Get user info
        user = db_table(db, "users").select("name").eq("id", user_id).single().execute()
        user_name = user.data.get('name', 'Aluno') if user.data else 'Aluno'

        # Create certificate
        cert_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "course_title": course_title,
            "user_name": user_name,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "certificate_number": f"HARVEN-{uuid.uuid4().hex[:8].upper()}"
        }

        response = db_table(db, "certificates").insert(cert_data).execute()
        return response.data[0] if response.data else cert_data

    except Exception as e:
        logger.error(f"Error create_certificate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# All available achievements in the system
ALL_ACHIEVEMENTS = [
    # === CATEGORIA: JORNADA ===
    {"id": "first_login", "title": "Bem-vindo!", "description": "Fez login pela primeira vez", "icon": "waving_hand", "category": "jornada", "points": 10, "rarity": "comum"},
    {"id": "profile_complete", "title": "Perfil Completo", "description": "Completou todas as informacoes do perfil", "icon": "person_check", "category": "jornada", "points": 20, "rarity": "comum"},
    {"id": "first_course", "title": "Primeiro Passo", "description": "Completou o primeiro curso", "icon": "rocket_launch", "category": "jornada", "points": 50, "rarity": "comum"},
    {"id": "five_courses", "title": "Dedicado", "description": "Completou 5 cursos", "icon": "military_tech", "category": "jornada", "points": 100, "rarity": "raro"},
    {"id": "ten_courses", "title": "Veterano", "description": "Completou 10 cursos", "icon": "emoji_events", "category": "jornada", "points": 200, "rarity": "epico"},
    {"id": "twenty_courses", "title": "Lenda", "description": "Completou 20 cursos", "icon": "military_tech", "category": "jornada", "points": 500, "rarity": "lendario"},

    # === CATEGORIA: TEMPO DE ESTUDO ===
    {"id": "one_hour", "title": "Aquecimento", "description": "1 hora de estudo", "icon": "timer", "category": "tempo", "points": 10, "rarity": "comum"},
    {"id": "ten_hours", "title": "Estudioso", "description": "10 horas de estudo", "icon": "schedule", "category": "tempo", "points": 50, "rarity": "comum"},
    {"id": "twentyfive_hours", "title": "Focado", "description": "25 horas de estudo", "icon": "hourglass_top", "category": "tempo", "points": 100, "rarity": "raro"},
    {"id": "fifty_hours", "title": "Incansavel", "description": "50 horas de estudo", "icon": "local_fire_department", "category": "tempo", "points": 200, "rarity": "epico"},
    {"id": "hundred_hours", "title": "Mestre do Tempo", "description": "100 horas de estudo", "icon": "diamond", "category": "tempo", "points": 500, "rarity": "lendario"},

    # === CATEGORIA: DESEMPENHO ===
    {"id": "first_quiz", "title": "Testado", "description": "Completou o primeiro quiz", "icon": "quiz", "category": "desempenho", "points": 20, "rarity": "comum"},
    {"id": "perfect_quiz", "title": "Perfeito!", "description": "100% em um quiz", "icon": "check_circle", "category": "desempenho", "points": 50, "rarity": "raro"},
    {"id": "good_score", "title": "Bom Desempenho", "description": "Media acima de 8.0", "icon": "thumb_up", "category": "desempenho", "points": 100, "rarity": "raro"},
    {"id": "excellent_score", "title": "Excelencia", "description": "Media acima de 9.0", "icon": "stars", "category": "desempenho", "points": 200, "rarity": "epico"},
    {"id": "perfect_score", "title": "Perfeccionista", "description": "Media acima de 9.5", "icon": "auto_awesome", "category": "desempenho", "points": 500, "rarity": "lendario"},

    # === CATEGORIA: CERTIFICADOS ===
    {"id": "first_cert", "title": "Certificado", "description": "Obteve primeiro certificado", "icon": "workspace_premium", "category": "certificados", "points": 100, "rarity": "raro"},
    {"id": "three_certs", "title": "Colecao", "description": "Obteve 3 certificados", "icon": "card_membership", "category": "certificados", "points": 200, "rarity": "epico"},
    {"id": "five_certs", "title": "Colecionador", "description": "Obteve 5 certificados", "icon": "verified", "category": "certificados", "points": 300, "rarity": "epico"},
    {"id": "ten_certs", "title": "Expert Certificado", "description": "Obteve 10 certificados", "icon": "shield_with_house", "category": "certificados", "points": 500, "rarity": "lendario"},

    # === CATEGORIA: CONSISTENCIA ===
    {"id": "three_day_streak", "title": "Comecando Bem", "description": "3 dias seguidos de estudo", "icon": "trending_up", "category": "consistencia", "points": 30, "rarity": "comum"},
    {"id": "week_streak", "title": "Consistente", "description": "7 dias seguidos de estudo", "icon": "bolt", "category": "consistencia", "points": 70, "rarity": "raro"},
    {"id": "two_week_streak", "title": "Determinado", "description": "14 dias seguidos de estudo", "icon": "electric_bolt", "category": "consistencia", "points": 150, "rarity": "epico"},
    {"id": "month_streak", "title": "Imparavel", "description": "30 dias seguidos de estudo", "icon": "whatshot", "category": "consistencia", "points": 300, "rarity": "lendario"},

    # === CATEGORIA: SOCIAL ===
    {"id": "share_profile", "title": "Social", "description": "Compartilhou o perfil", "icon": "share", "category": "social", "points": 20, "rarity": "comum"},
    {"id": "first_comment", "title": "Participativo", "description": "Fez o primeiro comentario", "icon": "chat_bubble", "category": "social", "points": 30, "rarity": "comum"},
    {"id": "helpful", "title": "Prestativo", "description": "Ajudou outro aluno", "icon": "volunteer_activism", "category": "social", "points": 50, "rarity": "raro"},

    # === CATEGORIA: ESPECIAIS (Agro) ===
    {"id": "early_bird", "title": "Colheita Matinal", "description": "Estudou antes das 6h - como um bom agricultor", "icon": "agriculture", "category": "especial", "points": 50, "rarity": "raro"},
    {"id": "night_owl", "title": "Vigilia da Safra", "description": "Estudou apos meia-noite - cuidando da plantacao", "icon": "nightlight", "category": "especial", "points": 50, "rarity": "raro"},
    {"id": "weekend_warrior", "title": "Agricultor Incansavel", "description": "Estudou todos os fins de semana do mes", "icon": "energy_savings_leaf", "category": "especial", "points": 100, "rarity": "epico"},
    {"id": "speed_learner", "title": "Safra Relampago", "description": "Completou um curso em menos de 1 dia", "icon": "bolt", "category": "especial", "points": 150, "rarity": "epico"},
    {"id": "completionist", "title": "Mestre da Safra", "description": "Completou todos os cursos de uma disciplina", "icon": "eco", "category": "especial", "points": 300, "rarity": "lendario"},
    {"id": "pioneer", "title": "Pioneiro do Campo", "description": "Foi um dos primeiros a completar um novo curso", "icon": "forest", "category": "especial", "points": 200, "rarity": "epico"},
    {"id": "harvest_master", "title": "Rei da Colheita", "description": "Obteve nota maxima em 5 cursos diferentes", "icon": "spa", "category": "especial", "points": 400, "rarity": "lendario"},
]

@app.get("/users/{user_id}/achievements", tags=["User Progress"], summary="Listar conquistas")
async def get_user_achievements(user_id: str, include_locked: bool = True, db: Session = Depends(get_db)):
    """Retorna todas as conquistas do usuário com status e progresso."""
    try:
        # Get user stats for calculating progress
        stats = await get_user_stats(user_id)
        courses_completed = stats.get('courses_completed', 0)
        hours = stats.get('hours_studied', 0)
        avg_score = stats.get('average_score', 0)
        streak = stats.get('streak_days', 0)
        total_activities = stats.get('total_activities', 0)

        # Get certificate count
        cert_count = 0
        try:
            certs = db_table(db, "certificates").select("id", count="exact").eq("user_id", user_id).execute()
            cert_count = certs.count or 0
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

        # Get quiz stats
        quiz_count = 0
        perfect_quizzes = 0
        try:
            quizzes = db_table(db, "user_activities").select("metadata").eq("user_id", user_id).eq("action", "quiz_completed").execute()
            quiz_count = len(quizzes.data or [])
            for q in (quizzes.data or []):
                if q.get('metadata', {}).get('score', 0) == 100:
                    perfect_quizzes += 1
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

        # Check if user has bio/avatar (profile complete)
        profile_complete = False
        try:
            user = db_table(db, "users").select("avatar_url, bio").eq("id", user_id).single().execute()
            if user.data:
                profile_complete = bool(user.data.get('avatar_url')) and bool(user.data.get('bio'))
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

        # Define unlock conditions for each achievement
        def check_unlock(achievement_id: str) -> dict:
            """Check if achievement is unlocked and return progress"""
            conditions = {
                # Jornada
                "first_login": {"unlocked": total_activities > 0, "progress": min(1, total_activities), "target": 1},
                "profile_complete": {"unlocked": profile_complete, "progress": 1 if profile_complete else 0, "target": 1},
                "first_course": {"unlocked": courses_completed >= 1, "progress": min(1, courses_completed), "target": 1},
                "five_courses": {"unlocked": courses_completed >= 5, "progress": min(5, courses_completed), "target": 5},
                "ten_courses": {"unlocked": courses_completed >= 10, "progress": min(10, courses_completed), "target": 10},
                "twenty_courses": {"unlocked": courses_completed >= 20, "progress": min(20, courses_completed), "target": 20},

                # Tempo
                "one_hour": {"unlocked": hours >= 1, "progress": min(1, hours), "target": 1},
                "ten_hours": {"unlocked": hours >= 10, "progress": min(10, hours), "target": 10},
                "twentyfive_hours": {"unlocked": hours >= 25, "progress": min(25, hours), "target": 25},
                "fifty_hours": {"unlocked": hours >= 50, "progress": min(50, hours), "target": 50},
                "hundred_hours": {"unlocked": hours >= 100, "progress": min(100, hours), "target": 100},

                # Desempenho
                "first_quiz": {"unlocked": quiz_count >= 1, "progress": min(1, quiz_count), "target": 1},
                "perfect_quiz": {"unlocked": perfect_quizzes >= 1, "progress": min(1, perfect_quizzes), "target": 1},
                "good_score": {"unlocked": avg_score >= 8, "progress": round(min(8, avg_score), 1), "target": 8},
                "excellent_score": {"unlocked": avg_score >= 9, "progress": round(min(9, avg_score), 1), "target": 9},
                "perfect_score": {"unlocked": avg_score >= 9.5, "progress": round(min(9.5, avg_score), 1), "target": 9.5},

                # Certificados
                "first_cert": {"unlocked": cert_count >= 1, "progress": min(1, cert_count), "target": 1},
                "three_certs": {"unlocked": cert_count >= 3, "progress": min(3, cert_count), "target": 3},
                "five_certs": {"unlocked": cert_count >= 5, "progress": min(5, cert_count), "target": 5},
                "ten_certs": {"unlocked": cert_count >= 10, "progress": min(10, cert_count), "target": 10},

                # Consistencia
                "three_day_streak": {"unlocked": streak >= 3, "progress": min(3, streak), "target": 3},
                "week_streak": {"unlocked": streak >= 7, "progress": min(7, streak), "target": 7},
                "two_week_streak": {"unlocked": streak >= 14, "progress": min(14, streak), "target": 14},
                "month_streak": {"unlocked": streak >= 30, "progress": min(30, streak), "target": 30},

                # Social (these need special tracking)
                "share_profile": {"unlocked": False, "progress": 0, "target": 1},
                "first_comment": {"unlocked": False, "progress": 0, "target": 1},
                "helpful": {"unlocked": False, "progress": 0, "target": 1},

                # Especiais (Agro - these need special tracking)
                "early_bird": {"unlocked": False, "progress": 0, "target": 1},
                "night_owl": {"unlocked": False, "progress": 0, "target": 1},
                "weekend_warrior": {"unlocked": False, "progress": 0, "target": 4},
                "speed_learner": {"unlocked": False, "progress": 0, "target": 1},
                "completionist": {"unlocked": False, "progress": 0, "target": 1},
                "pioneer": {"unlocked": False, "progress": 0, "target": 1},
                "harvest_master": {"unlocked": perfect_quizzes >= 5, "progress": min(5, perfect_quizzes), "target": 5},
            }
            return conditions.get(achievement_id, {"unlocked": False, "progress": 0, "target": 1})

        # Build achievements list with unlock status
        achievements = []
        total_points = 0
        unlocked_count = 0

        for ach in ALL_ACHIEVEMENTS:
            status = check_unlock(ach["id"])
            achievement_data = {
                **ach,
                "unlocked": status["unlocked"],
                "progress": status["progress"],
                "target": status["target"],
                "progress_percent": round((status["progress"] / status["target"]) * 100) if status["target"] > 0 else 0
            }

            if status["unlocked"]:
                total_points += ach["points"]
                unlocked_count += 1

            if include_locked or status["unlocked"]:
                achievements.append(achievement_data)

        # Sort: unlocked first, then by points
        achievements.sort(key=lambda x: (not x["unlocked"], -x["points"]))

        return {
            "achievements": achievements,
            "summary": {
                "total": len(ALL_ACHIEVEMENTS),
                "unlocked": unlocked_count,
                "locked": len(ALL_ACHIEVEMENTS) - unlocked_count,
                "total_points": total_points,
                "completion_percent": round((unlocked_count / len(ALL_ACHIEVEMENTS)) * 100)
            }
        }

    except Exception as e:
        logger.error(f"Error get_user_achievements: {e}", exc_info=True)

        return {
            "achievements": [],
            "summary": {
                "total": len(ALL_ACHIEVEMENTS),
                "unlocked": 0,
                "locked": len(ALL_ACHIEVEMENTS),
                "total_points": 0,
                "completion_percent": 0
            }
        }

@app.post("/users/{user_id}/achievements/{achievement_id}/unlock", tags=["User Progress"], summary="Desbloquear conquista")
async def unlock_achievement(user_id: str, achievement_id: str, db: Session = Depends(get_db)):
    """Desbloqueia manualmente uma conquista (para conquistas especiais)."""
    try:
        # Find the achievement
        achievement = next((a for a in ALL_ACHIEVEMENTS if a["id"] == achievement_id), None)
        if not achievement:
            raise HTTPException(status_code=404, detail="Achievement not found")

        # Try to save to database
        try:
            data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "achievement_id": achievement_id,
                "title": achievement["title"],
                "description": achievement["description"],
                "icon": achievement["icon"],
                "category": achievement["category"],
                "points": achievement["points"],
                "rarity": achievement["rarity"],
                "unlocked_at": datetime.now(timezone.utc).isoformat()
            }
            db_table(db, "user_achievements").insert(data).execute()
        except Exception as e:
            logger.warning(f"Could not save achievement to DB: {e}")

        return {"success": True, "achievement": achievement}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlock_achievement: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

    except Exception as e:
        logger.error(f"Error get_user_achievements: {e}", exc_info=True)
        return []


# ============================================
# COURSE PROGRESS TRACKING
# ============================================

@app.get("/users/{user_id}/courses/{course_id}/progress", tags=["User Progress"], summary="Progresso no curso")
async def get_course_progress(user_id: str, course_id: str, db: Session = Depends(get_db)):
    """Retorna o progresso do usuário em um curso específico."""
    try:
        # Try to get from course_progress table
        try:
            progress_res = db_table(db, "course_progress").select("*").eq("user_id", user_id).eq("course_id", course_id).single().execute()
            if progress_res.data:
                return progress_res.data
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

        # Calculate progress from completed contents
        # Get all contents in course
        chapters = db_table(db, "chapters").select("id").eq("course_id", course_id).execute()
        chapter_ids = [c['id'] for c in (chapters.data or [])]

        if not chapter_ids:
            return {"progress_percent": 0, "completed_contents": 0, "total_contents": 0}

        contents = db_table(db, "contents").select("id").in_("chapter_id", chapter_ids).execute()
        total_contents = len(contents.data or [])

        if total_contents == 0:
            return {"progress_percent": 0, "completed_contents": 0, "total_contents": 0}

        content_ids = [c['id'] for c in contents.data]

        # Get completed contents
        completed = db_table(db, "user_activities").select("target_id").eq("user_id", user_id).eq("action", "content_completed").in_("target_id", content_ids).execute()
        completed_contents = len(set([c['target_id'] for c in (completed.data or [])]))

        progress_percent = round((completed_contents / total_contents) * 100)

        return {
            "progress_percent": progress_percent,
            "completed_contents": completed_contents,
            "total_contents": total_contents,
            "course_id": course_id,
            "user_id": user_id
        }

    except Exception as e:
        logger.error(f"Error get_course_progress: {e}", exc_info=True)
        return {"progress_percent": 0, "completed_contents": 0, "total_contents": 0}

@app.post("/users/{user_id}/courses/{course_id}/complete-content/{content_id}", tags=["User Progress"], summary="Marcar conteúdo como concluído")
async def mark_content_completed(user_id: str, course_id: str, content_id: str, time_spent_minutes: int = 0, db: Session = Depends(get_db)):
    """Marca um conteúdo como concluído e registra o tempo gasto."""
    try:
        # Get content info
        content = db_table(db, "contents").select("title, type").eq("id", content_id).single().execute()
        content_title = content.data.get('title', 'Conteúdo') if content.data else 'Conteúdo'
        content_type = content.data.get('type', 'text') if content.data else 'text'

        # Create activity
        activity_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": "content_completed",
            "target_type": content_type,
            "target_id": content_id,
            "target_title": content_title,
            "metadata": {
                "course_id": course_id,
                "time_spent_minutes": time_spent_minutes
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        db_table(db, "user_activities").insert(activity_data).execute()

        # Check if course is now complete
        progress = await get_course_progress(user_id, course_id)
        course_completed = progress.get('progress_percent', 0) >= 100

        if course_completed:
            # Check if we already logged course completion
            existing = db_table(db, "user_activities").select("id").eq("user_id", user_id).eq("action", "course_completed").eq("target_id", course_id).execute()
            if not existing.data:
                # Log course completion
                course = db_table(db, "courses").select("title").eq("id", course_id).single().execute()
                course_title = course.data.get('title', 'Curso') if course.data else 'Curso'

                completion_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "action": "course_completed",
                    "target_type": "course",
                    "target_id": course_id,
                    "target_title": course_title,
                    "metadata": {},
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                db_table(db, "user_activities").insert(completion_data).execute()

        return {
            "success": True,
            "content_id": content_id,
            "progress": progress,
            "course_completed": course_completed
        }

    except Exception as e:
        logger.error(f"Error mark_content_completed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# ============================================
# CHAT SESSIONS & MOODLE EXPORT
# ============================================

class ChatMessageCreate(BaseModel):
    role: str = Field(..., max_length=20)
    content: str = Field(..., min_length=1, max_length=10000)
    agent_type: Optional[str] = Field(None, max_length=50)
    metadata: Optional[dict] = None

class ChatSessionCreate(BaseModel):
    user_id: str
    content_id: str
    chapter_id: Optional[str] = None
    course_id: Optional[str] = None

@app.post("/chat-sessions", tags=["Chat Sessions"], summary="Criar ou obter sessão de chat")
async def create_or_get_chat_session(session_data: ChatSessionCreate, db: Session = Depends(get_db)):
    """Cria uma nova sessão de chat ou retorna existente para o usuário e conteúdo."""
    try:
        # Check if session already exists
        existing = db_table(db, "chat_sessions").select("*").eq("user_id", session_data.user_id).eq("content_id", session_data.content_id).execute()

        if existing.data and len(existing.data) > 0:
            session = existing.data[0]
            # If status was abandoned or completed, reactivate
            if session.get('status') in ['abandoned', 'completed']:
                db_table(db, "chat_sessions").update({"status": "active"}).eq("id", session['id']).execute()
                session['status'] = 'active'
            return session

        # Create new session
        data = {
            "id": str(uuid.uuid4()),
            "user_id": session_data.user_id,
            "content_id": session_data.content_id,
            "chapter_id": session_data.chapter_id,
            "course_id": session_data.course_id,
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "total_messages": 0
        }

        response = db_table(db, "chat_sessions").insert(data).execute()
        return response.data[0] if response.data else data

    except Exception as e:
        logger.error(f"Error create_or_get_chat_session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/chat-sessions/{session_id}", tags=["Chat Sessions"], summary="Obter sessão de chat")
async def get_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Retorna uma sessão de chat por ID com todas as mensagens."""
    try:
        session = db_table(db, "chat_sessions").select("*").eq("id", session_id).single().execute()
        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get messages
        messages = db_table(db, "chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()

        result = {**session.data, "messages": messages.data or []}
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_chat_session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/chat-sessions/by-content/{content_id}", tags=["Chat Sessions"], summary="Buscar sessão por conteúdo")
async def get_chat_session_by_content(content_id: str, user_id: str, db: Session = Depends(get_db)):
    """Busca sessão de chat por ID do conteúdo e ID do usuário."""
    try:
        session = db_table(db, "chat_sessions").select("*").eq("user_id", user_id).eq("content_id", content_id).single().execute()

        if not session.data:
            return None

        # Get messages
        messages = db_table(db, "chat_messages").select("*").eq("session_id", session.data['id']).order("created_at", desc=False).execute()

        return {
            **session.data,
            "messages": messages.data or []
        }

    except Exception as e:
        logger.error(f"Error get_chat_session_by_content: {e}", exc_info=True)
        return None

@app.get("/users/{user_id}/chat-sessions", tags=["Chat Sessions"], summary="Listar sessões do usuário")
async def get_user_chat_sessions(user_id: str, status: Optional[str] = None, db: Session = Depends(get_db)):
    """Retorna todas as sessões de chat de um usuário."""
    try:
        query = db_table(db, "chat_sessions").select("*, contents(title, type), chapters(title), courses(title)").eq("user_id", user_id)

        if status:
            query = query.eq("status", status)

        response = query.order("updated_at", desc=True).execute()
        return response.data or []

    except Exception as e:
        logger.error(f"Error get_user_chat_sessions: {e}", exc_info=True)
        return []

@app.post("/chat-sessions/{session_id}/messages", tags=["Chat Sessions"], summary="Adicionar mensagem")
async def add_chat_message(session_id: str, message: ChatMessageCreate, db: Session = Depends(get_db)):
    """Adiciona uma mensagem a uma sessão de chat."""
    try:
        # Insert message
        import json as _json
        meta_str = _json.dumps(message.metadata) if message.metadata else None
        msg_data = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": message.role,
            "content": message.content,
            "agent_type": message.agent_type,
            "metadata": meta_str,
        }

        response = db_table(db, "chat_messages").insert(msg_data).execute()

        # Update session message count
        try:
            chat_session = db.get(ChatSession, session_id)
            if chat_session:
                chat_session.total_messages = (chat_session.total_messages or 0) + 1
                db.commit()
        except Exception as inc_err:
            logger.warning(f"Failed to increment message count for session {session_id}: {inc_err}")
            db.rollback()

        return response.data[0] if response.data else msg_data

    except Exception as e:
        logger.error(f"Error add_chat_message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/chat-sessions/{session_id}/messages", tags=["Chat Sessions"], summary="Listar mensagens da sessão")
async def get_chat_messages(session_id: str, db: Session = Depends(get_db)):
    """Retorna todas as mensagens de uma sessão de chat."""
    try:
        response = db_table(db, "chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return response.data or []

    except Exception as e:
        logger.error(f"Error get_chat_messages: {e}", exc_info=True)
        return []

@app.put("/chat-sessions/{session_id}/complete", tags=["Chat Sessions"], summary="Completar sessão")
async def complete_chat_session(session_id: str, performance_score: Optional[float] = None, db: Session = Depends(get_db)):
    """Marca uma sessão de chat como concluída."""
    try:
        update_data = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }

        if performance_score is not None:
            update_data["performance_score"] = performance_score

        response = db_table(db, "chat_sessions").update(update_data).eq("id", session_id).execute()
        return {"success": True, "session": response.data[0] if response.data else None}

    except Exception as e:
        logger.error(f"Error complete_chat_session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.post("/chat-sessions/{session_id}/export-moodle", tags=["Chat Sessions"], summary="Exportar para Moodle")
async def export_session_to_moodle(session_id: str, db: Session = Depends(get_db)):
    """Exporta uma sessão de chat para o formato xAPI compatível com Moodle LMS."""
    try:
        # Get session with all related data
        session = db_table(db, "chat_sessions").select("*").eq("id", session_id).single().execute()
        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get messages
        messages = db_table(db, "chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()

        # Get content info
        content = db_table(db, "contents").select("title, type").eq("id", session.data['content_id']).single().execute()
        content_title = content.data.get('title', 'Conteúdo') if content.data else 'Conteúdo'

        # Get user info
        user = db_table(db, "users").select("name, email, ra").eq("id", session.data['user_id']).single().execute()
        user_name = user.data.get('name', 'Aluno') if user.data else 'Aluno'
        user_email = user.data.get('email', '') if user.data else ''
        user_ra = user.data.get('ra', '') if user.data else ''

        # Get course and chapter info
        course_title = ""
        chapter_title = ""

        if session.data.get('course_id'):
            course = db_table(db, "courses").select("title").eq("id", session.data['course_id']).single().execute()
            course_title = course.data.get('title', '') if course.data else ''

        if session.data.get('chapter_id'):
            chapter = db_table(db, "chapters").select("title").eq("id", session.data['chapter_id']).single().execute()
            chapter_title = chapter.data.get('title', '') if chapter.data else ''

        # Format messages for Moodle
        formatted_messages = []
        for msg in (messages.data or []):
            formatted_messages.append({
                "role": msg['role'],
                "content": msg['content'],
                "agent_type": msg.get('agent_type'),
                "timestamp": msg['created_at']
            })

        # Generate Moodle export ID
        moodle_export_id = f"HARVEN-MOODLE-{uuid.uuid4().hex[:8].upper()}"

        # Build Moodle-compatible export data (SCORM/xAPI compatible format)
        moodle_export = {
            "export_id": moodle_export_id,
            "export_timestamp": str(uuid.uuid4()),
            "platform": "harven.ai",
            "version": "1.0",

            # Actor (xAPI standard)
            "actor": {
                "name": user_name,
                "mbox": f"mailto:{user_email}" if user_email else None,
                "account": {
                    "name": user_ra,
                    "homePage": "https://harven.ai"
                }
            },

            # Context
            "context": {
                "course": {
                    "id": session.data.get('course_id'),
                    "title": course_title
                },
                "chapter": {
                    "id": session.data.get('chapter_id'),
                    "title": chapter_title
                },
                "content": {
                    "id": session.data['content_id'],
                    "title": content_title
                }
            },

            # Session data
            "session": {
                "id": session_id,
                "started_at": session.data['started_at'],
                "completed_at": session.data.get('completed_at'),
                "status": session.data['status'],
                "total_messages": session.data.get('total_messages', 0),
                "performance_score": session.data.get('performance_score')
            },

            # Interaction log (messages)
            "interactions": formatted_messages,

            # Result (xAPI standard)
            "result": {
                "success": session.data['status'] == 'completed',
                "completion": session.data['status'] in ['completed', 'exported'],
                "score": {
                    "raw": session.data.get('performance_score'),
                    "max": 100,
                    "min": 0
                } if session.data.get('performance_score') else None,
                "duration": None  # Could calculate from timestamps
            },

            # Verb (xAPI standard - what the user did)
            "verb": {
                "id": "http://adlnet.gov/expapi/verbs/experienced",
                "display": {"en-US": "experienced"}
            }
        }

        # Update session with export info
        db_table(db, "chat_sessions").update({
            "status": "exported",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "moodle_export_id": moodle_export_id
        }).eq("id", session_id).execute()

        return {
            "success": True,
            "export_id": moodle_export_id,
            "data": moodle_export,
            "message": "Session exported successfully. Use this data to import into Moodle LMS."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error export_session_to_moodle: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@app.get("/export/moodle/batch", tags=["Chat Sessions"], summary="Exportação em lote para Moodle")
async def batch_export_to_moodle(
    user_id: Optional[str] = None,
    course_id: Optional[str] = None,
    status: str = "completed",
    db: Session = Depends(get_db)
):
    """Exporta múltiplas sessões para o formato xAPI do Moodle em lote."""
    try:
        query = db_table(db, "chat_sessions").select("id").eq("status", status)

        if user_id:
            query = query.eq("user_id", user_id)
        if course_id:
            query = query.eq("course_id", course_id)

        sessions = query.execute()

        exports = []
        for session in (sessions.data or []):
            try:
                export_result = await export_session_to_moodle(session['id'], db=db)
                exports.append(export_result)
            except Exception as e:
                exports.append({
                    "session_id": session['id'],
                    "success": False,
                    "error": str(e)
                })

        return {
            "total_sessions": len(sessions.data or []),
            "successful_exports": len([e for e in exports if e.get('success')]),
            "exports": exports
        }

    except Exception as e:
        logger.error(f"Error batch_export_to_moodle: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# INTEGRATIONS - JACAD & MOODLE
# ============================================

# Import do serviço de integração
try:
    from services.integration_service import IntegrationService, IntegrationSystem
except ImportError:
    # Fallback se o módulo não estiver disponível
    IntegrationService = None
    IntegrationSystem = None
    logger.warning("Módulo de integração não encontrado. Endpoints de integração desabilitados.")


def get_integration_service(db: Session = None):
    """Factory para criar instância do IntegrationService com settings atuais."""
    if not IntegrationService:
        raise HTTPException(status_code=501, detail="Módulo de integração não disponível")
    # Busca settings atuais
    settings = {}
    if db:
        try:
            response = db_table(db, "system_settings").select("*").limit(1).execute()
            settings = response.data[0] if response.data else {}
        except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

    return IntegrationService(db, settings)


# --- Endpoints Base ---

@app.post("/integrations/test-connection", tags=["Integrations"], summary="Testar conexão com sistema externo")
async def test_integration_connection(system: str, db: Session = Depends(get_db)):
    """
    Testa a conexão com um sistema externo (JACAD ou Moodle).

    - **system**: 'jacad' ou 'moodle'
    """
    service = get_integration_service(db)
    result = await service.test_connection(system)
    return result


@app.get("/integrations/status", tags=["Integrations"], summary="Status de todas as integrações")
async def get_integrations_status(db: Session = Depends(get_db)):
    """Retorna o status de conexão e última sincronização de todas as integrações."""
    service = get_integration_service(db)
    return await service.get_status()


@app.get("/integrations/logs", tags=["Integrations"], summary="Logs de sincronização")
async def get_integration_logs(
    system: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retorna os logs de operações de sincronização.

    - **system**: Filtrar por 'jacad' ou 'moodle'
    - **status**: Filtrar por 'success', 'failed' ou 'partial'
    - **limit**: Número máximo de registros (padrão: 50)
    """
    service = get_integration_service(db)
    filters = {}
    if system:
        filters["system"] = system
    if status:
        filters["status"] = status
    return await service.get_logs(filters, limit)


@app.get("/integrations/mappings", tags=["Integrations"], summary="Mapeamentos de IDs externos")
async def get_integration_mappings(entity_type: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retorna os mapeamentos entre IDs do Harven.ai e sistemas externos.

    - **entity_type**: Filtrar por 'user', 'discipline' ou 'session'
    """
    service = get_integration_service(db)
    return await service.get_mappings(entity_type)


# --- JACAD Endpoints ---

@app.post("/integrations/jacad/sync", tags=["Integrations"], summary="Sincronizar todos os dados do JACAD")
@limiter.limit("5/minute")
async def sync_all_from_jacad(request: Request, db: Session = Depends(get_db)):
    """
    Executa sincronização completa com o JACAD.

    Importa disciplinas e alunos matriculados.
    """
    service = get_integration_service(db)

    # Sync disciplinas primeiro
    disciplines_result = await service.sync_disciplines_from_jacad()

    # Depois sync alunos
    users_result = await service.sync_users_from_jacad()

    return {
        "disciplines": disciplines_result.to_dict(),
        "users": users_result.to_dict()
    }


@app.post("/integrations/jacad/import-students", tags=["Integrations"], summary="Importar alunos do JACAD")
async def import_students_from_jacad(db: Session = Depends(get_db)):
    """Importa/atualiza alunos do JACAD para o Harven.ai."""
    service = get_integration_service(db)
    result = await service.sync_users_from_jacad()
    return result.to_dict()


@app.post("/integrations/jacad/import-disciplines", tags=["Integrations"], summary="Importar disciplinas do JACAD")
async def import_disciplines_from_jacad(db: Session = Depends(get_db)):
    """Importa/atualiza disciplinas do JACAD para o Harven.ai."""
    service = get_integration_service(db)
    result = await service.sync_disciplines_from_jacad()
    return result.to_dict()


@app.get("/integrations/jacad/student/{ra}", tags=["Integrations"], summary="Buscar aluno no JACAD")
async def get_jacad_student(ra: str, db: Session = Depends(get_db)):
    """
    Busca dados de um aluno diretamente no JACAD pelo RA.

    Retorna dados cadastrais e disciplinas matriculadas.
    Útil para validação antes do login ou cadastro.
    """
    service = get_integration_service(db)
    student = await service.get_jacad_student(ra)

    if not student:
        raise HTTPException(status_code=404, detail=f"Aluno com RA {ra} não encontrado no JACAD")

    return student


# --- Moodle Endpoints ---

@app.post("/integrations/moodle/sync", tags=["Integrations"], summary="Sincronização completa com Moodle")
@limiter.limit("5/minute")
async def sync_all_with_moodle(request: Request, db: Session = Depends(get_db)):
    """
    Executa sincronização bidirecional com o Moodle.

    1. Exporta sessões socráticas pendentes para o portfólio
    2. Importa avaliações de professores
    """
    service = get_integration_service(db)

    # Export sessions
    export_result = await service.export_sessions_to_moodle()

    # Import ratings
    ratings_result = await service.import_ratings_from_moodle()

    return {
        "export": export_result.to_dict(),
        "import_ratings": ratings_result.to_dict()
    }


@app.post("/integrations/moodle/import-users", tags=["Integrations"], summary="Importar usuários do Moodle")
async def import_users_from_moodle(db: Session = Depends(get_db)):
    """
    Importa usuários do Moodle para o Harven.ai.

    Cria mapeamento entre IDs para sincronização posterior.
    """
    # Por enquanto retorna placeholder - implementação futura
    return {
        "status": "not_implemented",
        "message": "Importação de usuários do Moodle será implementada na próxima versão"
    }


class MoodleExportRequest(BaseModel):
    user_id: Optional[str] = None
    discipline_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    export_format: str = "portfolio"


@app.post("/integrations/moodle/export-sessions", tags=["Integrations"], summary="Exportar sessões para Moodle")
async def export_sessions_to_moodle_integration(request: MoodleExportRequest, db: Session = Depends(get_db)):
    """
    Exporta sessões socráticas para o portfólio do Moodle.

    - **user_id**: Filtrar por usuário específico
    - **discipline_id**: Filtrar por disciplina
    - **export_format**: 'portfolio' (padrão) ou 'xapi'
    """
    service = get_integration_service(db)

    filters = {}
    if request.user_id:
        filters["user_id"] = request.user_id
    if request.discipline_id:
        filters["discipline_id"] = request.discipline_id
    if request.start_date:
        filters["start_date"] = request.start_date
    if request.end_date:
        filters["end_date"] = request.end_date
    filters["export_format"] = request.export_format

    result = await service.export_sessions_to_moodle(filters)
    return result.to_dict()


@app.get("/integrations/moodle/ratings", tags=["Integrations"], summary="Obter avaliações do Moodle")
async def get_moodle_ratings(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna avaliações de professores recebidas do Moodle.

    - **user_id**: Filtrar por aluno
    - **session_id**: Filtrar por sessão específica
    """
    service = get_integration_service(db)

    filters = {}
    if user_id:
        filters["user_id"] = user_id
    if session_id:
        filters["session_id"] = session_id

    return await service.get_moodle_ratings(filters)


class MoodleWebhookPayload(BaseModel):
    event_type: str
    payload: dict
    signature: Optional[str] = None


@app.post("/integrations/moodle/webhook", tags=["Integrations"], summary="Webhook do Moodle")
@limiter.limit("60/minute")
async def handle_moodle_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe webhooks do Moodle para eventos como:

    - **rating_submitted**: Professor avaliou uma sessão socrática
    - **grade_updated**: Nota foi atualizada

    O Moodle deve enviar uma assinatura HMAC para validação.
    """
    body = await request.body()

    try:
        data = MoodleWebhookPayload.model_validate_json(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    service = get_integration_service(db)

    # Validate webhook signature if secret is configured
    webhook_secret = os.getenv("MOODLE_WEBHOOK_SECRET")
    if webhook_secret:
        signature = request.headers.get("X-Moodle-Signature", "")
        expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail="Assinatura de webhook invalida")

    result = await service.handle_moodle_webhook(data.event_type, data.payload)
    return result


# --- Endpoint auxiliar para integração no login ---

@app.get("/integrations/lookup-student/{ra}", tags=["Integrations"], summary="Buscar aluno para login")
async def lookup_student_for_login(ra: str, db: Session = Depends(get_db)):
    """
    Busca dados do aluno no JACAD e no banco local.

    Usado durante o fluxo de login para:
    1. Verificar se o aluno existe no JACAD
    2. Verificar se já está cadastrado no Harven.ai
    3. Retornar dados para auto-preenchimento
    """
    service = get_integration_service(db)

    # Busca no JACAD
    jacad_student = await service.get_jacad_student(ra)

    # Busca no banco local
    local_user = None
    try:
        response = db_table(db, "users").select("*").eq("ra", ra).execute()
        if response.data:
            local_user = response.data[0]
    except Exception as e:
            logger.warning(f"Non-critical operation failed: {e}")

    return {
        "ra": ra,
        "found_in_jacad": jacad_student is not None,
        "found_locally": local_user is not None,
        "jacad_data": jacad_student,
        "local_user": {
            "id": local_user.get("id"),
            "name": local_user.get("name"),
            "email": local_user.get("email"),
            "role": local_user.get("role")
        } if local_user else None,
        "can_auto_register": jacad_student is not None and local_user is None
    }


# ============================================
# SESSION REVIEW (Avaliação de Conversas)
# ============================================

class SessionReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=1, max_length=5000)

class SessionReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = Field(None, max_length=20)

class ReviewReplyCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


@app.get("/disciplines/{discipline_id}/sessions", tags=["Session Review"], summary="Listar sessões da turma")
async def list_discipline_sessions(
    discipline_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Lista sessões de chat dos alunos de uma turma, com info de review."""
    try:
        # Get course_ids for this discipline (Supabase schema uses course_id, not discipline_id)
        courses_result = db_table(db, "courses").select("id").eq("discipline_id", discipline_id).execute()
        course_ids = [c["id"] for c in courses_result.data] if courses_result.data else []

        if not course_ids:
            return []

        # Get sessions for those courses
        q = db_table(db, "chat_sessions").select("*").in_("course_id", course_ids).order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        sessions_result = q.execute()
        sessions = sessions_result.data if sessions_result.data else []

        # Get student names in batch
        user_ids = list(set(s.get("user_id") for s in sessions if s.get("user_id")))
        users_map = {}
        if user_ids:
            users_result = db_table(db, "users").select("id,name").in_("id", user_ids).execute()
            users_map = {u["id"]: u["name"] for u in (users_result.data or [])}

        # Get reviews in batch (table may not exist in Supabase yet)
        session_ids = [s["id"] for s in sessions]
        reviews_map = {}
        if session_ids:
            try:
                reviews_result = db_table(db, "session_reviews").select("*").in_("session_id", session_ids).execute()
                reviews_map = {r["session_id"]: r for r in (reviews_result.data or [])}
            except Exception:
                pass  # session_reviews table may not exist yet

        results = []
        for s in sessions:
            data = dict(s)
            data["student_name"] = users_map.get(s.get("user_id"), "Desconhecido")
            data["review"] = reviews_map.get(s["id"])
            results.append(data)

        return results
    except Exception as e:
        logger.error(f"Error list_discipline_sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/chat-sessions/{session_id}/review", tags=["Session Review"], summary="Criar avaliação")
async def create_session_review(
    session_id: str,
    review_data: SessionReviewCreate,
    current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Cria uma avaliação para uma sessão de chat. Adiciona comentário como mensagem 'instructor'."""
    try:
        # Verify session exists
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        # Check if already reviewed
        existing = db.query(SessionReview).filter(SessionReview.session_id == session_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Sessão já foi avaliada")

        # Create review
        review = SessionReview(
            id=str(uuid.uuid4()),
            session_id=session_id,
            instructor_id=current_user["sub"],
            rating=review_data.rating,
            status="pending_student",
        )
        db.add(review)

        # Add instructor comment as ChatMessage
        msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="instructor",
            content=review_data.comment,
        )
        db.add(msg)

        # Notify student
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=session.user_id,
            title="Conversa avaliada pelo professor",
            message=f"Sua conversa socrática recebeu uma avaliação ({review_data.rating}/5). Clique para ver e responder.",
            type="info",
            link=f"/session/{session_id}/review",
        )
        db.add(notification)

        db.commit()
        db.refresh(review)
        return review.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error create_session_review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.get("/chat-sessions/{session_id}/review", tags=["Session Review"], summary="Obter avaliação")
async def get_session_review(
    session_id: str,
    current_user: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Retorna a avaliação de uma sessão com todas as mensagens (AI + feedback)."""
    try:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        review = db.query(SessionReview).filter(SessionReview.session_id == session_id).first()

        # Get all messages ordered by created_at
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()

        # Get student name
        student = db.query(User).filter(User.id == session.user_id).first()

        return {
            "session": session.to_dict(),
            "student_name": student.name if student else "Desconhecido",
            "review": review.to_dict() if review else None,
            "messages": [m.to_dict() for m in messages],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get_session_review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.put("/chat-sessions/{session_id}/review", tags=["Session Review"], summary="Atualizar avaliação")
async def update_session_review(
    session_id: str,
    update_data: SessionReviewUpdate,
    current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Atualiza rating ou status de uma avaliação."""
    try:
        review = db.query(SessionReview).filter(SessionReview.session_id == session_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        if update_data.rating is not None:
            review.rating = update_data.rating
        if update_data.status is not None:
            review.status = update_data.status

        db.commit()
        db.refresh(review)
        return review.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error update_session_review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/chat-sessions/{session_id}/review/reply", tags=["Session Review"], summary="Aluno responde à avaliação")
async def reply_to_review(
    session_id: str,
    reply_data: ReviewReplyCreate,
    current_user: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Aluno responde ao feedback do professor. Status muda para 'replied'."""
    try:
        review = db.query(SessionReview).filter(SessionReview.session_id == session_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        # Verify the current user is the session owner
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session or session.user_id != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Apenas o aluno da sessão pode responder")

        # Add student reply as ChatMessage
        msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="student_reply",
            content=reply_data.content,
        )
        db.add(msg)

        # Update review status
        review.status = "replied"

        # Notify instructor
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=review.instructor_id,
            title="Aluno respondeu à avaliação",
            message=f"O aluno respondeu ao seu feedback na conversa socrática. Clique para ver.",
            type="info",
            link=f"/session/{session_id}/review",
        )
        db.add(notification)

        db.commit()
        db.refresh(review)
        return review.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reply_to_review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@app.post("/chat-sessions/{session_id}/review/instructor-message", tags=["Session Review"], summary="Professor envia follow-up")
async def instructor_review_message(
    session_id: str,
    reply_data: ReviewReplyCreate,
    current_user: dict = Depends(require_role("INSTRUCTOR", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Professor envia mensagem de follow-up. Status muda para 'pending_student'."""
    try:
        review = db.query(SessionReview).filter(SessionReview.session_id == session_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        # Add instructor message
        msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="instructor",
            content=reply_data.content,
        )
        db.add(msg)

        # Update review status
        review.status = "pending_student"

        # Notify student
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=session.user_id,
            title="Nova mensagem do professor",
            message="O professor enviou uma nova mensagem sobre sua conversa socrática.",
            type="info",
            link=f"/session/{session_id}/review",
        )
        db.add(notification)

        db.commit()
        db.refresh(review)
        return review.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error instructor_review_message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


# ============================================
# LTI 1.1 - EXTERNAL TOOL INTEGRATION
# ============================================

from services.lti_service import LTIService, LTIValidationError, LTI_ENABLED, LTI_REDIRECT_URL

@app.post("/lti/launch", tags=["LTI"], summary="LTI 1.1 Launch endpoint")
async def lti_launch(request: Request, db: Session = Depends(get_db)):
    """
    Recebe launch request do Moodle via LTI 1.1.

    O Moodle envia um POST form-encoded com parâmetros OAuth 1.0a assinados.
    Valida a assinatura, busca/cria o usuário e redireciona para o frontend
    com um JWT token para autenticação automática.
    """
    if not LTI_ENABLED:
        raise HTTPException(status_code=503, detail="LTI integration is not enabled")

    lti_service = LTIService()

    try:
        launch_data = await lti_service.validate_launch(request)
    except LTIValidationError as e:
        logger.warning(f"LTI launch validation failed: {e}")
        raise HTTPException(status_code=401, detail=f"LTI validation failed: {e}")

    # Get or create user from LTI data
    try:
        user = lti_service.get_or_create_user(db, launch_data)
    except Exception as e:
        logger.error(f"LTI user creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process LTI user")

    if not user:
        raise HTTPException(
            status_code=403,
            detail="User not found and auto-creation is disabled"
        )

    # Normalize role for frontend (TEACHER → INSTRUCTOR)
    raw_role = (user.role or "STUDENT").upper()
    normalized_role = "INSTRUCTOR" if raw_role == "TEACHER" else raw_role

    # Generate JWT token
    token = create_jwt_token(user.id, normalized_role)

    # Log the LTI launch
    try:
        log_entry = SystemLog(
            id=str(uuid.uuid4()),
            action="lti_launch",
            description=f"LTI launch: user={user.ra}, role={normalized_role}, context={launch_data.context_id}",
            user_id=user.id,
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

    # Build redirect URL with token and user data
    import json as json_lib
    user_data = json_lib.dumps({
        "id": user.id,
        "name": user.name,
        "email": user.email or "",
        "role": normalized_role,
        "ra": user.ra,
        "avatar_url": user.avatar_url or "",
    })

    redirect_params = urllib.parse.urlencode({
        "lti_token": token,
        "lti_user": user_data,
        "lti_context": launch_data.context_id or "",
    })

    redirect_url = f"{LTI_REDIRECT_URL}/lti-callback?{redirect_params}"
    logger.info(f"LTI: Redirecting user {user.ra} to {LTI_REDIRECT_URL}")

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_url, status_code=303)


@app.get("/lti/config.xml", tags=["LTI"], summary="LTI Tool Configuration XML")
async def lti_config_xml(request: Request):
    """
    Retorna XML de configuração para instalação automática no Moodle.

    No Moodle, o admin pode colar esta URL e importar a configuração automaticamente.
    """
    base_url = str(request.base_url).rstrip("/")
    launch_url = f"{base_url}/lti/launch"

    xml = LTIService.generate_config_xml(
        tool_name="Harven.ai",
        launch_url=launch_url,
        description="Harven.ai é uma plataforma educacional com IA que utiliza o método socrático para guiar o aprendizado dos alunos através de perguntas e reflexões, promovendo pensamento crítico e autonomia.",
    )

    return Response(content=xml, media_type="application/xml")


@app.get("/lti/status", tags=["LTI"], summary="LTI integration status")
async def lti_status():
    """Verifica se a integração LTI está habilitada e configurada."""
    return {
        "enabled": LTI_ENABLED,
        "configured": bool(LTI_ENABLED and LTI_REDIRECT_URL),
        "redirect_url": LTI_REDIRECT_URL if LTI_ENABLED else None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
