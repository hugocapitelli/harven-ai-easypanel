from sqlalchemy import select
from sqlalchemy.orm import Session
from models.question import Question
from .base import BaseRepository


class QuestionRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, Question)

    def update_status(self, question_id: str, status: str):
        return self.update(question_id, {"status": status})

    def delete_by_status(self, content_id: str, status: str) -> int:
        return self.delete_where({"content_id": content_id, "status": status})

    def get_by_content_and_status(self, content_id: str, status: str):
        query = select(Question).where(
            Question.content_id == content_id,
            Question.status == status,
        )
        return self.db.execute(query).scalars().all()
