from sqlalchemy import select, func
from sqlalchemy.orm import Session
from models.admin import SystemSettings, SystemLog, SystemBackup
from .base import BaseRepository


class AdminRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db, SystemSettings)

    # Settings - singleton pattern
    def get_settings(self):
        query = select(SystemSettings).limit(1)
        return self.db.execute(query).scalar_one_or_none()

    def update_settings(self, data: dict):
        existing = self.get_settings()
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
            obj = SystemSettings(**data)
            self.db.add(obj)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(obj)
            return obj

    # Logs
    def create_log(self, data: dict):
        log = SystemLog(**data)
        self.db.add(log)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(log)
        return log

    def get_logs(self, limit=10, offset=0, order_by="created_at", desc=True):
        query = select(SystemLog)
        col = getattr(SystemLog, order_by)
        query = query.order_by(col.desc() if desc else col.asc())
        count_query = select(func.count()).select_from(SystemLog)
        total = self.db.execute(count_query).scalar() or 0
        query = query.offset(offset).limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def search_logs(self, filters: dict = None, limit=50, offset=0):
        query = select(SystemLog)
        if filters:
            if "type" in filters and filters["type"]:
                query = query.where(SystemLog.type == filters["type"])
            if "status" in filters and filters["status"]:
                query = query.where(SystemLog.status == filters["status"])
            if "author" in filters and filters["author"]:
                query = query.where(SystemLog.author.ilike(f"%{filters['author']}%"))
            if "msg" in filters and filters["msg"]:
                query = query.where(SystemLog.msg.ilike(f"%{filters['msg']}%"))
            if "date_from" in filters and filters["date_from"]:
                query = query.where(SystemLog.created_at >= filters["date_from"])
            if "date_to" in filters and filters["date_to"]:
                query = query.where(SystemLog.created_at <= filters["date_to"])
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        query = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def export_logs(self, limit=1000):
        query = select(SystemLog).order_by(SystemLog.created_at.desc()).limit(limit)
        return self.db.execute(query).scalars().all()

    # Backups
    def get_backups(self, limit=10, offset=0):
        query = select(SystemBackup).order_by(SystemBackup.created_at.desc())
        count_query = select(func.count()).select_from(SystemBackup)
        total = self.db.execute(count_query).scalar() or 0
        query = query.offset(offset).limit(limit)
        rows = self.db.execute(query).scalars().all()
        return rows, total

    def create_backup(self, data: dict):
        backup = SystemBackup(**data)
        self.db.add(backup)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(backup)
        return backup

    def get_backup_by_id(self, backup_id: str):
        return self.db.get(SystemBackup, backup_id)

    def delete_backup(self, backup_id: str) -> bool:
        obj = self.db.get(SystemBackup, backup_id)
        if not obj:
            return False
        self.db.delete(obj)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return True
