"""
Mock de dados do JACAD para desenvolvimento.

Este arquivo simula a API do sistema acadêmico JACAD,
permitindo desenvolvimento e testes sem acesso ao sistema real.

Estrutura de dados:
- Alunos: RA, nome, curso, email
- Disciplinas: código, nome, departamento
- Matrículas: aluno x disciplina
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class MockStudent:
    ra: str
    nome: str
    email: str
    curso: str
    periodo: int
    situacao: str = "Ativo"


@dataclass
class MockDiscipline:
    codigo: str
    nome: str
    departamento: str
    carga_horaria: int
    semestre: str


@dataclass
class MockEnrollment:
    ra: str
    disciplina_codigo: str
    turma: str
    ano: int
    semestre: int
    situacao: str = "Matriculado"


class JacadMockData:
    """Classe com dados mockados do JACAD."""

    def __init__(self):
        # Alunos mock
        self._students: Dict[str, MockStudent] = {
            "2024001": MockStudent(
                ra="2024001",
                nome="João Silva Santos",
                email="joao.santos@aluno.edu.br",
                curso="Engenharia de Software",
                periodo=3
            ),
            "2024002": MockStudent(
                ra="2024002",
                nome="Maria Oliveira Costa",
                email="maria.costa@aluno.edu.br",
                curso="Ciência da Computação",
                periodo=5
            ),
            "2024003": MockStudent(
                ra="2024003",
                nome="Pedro Henrique Lima",
                email="pedro.lima@aluno.edu.br",
                curso="Engenharia de Software",
                periodo=3
            ),
            "2024004": MockStudent(
                ra="2024004",
                nome="Ana Beatriz Souza",
                email="ana.souza@aluno.edu.br",
                curso="Sistemas de Informação",
                periodo=7
            ),
            "2024005": MockStudent(
                ra="2024005",
                nome="Lucas Ferreira Alves",
                email="lucas.alves@aluno.edu.br",
                curso="Engenharia de Software",
                periodo=1
            ),
            "2023001": MockStudent(
                ra="2023001",
                nome="Carla Rodrigues Mendes",
                email="carla.mendes@aluno.edu.br",
                curso="Ciência da Computação",
                periodo=7
            ),
            "2023002": MockStudent(
                ra="2023002",
                nome="Bruno Costa Pereira",
                email="bruno.pereira@aluno.edu.br",
                curso="Engenharia de Software",
                periodo=5
            ),
        }

        # Disciplinas mock
        self._disciplines: Dict[str, MockDiscipline] = {
            "CC101": MockDiscipline(
                codigo="CC101",
                nome="Introdução à Programação",
                departamento="Ciência da Computação",
                carga_horaria=80,
                semestre="2024.1"
            ),
            "CC201": MockDiscipline(
                codigo="CC201",
                nome="Estrutura de Dados",
                departamento="Ciência da Computação",
                carga_horaria=80,
                semestre="2024.1"
            ),
            "CC301": MockDiscipline(
                codigo="CC301",
                nome="Banco de Dados",
                departamento="Ciência da Computação",
                carga_horaria=60,
                semestre="2024.1"
            ),
            "ES101": MockDiscipline(
                codigo="ES101",
                nome="Engenharia de Requisitos",
                departamento="Engenharia de Software",
                carga_horaria=60,
                semestre="2024.1"
            ),
            "ES201": MockDiscipline(
                codigo="ES201",
                nome="Arquitetura de Software",
                departamento="Engenharia de Software",
                carga_horaria=80,
                semestre="2024.1"
            ),
            "IA101": MockDiscipline(
                codigo="IA101",
                nome="Inteligência Artificial",
                departamento="Ciência da Computação",
                carga_horaria=80,
                semestre="2024.1"
            ),
        }

        # Matrículas mock (aluno x disciplina)
        self._enrollments: List[MockEnrollment] = [
            # João (2024001) - 3 disciplinas
            MockEnrollment(ra="2024001", disciplina_codigo="CC201", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024001", disciplina_codigo="ES101", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024001", disciplina_codigo="CC301", turma="B", ano=2024, semestre=1),

            # Maria (2024002) - 4 disciplinas
            MockEnrollment(ra="2024002", disciplina_codigo="CC301", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024002", disciplina_codigo="ES201", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024002", disciplina_codigo="IA101", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024002", disciplina_codigo="CC201", turma="A", ano=2024, semestre=1),

            # Pedro (2024003) - 2 disciplinas
            MockEnrollment(ra="2024003", disciplina_codigo="CC201", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024003", disciplina_codigo="ES101", turma="A", ano=2024, semestre=1),

            # Ana (2024004) - 3 disciplinas
            MockEnrollment(ra="2024004", disciplina_codigo="ES201", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024004", disciplina_codigo="IA101", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024004", disciplina_codigo="CC301", turma="A", ano=2024, semestre=1),

            # Lucas (2024005) - 2 disciplinas (calouro)
            MockEnrollment(ra="2024005", disciplina_codigo="CC101", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2024005", disciplina_codigo="ES101", turma="B", ano=2024, semestre=1),

            # Carla (2023001) - 2 disciplinas
            MockEnrollment(ra="2023001", disciplina_codigo="IA101", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2023001", disciplina_codigo="ES201", turma="A", ano=2024, semestre=1),

            # Bruno (2023002) - 3 disciplinas
            MockEnrollment(ra="2023002", disciplina_codigo="CC301", turma="B", ano=2024, semestre=1),
            MockEnrollment(ra="2023002", disciplina_codigo="ES201", turma="A", ano=2024, semestre=1),
            MockEnrollment(ra="2023002", disciplina_codigo="IA101", turma="A", ano=2024, semestre=1),
        ]

    def get_student_by_ra(self, ra: str) -> Optional[Dict]:
        """Retorna dados de um aluno pelo RA."""
        student = self._students.get(ra)
        if student:
            return {
                "ra": student.ra,
                "nome": student.nome,
                "email": student.email,
                "curso": student.curso,
                "periodo": student.periodo,
                "situacao": student.situacao
            }
        return None

    def get_student_enrollments(self, ra: str) -> List[Dict]:
        """Retorna as matrículas de um aluno."""
        enrollments = []
        for e in self._enrollments:
            if e.ra == ra:
                disc = self._disciplines.get(e.disciplina_codigo)
                enrollments.append({
                    "disciplina_codigo": e.disciplina_codigo,
                    "disciplina_nome": disc.nome if disc else "Desconhecida",
                    "turma": e.turma,
                    "ano": e.ano,
                    "semestre": e.semestre,
                    "situacao": e.situacao
                })
        return enrollments

    def get_disciplines(self) -> List[Dict]:
        """Retorna todas as disciplinas."""
        return [
            {
                "codigo": d.codigo,
                "nome": d.nome,
                "departamento": d.departamento,
                "carga_horaria": d.carga_horaria,
                "semestre": d.semestre
            }
            for d in self._disciplines.values()
        ]

    def get_discipline_students(self, discipline_code: str) -> List[Dict]:
        """Retorna alunos matriculados em uma disciplina."""
        students = []
        for e in self._enrollments:
            if e.disciplina_codigo == discipline_code:
                student = self._students.get(e.ra)
                if student:
                    students.append({
                        "ra": student.ra,
                        "nome": student.nome,
                        "email": student.email,
                        "curso": student.curso,
                        "turma": e.turma,
                        "situacao": e.situacao
                    })
        return students

    def get_all_students(self) -> List[Dict]:
        """Retorna todos os alunos."""
        return [
            {
                "ra": s.ra,
                "nome": s.nome,
                "email": s.email,
                "curso": s.curso,
                "periodo": s.periodo,
                "situacao": s.situacao
            }
            for s in self._students.values()
        ]


# Instância global do mock
JACAD_MOCK_DATA = JacadMockData()
