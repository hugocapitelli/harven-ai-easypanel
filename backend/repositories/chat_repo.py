from sqlalchemy import select, update as sa_update
from sqlalchemy.orm import Session, joinedload
from models.chat import ChatSession, ChatMessage
from models.content import Content
from models.chapter import Chapter
from models.course import Course
from .base import BaseRepository


class ChatRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, ChatSession)

    def get_sessions_for_user(self, user_id: str):
        query = (
            select(ChatSession)
            .options(
                joinedload(ChatSession.content)
                .joinedload(Content.chapter)
                .joinedload(Chapter.course)
            )
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        return self.db.execute(query).scalars().unique().all()

    def get_session_with_messages(self, session_id: str):
        query = (
            select(ChatSession)
            .options(joinedload(ChatSession.messages))
            .where(ChatSession.id == session_id)
        )
        return self.db.execute(query).scalars().unique().first()

    def get_by_content_user(self, content_id: str, user_id: str):
        query = select(ChatSession).where(
            ChatSession.content_id == content_id,
            ChatSession.user_id == user_id,
        )
        return self.db.execute(query).scalar_one_or_none()

    def create_message(self, session_id: str, data: dict):
        data["session_id"] = session_id
        msg = ChatMessage(**data)
        self.db.add(msg)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(msg)
        return msg

    def get_messages(self, session_id: str):
        query = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return self.db.execute(query).scalars().all()

    def increment_message_count(self, session_id: str):
        self.db.execute(
            sa_update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(total_messages=ChatSession.total_messages + 1),
        )
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
