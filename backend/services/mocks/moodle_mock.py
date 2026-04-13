"""
Mock de dados do Moodle para desenvolvimento.

Este arquivo simula a API do Moodle LMS,
permitindo desenvolvimento e testes sem acesso ao sistema real.

Estrutura de dados:
- Site Info: informações do site Moodle
- Usuários: ID, nome, email, role
- Cursos: ID, nome, categoria
- Matrículas: usuário x curso
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class MockMoodleUser:
    id: int
    username: str
    firstname: str
    lastname: str
    email: str
    roles: List[str]


@dataclass
class MockMoodleCourse:
    id: int
    shortname: str
    fullname: str
    categoryid: int
    category_name: str


@dataclass
class MockMoodleEnrollment:
    userid: int
    courseid: int
    role: str  # student, teacher


class MoodleMockData:
    """Classe com dados mockados do Moodle."""

    def __init__(self):
        # Usuários mock do Moodle
        self._users: Dict[int, MockMoodleUser] = {
            101: MockMoodleUser(
                id=101,
                username="joao.santos",
                firstname="João",
                lastname="Silva Santos",
                email="joao.santos@aluno.edu.br",
                roles=["student"]
            ),
            102: MockMoodleUser(
                id=102,
                username="maria.costa",
                firstname="Maria",
                lastname="Oliveira Costa",
                email="maria.costa@aluno.edu.br",
                roles=["student"]
            ),
            103: MockMoodleUser(
                id=103,
                username="pedro.lima",
                firstname="Pedro",
                lastname="Henrique Lima",
                email="pedro.lima@aluno.edu.br",
                roles=["student"]
            ),
            201: MockMoodleUser(
                id=201,
                username="prof.carlos",
                firstname="Carlos",
                lastname="Eduardo Silva",
                email="carlos.silva@professor.edu.br",
                roles=["teacher", "editingteacher"]
            ),
            202: MockMoodleUser(
                id=202,
                username="prof.ana",
                firstname="Ana",
                lastname="Paula Martins",
                email="ana.martins@professor.edu.br",
                roles=["teacher", "editingteacher"]
            ),
            301: MockMoodleUser(
                id=301,
                username="admin",
                firstname="Administrador",
                lastname="Sistema",
                email="admin@edu.br",
                roles=["admin", "manager"]
            ),
        }

        # Cursos mock do Moodle
        self._courses: Dict[int, MockMoodleCourse] = {
            1001: MockMoodleCourse(
                id=1001,
                shortname="CC201-2024",
                fullname="Estrutura de Dados - 2024.1",
                categoryid=10,
                category_name="Ciência da Computação"
            ),
            1002: MockMoodleCourse(
                id=1002,
                shortname="CC301-2024",
                fullname="Banco de Dados - 2024.1",
                categoryid=10,
                category_name="Ciência da Computação"
            ),
            1003: MockMoodleCourse(
                id=1003,
                shortname="ES101-2024",
                fullname="Engenharia de Requisitos - 2024.1",
                categoryid=20,
                category_name="Engenharia de Software"
            ),
            1004: MockMoodleCourse(
                id=1004,
                shortname="ES201-2024",
                fullname="Arquitetura de Software - 2024.1",
                categoryid=20,
                category_name="Engenharia de Software"
            ),
            1005: MockMoodleCourse(
                id=1005,
                shortname="IA101-2024",
                fullname="Inteligência Artificial - 2024.1",
                categoryid=10,
                category_name="Ciência da Computação"
            ),
        }

        # Matrículas mock
        self._enrollments: List[MockMoodleEnrollment] = [
            # João em 3 cursos
            MockMoodleEnrollment(userid=101, courseid=1001, role="student"),
            MockMoodleEnrollment(userid=101, courseid=1002, role="student"),
            MockMoodleEnrollment(userid=101, courseid=1003, role="student"),

            # Maria em 4 cursos
            MockMoodleEnrollment(userid=102, courseid=1001, role="student"),
            MockMoodleEnrollment(userid=102, courseid=1002, role="student"),
            MockMoodleEnrollment(userid=102, courseid=1004, role="student"),
            MockMoodleEnrollment(userid=102, courseid=1005, role="student"),

            # Pedro em 2 cursos
            MockMoodleEnrollment(userid=103, courseid=1001, role="student"),
            MockMoodleEnrollment(userid=103, courseid=1003, role="student"),

            # Prof. Carlos em 3 cursos
            MockMoodleEnrollment(userid=201, courseid=1001, role="teacher"),
            MockMoodleEnrollment(userid=201, courseid=1002, role="teacher"),
            MockMoodleEnrollment(userid=201, courseid=1005, role="teacher"),

            # Prof. Ana em 2 cursos
            MockMoodleEnrollment(userid=202, courseid=1003, role="teacher"),
            MockMoodleEnrollment(userid=202, courseid=1004, role="teacher"),
        ]

        # Portfólio mock (entradas criadas pelo Harven.ai)
        self._portfolio_entries: List[Dict] = []

        # Avaliações mock
        self._ratings: List[Dict] = []

    def get_site_info(self) -> Dict:
        """Retorna informações do site Moodle."""
        return {
            "sitename": "Moodle - Universidade Mock",
            "siteurl": "https://moodle.mock.edu.br",
            "username": "webservice",
            "firstname": "Web",
            "lastname": "Service",
            "fullname": "Web Service",
            "lang": "pt_br",
            "userid": 999,
            "userpictureurl": "",
            "functions": [
                {"name": "core_webservice_get_site_info", "version": "4.0"},
                {"name": "core_user_get_users", "version": "4.0"},
                {"name": "core_course_get_courses", "version": "4.0"},
                {"name": "core_enrol_get_enrolled_users", "version": "4.0"},
            ],
            "release": "4.0+ (Build: 20231120)",
            "version": "2022041900",
            "mobilecssurl": ""
        }

    def get_users(self, criteria: Dict = None) -> Dict:
        """Retorna usuários do Moodle."""
        users = []
        for user in self._users.values():
            users.append({
                "id": user.id,
                "username": user.username,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "fullname": f"{user.firstname} {user.lastname}",
                "email": user.email,
                "roles": [{"shortname": r} for r in user.roles]
            })
        return {"users": users, "warnings": []}

    def get_courses(self) -> List[Dict]:
        """Retorna cursos do Moodle."""
        return [
            {
                "id": c.id,
                "shortname": c.shortname,
                "fullname": c.fullname,
                "categoryid": c.categoryid,
                "categoryname": c.category_name,
                "visible": 1,
                "format": "topics"
            }
            for c in self._courses.values()
        ]

    def get_enrolled_users(self, course_id: int = None) -> List[Dict]:
        """Retorna usuários matriculados em um curso."""
        users = []
        for enrollment in self._enrollments:
            if course_id and enrollment.courseid != course_id:
                continue

            user = self._users.get(enrollment.userid)
            if user:
                users.append({
                    "id": user.id,
                    "username": user.username,
                    "firstname": user.firstname,
                    "lastname": user.lastname,
                    "fullname": f"{user.firstname} {user.lastname}",
                    "email": user.email,
                    "roles": [{"shortname": enrollment.role}]
                })
        return users

    def get_user_grades(self, course_id: int, user_id: int) -> Dict:
        """Retorna notas de um usuário em um curso."""
        # Mock: retorna notas aleatórias
        import random
        return {
            "usergrades": [
                {
                    "courseid": course_id,
                    "userid": user_id,
                    "userfullname": self._users.get(user_id, MockMoodleUser(0, "", "", "", "", [])).firstname,
                    "maxdepth": 3,
                    "gradeitems": [
                        {
                            "id": 1,
                            "itemname": "Harven.ai - Sessões Socráticas",
                            "itemtype": "mod",
                            "itemmodule": "harven",
                            "graderaw": random.uniform(60, 100),
                            "grademax": 100.0,
                            "grademin": 0.0,
                            "feedback": ""
                        }
                    ]
                }
            ]
        }

    def add_portfolio_entry(self, user_id: int, data: Dict) -> Dict:
        """Adiciona uma entrada ao portfólio do usuário."""
        import uuid
        entry_id = str(uuid.uuid4())

        self._portfolio_entries.append({
            "id": entry_id,
            "userid": user_id,
            "title": data.get("title", ""),
            "content": data.get("content", ""),
            "tags": data.get("tags", ""),
            "created_at": "2024-01-15T10:30:00Z"
        })

        return {"success": True, "id": entry_id}

    def get_portfolio_entries(self, user_id: int = None) -> List[Dict]:
        """Retorna entradas do portfólio."""
        if user_id:
            return [e for e in self._portfolio_entries if e["userid"] == user_id]
        return self._portfolio_entries

    def add_rating(self, portfolio_id: str, rating: int, feedback: str, teacher_id: int) -> Dict:
        """Adiciona uma avaliação a uma entrada de portfólio."""
        self._ratings.append({
            "portfolio_id": portfolio_id,
            "rating": rating,
            "feedback": feedback,
            "teacher_id": teacher_id,
            "rated_at": "2024-01-16T14:00:00Z"
        })
        return {"success": True}

    def get_ratings(self, portfolio_id: str = None) -> List[Dict]:
        """Retorna avaliações."""
        if portfolio_id:
            return [r for r in self._ratings if r["portfolio_id"] == portfolio_id]
        return self._ratings

    # Mapeamento RA -> Moodle User ID (para integração JACAD <-> Moodle)
    RA_TO_MOODLE_ID = {
        "2024001": 101,  # João
        "2024002": 102,  # Maria
        "2024003": 103,  # Pedro
    }

    def get_moodle_user_id_by_ra(self, ra: str) -> Optional[int]:
        """Retorna o ID do Moodle para um RA do JACAD."""
        return self.RA_TO_MOODLE_ID.get(ra)


# Instância global do mock
MOODLE_MOCK_DATA = MoodleMockData()
