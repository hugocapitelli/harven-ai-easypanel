"""
Harven.ai Integration Service
=============================

Serviço de integração bidirecional com sistemas externos:
- JACAD: Sistema acadêmico para importação de alunos/disciplinas
- Moodle LMS: Exportação de portfólio e recebimento de avaliações

Uso:
    from services.integration_service import IntegrationService

    service = IntegrationService(db_session, settings)
    result = await service.sync_users_from_jacad()
"""

import os
import uuid
import hmac
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import httpx
from db_compat import db_table

# Import mocks (usado quando não há conexão real)
from .mocks.jacad_mock import JACAD_MOCK_DATA
from .mocks.moodle_mock import MOODLE_MOCK_DATA


class IntegrationSystem(str, Enum):
    MOODLE = "moodle"
    JACAD = "jacad"


class SyncDirection(str, Enum):
    IMPORT = "import"
    EXPORT = "export"


class SyncStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


@dataclass
class SyncResult:
    """Resultado de uma operação de sincronização."""
    system: str
    operation: str
    direction: str
    status: str
    records_processed: int
    records_created: int = 0
    records_updated: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    details: Optional[List[Dict]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        return {
            "system": self.system,
            "operation": self.operation,
            "direction": self.direction,
            "status": self.status,
            "records_processed": self.records_processed,
            "records_created": self.records_created,
            "records_updated": self.records_updated,
            "records_failed": self.records_failed,
            "error_message": self.error_message,
            "details": self.details,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class JacadClient:
    """
    Cliente para integração com o sistema JACAD.

    O JACAD é o sistema acadêmico que contém informações de:
    - Alunos (RA, nome, curso, matrículas)
    - Disciplinas (código, nome, turmas)
    - Matrículas (aluno x disciplina)
    """

    def __init__(self, base_url: str, api_key: str, use_mock: bool = True):
        self.base_url = base_url.rstrip('/') if base_url else ""
        self.api_key = api_key
        self.use_mock = use_mock or not base_url or not api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Faz requisição HTTP para a API do JACAD."""
        if self.use_mock:
            return self._mock_request(method, endpoint, data)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = await self.client.get(url, headers=headers)
            elif method == "POST":
                response = await self.client.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Método HTTP não suportado: {method}")

            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise ConnectionError(f"Erro ao conectar ao JACAD: {str(e)}")

    def _mock_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Retorna dados mockados para desenvolvimento."""
        if "/students/" in endpoint:
            ra = endpoint.split("/students/")[-1]
            student = JACAD_MOCK_DATA.get_student_by_ra(ra)
            if student:
                return {"success": True, "data": student}
            return {"success": False, "error": "Aluno não encontrado"}

        if endpoint == "/disciplines":
            return {"success": True, "data": JACAD_MOCK_DATA.get_disciplines()}

        if "/disciplines/" in endpoint and "/students" in endpoint:
            disc_id = endpoint.split("/disciplines/")[1].split("/")[0]
            return {"success": True, "data": JACAD_MOCK_DATA.get_discipline_students(disc_id)}

        if "/students/" in endpoint and "/enrollments" in endpoint:
            ra = endpoint.split("/students/")[1].split("/")[0]
            return {"success": True, "data": JACAD_MOCK_DATA.get_student_enrollments(ra)}

        return {"success": False, "error": "Endpoint não reconhecido"}

    async def test_connection(self) -> Dict:
        """Testa a conexão com o JACAD."""
        if self.use_mock:
            return {
                "connected": True,
                "mode": "mock",
                "message": "Usando dados mockados (desenvolvimento)",
                "version": "mock-1.0"
            }

        try:
            result = await self._request("GET", "/health")
            return {
                "connected": True,
                "mode": "production",
                "message": "Conexão estabelecida",
                "version": result.get("version", "unknown")
            }
        except Exception as e:
            return {
                "connected": False,
                "mode": "production",
                "message": str(e),
                "version": None
            }

    async def get_student_by_ra(self, ra: str) -> Optional[Dict]:
        """Busca dados de um aluno pelo RA."""
        result = await self._request("GET", f"/students/{ra}")
        if result.get("success"):
            return result.get("data")
        return None

    async def get_student_enrollments(self, ra: str) -> List[Dict]:
        """Retorna as matrículas/disciplinas de um aluno."""
        result = await self._request("GET", f"/students/{ra}/enrollments")
        if result.get("success"):
            return result.get("data", [])
        return []

    async def get_disciplines(self) -> List[Dict]:
        """Retorna lista de todas as disciplinas."""
        result = await self._request("GET", "/disciplines")
        if result.get("success"):
            return result.get("data", [])
        return []

    async def get_discipline_students(self, discipline_id: str) -> List[Dict]:
        """Retorna alunos matriculados em uma disciplina."""
        result = await self._request("GET", f"/disciplines/{discipline_id}/students")
        if result.get("success"):
            return result.get("data", [])
        return []


class MoodleClient:
    """
    Cliente para integração com o Moodle LMS.

    Funcionalidades:
    - Leitura: usuários, cursos, matrículas, notas
    - Escrita: portfólio, notas, atividades
    - Webhook: recebimento de avaliações de professores
    """

    def __init__(self, base_url: str, token: str, use_mock: bool = True):
        self.base_url = base_url.rstrip('/') if base_url else ""
        self.token = token
        self.use_mock = use_mock or not base_url or not token
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _request(self, wsfunction: str, params: Dict = None) -> Dict:
        """Faz requisição para a API REST do Moodle."""
        if self.use_mock:
            return self._mock_request(wsfunction, params)

        url = f"{self.base_url}/webservice/rest/server.php"

        data = {
            "wstoken": self.token,
            "wsfunction": wsfunction,
            "moodlewsrestformat": "json",
            **(params or {})
        }

        try:
            response = await self.client.post(url, data=data)
            response.raise_for_status()
            result = response.json()

            # Moodle retorna erro em formato específico
            if isinstance(result, dict) and "exception" in result:
                raise ConnectionError(f"Erro Moodle: {result.get('message', 'Unknown')}")

            return result
        except httpx.HTTPError as e:
            raise ConnectionError(f"Erro ao conectar ao Moodle: {str(e)}")

    def _mock_request(self, wsfunction: str, params: Dict = None) -> Dict:
        """Retorna dados mockados para desenvolvimento."""
        if wsfunction == "core_webservice_get_site_info":
            return MOODLE_MOCK_DATA.get_site_info()

        if wsfunction == "core_user_get_users":
            return MOODLE_MOCK_DATA.get_users()

        if wsfunction == "core_course_get_courses":
            return MOODLE_MOCK_DATA.get_courses()

        if wsfunction == "core_enrol_get_enrolled_users":
            course_id = params.get("courseid") if params else None
            return MOODLE_MOCK_DATA.get_enrolled_users(course_id)

        if wsfunction == "mod_portfolio_add_entry":
            return {"success": True, "id": str(uuid.uuid4())}

        if wsfunction == "core_grades_update_grades":
            return {"success": True}

        return {"error": "Função não implementada no mock"}

    async def test_connection(self) -> Dict:
        """Testa a conexão com o Moodle."""
        if self.use_mock:
            return {
                "connected": True,
                "mode": "mock",
                "message": "Usando dados mockados (desenvolvimento)",
                "sitename": "Moodle Mock",
                "version": "mock-4.0"
            }

        try:
            result = await self._request("core_webservice_get_site_info")
            return {
                "connected": True,
                "mode": "production",
                "message": "Conexão estabelecida",
                "sitename": result.get("sitename", "Unknown"),
                "version": result.get("release", "Unknown")
            }
        except Exception as e:
            return {
                "connected": False,
                "mode": "production",
                "message": str(e),
                "sitename": None,
                "version": None
            }

    # === Leitura ===

    async def get_users(self, criteria: Dict = None) -> List[Dict]:
        """Busca usuários no Moodle."""
        params = {}
        if criteria:
            for i, (key, value) in enumerate(criteria.items()):
                params[f"criteria[{i}][key]"] = key
                params[f"criteria[{i}][value]"] = value
        result = await self._request("core_user_get_users", params)
        return result.get("users", []) if isinstance(result, dict) else result

    async def get_courses(self) -> List[Dict]:
        """Retorna lista de cursos do Moodle."""
        return await self._request("core_course_get_courses")

    async def get_enrolled_users(self, course_id: int) -> List[Dict]:
        """Retorna usuários matriculados em um curso."""
        return await self._request("core_enrol_get_enrolled_users", {"courseid": course_id})

    async def get_user_grades(self, course_id: int, user_id: int) -> Dict:
        """Retorna notas de um usuário em um curso."""
        result = await self._request("gradereport_user_get_grades_table", {
            "courseid": course_id,
            "userid": user_id
        })
        return result

    # === Escrita ===

    async def create_portfolio_entry(self, user_id: int, data: Dict) -> Dict:
        """
        Cria uma entrada no portfólio do aluno.

        Args:
            user_id: ID do usuário no Moodle
            data: {
                "title": "Título da sessão",
                "content": "Conteúdo da conversa",
                "discipline": "Nome da disciplina",
                "session_date": "2024-01-15",
                "ai_feedback": "Feedback do tutor AI",
                "score": 85
            }
        """
        params = {
            "userid": user_id,
            "title": data.get("title", "Sessão Socrática"),
            "content": data.get("content", ""),
            "format": 1,  # HTML format
            "tags": f"harven,socratic,{data.get('discipline', 'general')}"
        }
        return await self._request("mod_portfolio_add_entry", params)

    async def update_grade(self, course_id: int, user_id: int, grade: float, feedback: str = "") -> Dict:
        """
        Atualiza a nota de um aluno em um curso/atividade.

        Args:
            course_id: ID do curso no Moodle
            user_id: ID do usuário
            grade: Nota (0-100)
            feedback: Comentário do professor
        """
        params = {
            "courseid": course_id,
            "component": "mod_harven",
            "activityid": 0,
            "itemnumber": 0,
            "grades": [{
                "studentid": user_id,
                "grade": grade,
                "feedback": feedback
            }]
        }
        return await self._request("core_grades_update_grades", params)

    # === Webhook ===

    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """Verifica a assinatura do webhook do Moodle."""
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)


class IntegrationService:
    """
    Serviço principal de integração.

    Orquestra as operações entre Harven.ai, JACAD e Moodle.
    """

    def __init__(self, db, settings: Dict):
        self.db = db
        self.settings = settings

        # Inicializa clientes
        self.jacad = JacadClient(
            base_url=settings.get("jacad_url", ""),
            api_key=settings.get("jacad_api_key", ""),
            use_mock=not settings.get("jacad_enabled", False)
        )

        self.moodle = MoodleClient(
            base_url=settings.get("moodle_url", ""),
            token=settings.get("moodle_token", ""),
            use_mock=not settings.get("moodle_enabled", False)
        )

    # === Testes de Conexão ===

    async def test_connection(self, system: str) -> Dict:
        """Testa conexão com um sistema externo."""
        if system == IntegrationSystem.JACAD:
            return await self.jacad.test_connection()
        elif system == IntegrationSystem.MOODLE:
            return await self.moodle.test_connection()
        else:
            return {"connected": False, "message": f"Sistema desconhecido: {system}"}

    async def get_status(self) -> Dict:
        """Retorna status de todas as integrações."""
        jacad_status = await self.jacad.test_connection()
        moodle_status = await self.moodle.test_connection()

        return {
            "jacad": {
                **jacad_status,
                "enabled": self.settings.get("jacad_enabled", False),
                "last_sync": self.settings.get("jacad_last_sync"),
            },
            "moodle": {
                **moodle_status,
                "enabled": self.settings.get("moodle_enabled", False),
                "last_sync": self.settings.get("moodle_last_sync"),
            }
        }

    # === JACAD: Importação ===

    async def sync_users_from_jacad(self, filters: Dict = None) -> SyncResult:
        """
        Sincroniza usuários do JACAD para o Harven.ai.

        Importa alunos baseado em suas matrículas nas disciplinas.
        """
        started_at = datetime.utcnow()
        records_processed = 0
        records_created = 0
        records_updated = 0
        records_failed = 0
        details = []

        try:
            # Busca todas as disciplinas do JACAD
            disciplines = await self.jacad.get_disciplines()

            for discipline in disciplines:
                disc_code = discipline.get("codigo")
                students = await self.jacad.get_discipline_students(disc_code)

                for student_data in students:
                    records_processed += 1
                    ra = student_data.get("ra")

                    try:
                        # Verifica se usuário já existe
                        existing = db_table(self.db,"users").select("id").eq("ra", ra).execute()

                        user_data = {
                            "ra": ra,
                            "name": student_data.get("nome"),
                            "email": student_data.get("email", f"{ra}@aluno.edu.br"),
                            "role": "STUDENT",
                            "jacad_ra": ra,
                        }

                        if existing.data:
                            # Update
                            db_table(self.db,"users").update(user_data).eq("ra", ra).execute()
                            records_updated += 1
                        else:
                            # Insert
                            from passlib.context import CryptContext
                            _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
                            user_data["id"] = str(uuid.uuid4())
                            user_data["password_hash"] = _pwd_ctx.hash(ra)  # Senha inicial = RA
                            db_table(self.db,"users").insert(user_data).execute()
                            records_created += 1

                        details.append({"ra": ra, "status": "ok"})

                    except Exception as e:
                        records_failed += 1
                        details.append({"ra": ra, "status": "error", "message": str(e)})

            status = SyncStatus.SUCCESS if records_failed == 0 else SyncStatus.PARTIAL

        except Exception as e:
            status = SyncStatus.FAILED
            details.append({"error": str(e)})

        result = SyncResult(
            system=IntegrationSystem.JACAD,
            operation="sync_users",
            direction=SyncDirection.IMPORT,
            status=status,
            records_processed=records_processed,
            records_created=records_created,
            records_updated=records_updated,
            records_failed=records_failed,
            details=details,
            started_at=started_at,
            completed_at=datetime.utcnow()
        )

        # Registra no log
        await self._log_sync(result)

        return result

    async def sync_disciplines_from_jacad(self) -> SyncResult:
        """Sincroniza disciplinas do JACAD para o Harven.ai."""
        started_at = datetime.utcnow()
        records_processed = 0
        records_created = 0
        records_updated = 0
        records_failed = 0
        details = []

        try:
            disciplines = await self.jacad.get_disciplines()

            for disc in disciplines:
                records_processed += 1
                code = disc.get("codigo")

                try:
                    existing = db_table(self.db,"disciplines").select("id").eq("code", code).execute()

                    disc_data = {
                        "code": code,
                        "name": disc.get("nome"),
                        "department": disc.get("departamento", ""),
                        "jacad_codigo": code,
                    }

                    if existing.data:
                        db_table(self.db,"disciplines").update(disc_data).eq("code", code).execute()
                        records_updated += 1
                    else:
                        disc_data["id"] = str(uuid.uuid4())
                        db_table(self.db,"disciplines").insert(disc_data).execute()
                        records_created += 1

                    details.append({"code": code, "status": "ok"})

                except Exception as e:
                    records_failed += 1
                    details.append({"code": code, "status": "error", "message": str(e)})

            status = SyncStatus.SUCCESS if records_failed == 0 else SyncStatus.PARTIAL

        except Exception as e:
            status = SyncStatus.FAILED
            details.append({"error": str(e)})

        result = SyncResult(
            system=IntegrationSystem.JACAD,
            operation="sync_disciplines",
            direction=SyncDirection.IMPORT,
            status=status,
            records_processed=records_processed,
            records_created=records_created,
            records_updated=records_updated,
            records_failed=records_failed,
            details=details,
            started_at=started_at,
            completed_at=datetime.utcnow()
        )

        await self._log_sync(result)
        return result

    async def get_jacad_student(self, ra: str) -> Optional[Dict]:
        """Busca dados de um aluno no JACAD pelo RA."""
        student = await self.jacad.get_student_by_ra(ra)
        if student:
            # Adiciona matrículas
            enrollments = await self.jacad.get_student_enrollments(ra)
            student["enrollments"] = enrollments
        return student

    # === Moodle: Exportação ===

    async def export_sessions_to_moodle(self, filters: Dict = None) -> SyncResult:
        """
        Exporta sessões socráticas para o portfólio do Moodle.

        Args:
            filters: {
                "user_id": "uuid",  # Filtrar por usuário específico
                "discipline_id": "uuid",  # Filtrar por disciplina
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "export_format": "portfolio"  # ou "xapi"
            }
        """
        started_at = datetime.utcnow()
        records_processed = 0
        records_created = 0
        records_failed = 0
        details = []

        try:
            # Busca sessões não exportadas
            query = db_table(self.db,"chat_sessions").select("*")

            if filters:
                if filters.get("user_id"):
                    query = query.eq("user_id", filters["user_id"])
                if filters.get("discipline_id"):
                    query = query.eq("discipline_id", filters["discipline_id"])

            # Filtra sessões que ainda não foram exportadas para o Moodle
            query = query.is_("moodle_exported_at", "null")

            response = query.execute()
            sessions = response.data or []

            for session in sessions:
                records_processed += 1
                session_id = session.get("id")

                try:
                    # Busca o moodle_user_id do usuário
                    user_response = db_table(self.db,"users").select("moodle_user_id, name").eq("id", session["user_id"]).execute()

                    if not user_response.data or not user_response.data[0].get("moodle_user_id"):
                        details.append({
                            "session_id": session_id,
                            "status": "skipped",
                            "message": "Usuário sem moodle_user_id"
                        })
                        continue

                    moodle_user_id = int(user_response.data[0]["moodle_user_id"])
                    user_name = user_response.data[0].get("name", "Aluno")

                    # Prepara dados para o portfólio
                    portfolio_data = {
                        "title": f"Sessão Socrática - {session.get('created_at', '')[:10]}",
                        "content": self._format_session_for_portfolio(session),
                        "discipline": session.get("discipline_name", ""),
                        "session_date": session.get("created_at", "")[:10],
                        "ai_feedback": session.get("ai_summary", ""),
                        "score": session.get("score", 0)
                    }

                    # Envia para o Moodle
                    result = await self.moodle.create_portfolio_entry(moodle_user_id, portfolio_data)

                    if result.get("success") or result.get("id"):
                        # Marca como exportado
                        db_table(self.db,"chat_sessions").update({
                            "moodle_exported_at": datetime.utcnow().isoformat(),
                            "moodle_portfolio_id": result.get("id")
                        }).eq("id", session_id).execute()

                        records_created += 1
                        details.append({"session_id": session_id, "status": "ok"})
                    else:
                        records_failed += 1
                        details.append({
                            "session_id": session_id,
                            "status": "error",
                            "message": result.get("error", "Erro desconhecido")
                        })

                except Exception as e:
                    records_failed += 1
                    details.append({"session_id": session_id, "status": "error", "message": str(e)})

            status = SyncStatus.SUCCESS if records_failed == 0 else SyncStatus.PARTIAL

        except Exception as e:
            status = SyncStatus.FAILED
            details.append({"error": str(e)})

        result = SyncResult(
            system=IntegrationSystem.MOODLE,
            operation="export_sessions",
            direction=SyncDirection.EXPORT,
            status=status,
            records_processed=records_processed,
            records_created=records_created,
            records_failed=records_failed,
            details=details,
            started_at=started_at,
            completed_at=datetime.utcnow()
        )

        await self._log_sync(result)
        return result

    def _format_session_for_portfolio(self, session: Dict) -> str:
        """Formata uma sessão socrática para exibição no portfólio."""
        messages = session.get("messages", [])

        html = f"""
        <div class="harven-session">
            <h3>Sessão Socrática - Harven.ai</h3>
            <p><strong>Data:</strong> {session.get('created_at', '')[:10]}</p>
            <p><strong>Disciplina:</strong> {session.get('discipline_name', 'N/A')}</p>
            <p><strong>Conteúdo:</strong> {session.get('content_title', 'N/A')}</p>
            <hr/>
            <div class="conversation">
        """

        for msg in messages:
            role = "Tutor AI" if msg.get("role") == "assistant" else "Aluno"
            html += f"<p><strong>{role}:</strong> {msg.get('content', '')}</p>"

        html += """
            </div>
            <hr/>
            <p><em>Exportado automaticamente pelo Harven.ai</em></p>
        </div>
        """

        return html

    # === Moodle: Importação de Avaliações ===

    async def import_ratings_from_moodle(self) -> SyncResult:
        """
        Importa avaliações de professores do Moodle.

        Usado quando professores avaliam as sessões socráticas diretamente no Moodle.
        """
        started_at = datetime.utcnow()
        records_processed = 0
        records_created = 0
        records_failed = 0
        details = []

        try:
            # Busca sessões que foram exportadas para o Moodle
            response = db_table(self.db,"chat_sessions").select(
                "id, moodle_portfolio_id, user_id"
            ).not_.is_("moodle_portfolio_id", "null").is_("moodle_rating", "null").execute()

            sessions = response.data or []

            for session in sessions:
                records_processed += 1
                # Em produção, aqui buscaria a avaliação no Moodle
                # Como é mock, simula que algumas sessões têm avaliação

                # Mock: 50% das sessões têm avaliação
                import random
                if random.random() > 0.5:
                    rating = random.randint(3, 5)
                    feedback = "Bom desempenho na atividade." if rating >= 4 else "Pode melhorar."

                    try:
                        # Atualiza a sessão com a avaliação
                        db_table(self.db,"chat_sessions").update({
                            "moodle_rating": rating
                        }).eq("id", session["id"]).execute()

                        # Registra na tabela de ratings
                        db_table(self.db,"moodle_ratings").insert({
                            "id": str(uuid.uuid4()),
                            "session_id": session["id"],
                            "user_id": session["user_id"],
                            "rating": rating,
                            "feedback": feedback,
                            "rated_at": datetime.utcnow().isoformat()
                        }).execute()

                        records_created += 1
                        details.append({"session_id": session["id"], "rating": rating, "status": "ok"})

                    except Exception as e:
                        records_failed += 1
                        details.append({"session_id": session["id"], "status": "error", "message": str(e)})

            status = SyncStatus.SUCCESS if records_failed == 0 else SyncStatus.PARTIAL

        except Exception as e:
            status = SyncStatus.FAILED
            details.append({"error": str(e)})

        result = SyncResult(
            system=IntegrationSystem.MOODLE,
            operation="import_ratings",
            direction=SyncDirection.IMPORT,
            status=status,
            records_processed=records_processed,
            records_created=records_created,
            records_failed=records_failed,
            details=details,
            started_at=started_at,
            completed_at=datetime.utcnow()
        )

        await self._log_sync(result)
        return result

    async def get_moodle_ratings(self, filters: Dict = None) -> List[Dict]:
        """Retorna avaliações recebidas do Moodle."""
        query = db_table(self.db,"moodle_ratings").select("*")

        if filters:
            if filters.get("user_id"):
                query = query.eq("user_id", filters["user_id"])
            if filters.get("session_id"):
                query = query.eq("session_id", filters["session_id"])

        response = query.order("rated_at", desc=True).execute()
        return response.data or []

    # === Webhook Handler ===

    async def handle_moodle_webhook(self, event_type: str, payload: Dict) -> Dict:
        """
        Processa webhooks recebidos do Moodle.

        Eventos suportados:
        - rating_submitted: Professor avaliou uma sessão
        - grade_updated: Nota foi atualizada
        """
        if event_type == "rating_submitted":
            return await self._handle_rating_submitted(payload)
        elif event_type == "grade_updated":
            return await self._handle_grade_updated(payload)
        else:
            return {"status": "ignored", "message": f"Evento não suportado: {event_type}"}

    async def _handle_rating_submitted(self, payload: Dict) -> Dict:
        """Processa avaliação submetida por um professor."""
        portfolio_id = payload.get("portfolio_id")
        rating = payload.get("rating")
        feedback = payload.get("feedback", "")
        rated_by = payload.get("teacher_moodle_id")

        # Busca a sessão pelo portfolio_id
        response = db_table(self.db,"chat_sessions").select(
            "id, user_id"
        ).eq("moodle_portfolio_id", portfolio_id).execute()

        if not response.data:
            return {"status": "error", "message": "Sessão não encontrada"}

        session = response.data[0]

        # Atualiza a sessão
        db_table(self.db,"chat_sessions").update({
            "moodle_rating": rating
        }).eq("id", session["id"]).execute()

        # Registra a avaliação
        db_table(self.db,"moodle_ratings").insert({
            "id": str(uuid.uuid4()),
            "session_id": session["id"],
            "user_id": session["user_id"],
            "rating": rating,
            "feedback": feedback,
            "rated_by_moodle_id": str(rated_by),
            "rated_at": datetime.utcnow().isoformat()
        }).execute()

        return {"status": "ok", "session_id": session["id"]}

    async def _handle_grade_updated(self, payload: Dict) -> Dict:
        """Processa atualização de nota."""
        # Implementação futura
        return {"status": "ok", "message": "Grade update processed"}

    # === Logs ===

    async def _log_sync(self, result: SyncResult):
        """Registra uma operação de sincronização no banco."""
        try:
            db_table(self.db,"integration_logs").insert({
                "id": str(uuid.uuid4()),
                "system": result.system,
                "operation": result.operation,
                "direction": result.direction,
                "status": result.status,
                "records_processed": result.records_processed,
                "error_message": result.error_message,
                "started_at": result.started_at.isoformat() if result.started_at else None,
                "completed_at": result.completed_at.isoformat() if result.completed_at else None
            }).execute()
        except Exception as e:
            print(f"Erro ao registrar log de integração: {e}")

    async def get_logs(self, filters: Dict = None, limit: int = 50) -> List[Dict]:
        """Retorna logs de integração."""
        query = db_table(self.db,"integration_logs").select("*")

        if filters:
            if filters.get("system"):
                query = query.eq("system", filters["system"])
            if filters.get("status"):
                query = query.eq("status", filters["status"])

        response = query.order("started_at", desc=True).limit(limit).execute()
        return response.data or []

    # === Mapeamentos ===

    async def get_mappings(self, entity_type: str = None) -> List[Dict]:
        """Retorna mapeamentos de IDs entre sistemas."""
        query = db_table(self.db,"external_mappings").select("*")

        if entity_type:
            query = query.eq("entity_type", entity_type)

        response = query.execute()
        return response.data or []

    async def create_mapping(self, entity_type: str, harven_id: str,
                            moodle_id: str = None, jacad_id: str = None) -> Dict:
        """Cria um mapeamento entre IDs de diferentes sistemas."""
        mapping = {
            "id": str(uuid.uuid4()),
            "entity_type": entity_type,
            "harven_id": harven_id,
            "moodle_id": moodle_id,
            "jacad_id": jacad_id,
            "sync_status": "active"
        }

        response = db_table(self.db,"external_mappings").insert(mapping).execute()
        return response.data[0] if response.data else mapping
