from sqlalchemy import select
from sqlalchemy.orm import Session
from models.gamification import UserActivity, UserStats, UserAchievement, Certificate
from models.progress import CourseProgress
from .base import BaseRepository


class GamificationRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, UserActivity)

    # Activities
    def create_activity(self, data: dict):
        activity = UserActivity(**data)
        self.db.add(activity)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(activity)
        return activity

    def get_user_activities(self, user_id: str, limit=50, offset=0):
        query = (
            select(UserActivity)
            .where(UserActivity.user_id == user_id)
            .order_by(UserActivity.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return self.db.execute(query).scalars().all()

    # Stats
    def get_or_create_stats(self, user_id: str):
        query = select(UserStats).where(UserStats.user_id == user_id)
        stats = self.db.execute(query).scalar_one_or_none()
        if not stats:
            stats = UserStats(user_id=user_id)
            self.db.add(stats)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(stats)
        return stats

    def update_stats(self, user_id: str, data: dict):
        stats = self.get_or_create_stats(user_id)
        for key, value in data.items():
            if hasattr(stats, key):
                setattr(stats, key, value)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(stats)
        return stats

    # Achievements
    def create_achievement(self, data: dict):
        achievement = UserAchievement(**data)
        self.db.add(achievement)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(achievement)
        return achievement

    def get_achievements(self, user_id: str):
        query = select(UserAchievement).where(UserAchievement.user_id == user_id)
        return self.db.execute(query).scalars().all()

    # Certificates
    def create_certificate(self, data: dict):
        cert = Certificate(**data)
        self.db.add(cert)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(cert)
        return cert

    def get_certificates(self, user_id: str):
        query = select(Certificate).where(Certificate.user_id == user_id)
        return self.db.execute(query).scalars().all()

    # Progress
    def upsert_progress(self, user_id: str, course_id: str, data: dict):
        query = select(CourseProgress).where(
            CourseProgress.user_id == user_id,
            CourseProgress.course_id == course_id,
        )
        existing = self.db.execute(query).scalar_one_or_none()
        if existing:
            for key, value in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(existing)
            return existing
        else:
            progress = CourseProgress(user_id=user_id, course_id=course_id, **data)
            self.db.add(progress)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(progress)
            return progress

    def get_progress(self, user_id: str, course_id: str):
        query = select(CourseProgress).where(
            CourseProgress.user_id == user_id,
            CourseProgress.course_id == course_id,
        )
        return self.db.execute(query).scalar_one_or_none()
