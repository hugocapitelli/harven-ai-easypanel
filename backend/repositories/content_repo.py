from sqlalchemy import select
from sqlalchemy.orm import Session
from models.content import Content
from .base import BaseRepository


class ContentRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, Content)

    def search(self, column: str, term: str):
        col = getattr(Content, column)
        query = select(Content).where(col.ilike(f"%{term}%"))
        return self.db.execute(query).scalars().all()

    def update_audio_url(self, content_id: str, url: str):
        return self.update(content_id, {"audio_url": url})

    def update_text_url(self, content_id: str, url: str):
        return self.update(content_id, {"text_url": url})
