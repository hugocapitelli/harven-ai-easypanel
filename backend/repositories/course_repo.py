from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from models.course import Course
from models.chapter import Chapter
from models.content import Content
from models.question import Question
from .base import BaseRepository


class CourseRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, Course)

    def get_all(self, filters=None, order_by=None, desc=False, limit=None, offset=None):
        query = select(Course)
        if filters:
            for key, value in filters.items():
                if isinstance(value, list):
                    query = query.where(getattr(Course, key).in_(value))
                else:
                    query = query.where(getattr(Course, key) == value)
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        if order_by:
            col = getattr(Course, order_by)
            query = query.order_by(col.desc() if desc else col.asc())
        else:
            query = query.order_by(Course.created_at.desc())
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def export_full(self, course_id: str):
        query = (
            select(Course)
            .options(
                joinedload(Course.chapters)
                .joinedload(Chapter.contents)
                .joinedload(Content.questions)
            )
            .where(Course.id == course_id)
        )
        return self.db.execute(query).scalars().unique().first()

    def get_with_chapters(self, course_id: str):
        query = (
            select(Course)
            .options(joinedload(Course.chapters))
            .where(Course.id == course_id)
        )
        return self.db.execute(query).scalars().unique().first()
