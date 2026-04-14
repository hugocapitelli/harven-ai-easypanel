"""
Supabase-compatible query builder wrapping SQLAlchemy.

Provides a chainable API that matches supabase-py's interface
(table().select().eq().range().execute()) but uses SQLAlchemy
under the hood. This allows gradual migration of routes from
supabase patterns to direct repository usage.

All data access goes through SQLAlchemy — no supabase dependency.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, update as sa_update, delete as sa_delete
from models import (
    User, Discipline, DisciplineTeacher, DisciplineStudent,
    Course, Chapter, Content, Question,
    ChatSession, ChatMessage,
    SystemSettings as SystemSettingsModel, SystemLog, SystemBackup,
    UserActivity, UserStats, UserAchievement, Certificate,
    CourseProgress, Notification, TokenUsage,
    MoodleRating, IntegrationLog, ExternalMapping,
    SessionReview,
)

TABLE_MODEL_MAP = {
    "users": User,
    "disciplines": Discipline,
    "discipline_teachers": DisciplineTeacher,
    "discipline_students": DisciplineStudent,
    "courses": Course,
    "chapters": Chapter,
    "contents": Content,
    "questions": Question,
    "chat_sessions": ChatSession,
    "chat_messages": ChatMessage,
    "system_settings": SystemSettingsModel,
    "system_logs": SystemLog,
    "system_backups": SystemBackup,
    "user_activities": UserActivity,
    "user_stats": UserStats,
    "user_achievements": UserAchievement,
    "certificates": Certificate,
    "course_progress": CourseProgress,
    "notifications": Notification,
    "token_usage": TokenUsage,
    "moodle_ratings": MoodleRating,
    "integration_logs": IntegrationLog,
    "external_mappings": ExternalMapping,
    "session_reviews": SessionReview,
}


class QueryResult:
    """Mimics supabase response object."""
    def __init__(self, data=None, count=None):
        self.data = data if data is not None else []
        self.count = count if count is not None else (len(self.data) if isinstance(self.data, list) else 0)


class TableQuery:
    """Chainable query builder that mimics supabase.table() API."""

    def __init__(self, db: Session, table_name: str):
        self.db = db
        self.table_name = table_name
        self.model = TABLE_MODEL_MAP.get(table_name)
        if not self.model:
            raise ValueError(f"Unknown table: {table_name}")

        self._select_cols = "*"
        self._count_mode = False
        self._filters = []
        self._neq_filters = []
        self._is_filters = []
        self._is_not_filters = []
        self._in_filters = []
        self._ilike_filters = []
        self._or_filters = []
        self._order_col = None
        self._order_desc = False
        self._limit_val = None
        self._offset_val = None
        self._range_start = None
        self._range_end = None
        self._single = False
        self._insert_data = None
        self._update_data = None
        self._upsert_data = None
        self._delete_mode = False
        self._match_filters = None
        self._join_select = None
        self._negate_next = False

    def select(self, cols, count=None):
        self._select_cols = cols
        if count == "exact":
            self._count_mode = True
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def in_(self, col, values):
        self._in_filters.append((col, values))
        return self

    def neq(self, col, val):
        self._neq_filters.append((col, val))
        return self

    def ilike(self, col, pattern):
        self._ilike_filters.append((col, pattern))
        return self

    def is_(self, col, val):
        if self._negate_next:
            self._is_not_filters.append((col, val))
            self._negate_next = False
        else:
            self._is_filters.append((col, val))
        return self

    @property
    def not_(self):
        self._negate_next = True
        return self

    def or_(self, filter_string):
        self._or_filters.append(filter_string)
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, val):
        self._limit_val = val
        return self

    def range(self, start, end):
        self._range_start = start
        self._range_end = end
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, data, count=None):
        self._insert_data = data
        if count == "exact":
            self._count_mode = True
        return self

    def update(self, data):
        self._update_data = data
        return self

    def upsert(self, data):
        self._upsert_data = data
        return self

    def delete(self):
        self._delete_mode = True
        return self

    def match(self, filters):
        self._match_filters = filters
        return self

    def execute(self):
        # INSERT
        if self._insert_data is not None:
            return self._do_insert()

        # UPDATE
        if self._update_data is not None:
            return self._do_update()

        # UPSERT
        if self._upsert_data is not None:
            return self._do_upsert()

        # DELETE
        if self._delete_mode:
            return self._do_delete()

        # SELECT
        return self._do_select()

    def _sanitize_data(self, data: dict) -> dict:
        """Sanitize insert/update data: resolve 'now()' strings, map column aliases, coerce DateTime fields, serialize dicts."""
        import json as _json
        from datetime import datetime, timezone
        from sqlalchemy import DateTime, inspect as sa_inspect
        COLUMN_ALIAS_MAP = {
            "metadata": "extra_metadata",
            "exported_at": "moodle_exported_at",
        }
        result = {}
        for key, val in data.items():
            mapped_key = COLUMN_ALIAS_MAP.get(key, key)
            if val == "now()":
                result[mapped_key] = datetime.now(timezone.utc)
            elif isinstance(val, (dict, list)):
                result[mapped_key] = _json.dumps(val, ensure_ascii=False)
            else:
                result[mapped_key] = val

        # Coerce ISO string values to datetime objects for DateTime columns
        try:
            mapper = sa_inspect(self.model)
            for col in mapper.columns:
                if isinstance(col.type, DateTime) and col.key in result:
                    val = result[col.key]
                    if isinstance(val, str):
                        try:
                            result[col.key] = datetime.fromisoformat(val.replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            pass
        except Exception:
            pass  # If inspection fails, skip coercion — don't break the flow

        return result

    def _do_insert(self):
        if isinstance(self._insert_data, list):
            sanitized = [self._sanitize_data(d) for d in self._insert_data]
            objects = [self.model(**d) for d in sanitized]
            self.db.add_all(objects)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            for obj in objects:
                self.db.refresh(obj)
            data = [self._to_dict(obj) for obj in objects]
            return QueryResult(data=data, count=len(data))
        else:
            sanitized = self._sanitize_data(self._insert_data)
            obj = self.model(**sanitized)
            self.db.add(obj)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(obj)
            return QueryResult(data=[self._to_dict(obj)], count=1)

    def _do_update(self):
        sanitized = self._sanitize_data(self._update_data)
        query = select(self.model)
        for col, val in self._filters:
            query = query.where(getattr(self.model, col) == val)
        objects = self.db.execute(query).scalars().all()
        results = []
        for obj in objects:
            for key, value in sanitized.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            results.append(obj)
        if results:
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            for obj in results:
                self.db.refresh(obj)
        return QueryResult(data=[self._to_dict(obj) for obj in results])

    def _do_upsert(self):
        data = self._upsert_data
        if isinstance(data, dict):
            sanitized = self._sanitize_data(data)
            # Check if exists by id
            if "id" in sanitized:
                existing = self.db.get(self.model, sanitized["id"])
                if existing:
                    for key, value in sanitized.items():
                        if hasattr(existing, key):
                            setattr(existing, key, value)
                    try:
                        self.db.commit()
                    except Exception:
                        self.db.rollback()
                        raise
                    self.db.refresh(existing)
                    return QueryResult(data=[self._to_dict(existing)])
            obj = self.model(**sanitized)
            self.db.add(obj)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
            self.db.refresh(obj)
            return QueryResult(data=[self._to_dict(obj)])
        return QueryResult()

    def _do_delete(self):
        query = select(self.model)
        for col, val in self._filters:
            query = query.where(getattr(self.model, col) == val)
        if self._match_filters:
            for col, val in self._match_filters.items():
                query = query.where(getattr(self.model, col) == val)
        objects = self.db.execute(query).scalars().all()
        data = [self._to_dict(obj) for obj in objects]
        for obj in objects:
            self.db.delete(obj)
        if objects:
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()
                raise
        return QueryResult(data=data)

    def _do_select(self):
        from sqlalchemy import or_ as sa_or_
        query = select(self.model)

        # Apply equality filters
        for col, val in self._filters:
            query = query.where(getattr(self.model, col) == val)

        # Apply not-equal filters
        for col, val in self._neq_filters:
            query = query.where(getattr(self.model, col) != val)

        # Apply IS NULL / IS NOT NULL filters
        for col, val in self._is_filters:
            col_attr = getattr(self.model, col)
            if val == "null" or val is None:
                query = query.where(col_attr.is_(None))
            else:
                query = query.where(col_attr == val)

        for col, val in self._is_not_filters:
            col_attr = getattr(self.model, col)
            if val == "null" or val is None:
                query = query.where(col_attr.isnot(None))
            else:
                query = query.where(col_attr != val)

        # Apply IN filters
        for col, values in self._in_filters:
            query = query.where(getattr(self.model, col).in_(values))

        # Apply ILIKE filters
        for col, pattern in self._ilike_filters:
            query = query.where(getattr(self.model, col).ilike(pattern))

        # Apply OR filters (Supabase format: "col1.op.val,col2.op.val")
        for filter_string in self._or_filters:
            or_clauses = []
            for part in filter_string.split(","):
                parts = part.strip().split(".", 2)
                if len(parts) == 3:
                    col_name, op, val = parts
                    col_attr = getattr(self.model, col_name, None)
                    if col_attr is not None:
                        if op == "ilike":
                            or_clauses.append(col_attr.ilike(val))
                        elif op == "eq":
                            or_clauses.append(col_attr == val)
                        elif op == "neq":
                            or_clauses.append(col_attr != val)
            if or_clauses:
                query = query.where(sa_or_(*or_clauses))

        # Count (before pagination)
        count = None
        if self._count_mode:
            count_query = select(func.count()).select_from(query.subquery())
            count = self.db.execute(count_query).scalar() or 0

        # Ordering
        if self._order_col:
            col_attr = getattr(self.model, self._order_col)
            query = query.order_by(col_attr.desc() if self._order_desc else col_attr.asc())

        # Range / pagination
        if self._range_start is not None and self._range_end is not None:
            query = query.offset(self._range_start).limit(self._range_end - self._range_start + 1)
        elif self._offset_val is not None:
            query = query.offset(self._offset_val)

        # Limit
        if self._limit_val is not None:
            query = query.limit(self._limit_val)

        # Execute
        results = self.db.execute(query).scalars().all()
        data = [self._to_dict(obj) for obj in results]

        if self._single:
            if data:
                return QueryResult(data=data[0], count=count)
            else:
                return QueryResult(data=None, count=count)

        return QueryResult(data=data, count=count if count is not None else len(data))

    def _to_dict(self, obj):
        if obj is None:
            return None
        from sqlalchemy import inspect as sa_inspect
        result = {}
        try:
            mapper = sa_inspect(type(obj))
            for attr in mapper.column_attrs:
                val = getattr(obj, attr.key, None)
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                result[attr.columns[0].name] = val
        except Exception:
            if hasattr(obj, 'to_dict'):
                return obj.to_dict()
            return {c.name: getattr(obj, c.name, None) for c in obj.__table__.columns}
        return result


class RpcCaller:
    """Mimics supabase.rpc() for stored procedure calls."""

    def __init__(self, db: Session, func_name: str, params: dict):
        self.db = db
        self.func_name = func_name
        self.params = params

    def execute(self):
        if self.func_name == "increment_message_count":
            session_id = self.params.get("p_session_id")
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
        return QueryResult()


def db_table(db, table_name: str):
    """Create a supabase-compatible query builder for the given table."""
    return TableQuery(db, table_name)


def db_rpc(db, func_name: str, params: dict):
    """Create a supabase-compatible RPC caller."""
    return RpcCaller(db, func_name, params)
