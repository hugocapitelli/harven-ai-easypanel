from sqlalchemy import select, func
from sqlalchemy.orm import Session
from models.chapter import Chapter
from .base import BaseRepository


class ChapterRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, Chapter)

    def get_all(self, filters=None, order_by=None, desc=False, limit=None, offset=None):
        query = select(Chapter)
        if filters:
            for key, value in filters.items():
                query = query.where(getattr(Chapter, key) == value)
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        if order_by:
            col = getattr(Chapter, order_by)
            query = query.order_by(col.desc() if desc else col.asc())
        else:
            query = query.order_by(Chapter.order.asc())
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def reorder(self, chapter_id: str, new_order: int):
        return self.update(chapter_id, {"order": new_order})
