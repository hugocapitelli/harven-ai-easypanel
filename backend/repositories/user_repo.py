from sqlalchemy import select
from sqlalchemy.orm import Session
from models.user import User
from .base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, User)

    def get_by_ra(self, ra: str):
        query = select(User).where(User.ra == ra)
        return self.db.execute(query).scalar_one_or_none()

    def get_by_role(self, role: str):
        query = select(User).where(User.role == role)
        return self.db.execute(query).scalars().all()

    def search_users(self, term: str):
        pattern = f"%{term}%"
        query = select(User).where(
            (User.name.ilike(pattern)) | (User.email.ilike(pattern)) | (User.ra.ilike(pattern))
        )
        return self.db.execute(query).scalars().all()

    def update_avatar(self, user_id: str, avatar_url: str):
        return self.update(user_id, {"avatar_url": avatar_url})
