"""Tests for db_compat.py — Supabase-compatible query builder over SQLAlchemy."""
import uuid
import pytest
from db_compat import db_table, TableQuery, QueryResult
from models import User, Discipline, SystemSettings


class TestQueryResult:
    def test_default_values(self):
        r = QueryResult()
        assert r.data == []
        assert r.count == 0

    def test_with_data(self):
        r = QueryResult(data=[{"id": "1"}], count=1)
        assert r.count == 1
        assert r.data[0]["id"] == "1"


class TestTableQuerySelect:
    def test_select_all_users(self, db, sample_user):
        result = db_table(db, "users").select("*").execute()
        assert isinstance(result, QueryResult)
        assert len(result.data) >= 1

    def test_select_with_eq_filter(self, db, sample_user):
        result = db_table(db, "users").select("*").eq("id", sample_user.id).execute()
        assert len(result.data) == 1
        assert result.data[0]["id"] == sample_user.id

    def test_select_with_neq_filter(self, db, sample_user, sample_admin):
        result = db_table(db, "users").select("*").neq("role", "ADMIN").execute()
        roles = [u["role"] for u in result.data]
        assert "ADMIN" not in roles

    def test_select_single(self, db, sample_user):
        result = db_table(db, "users").select("*").eq("id", sample_user.id).single().execute()
        assert isinstance(result.data, dict)
        assert result.data["id"] == sample_user.id

    def test_select_single_not_found(self, db):
        result = db_table(db, "users").select("*").eq("id", "nonexistent").single().execute()
        # QueryResult normalizes None → [] in __init__, so single not-found returns empty
        assert not result.data

    def test_select_with_count(self, db, sample_user):
        result = db_table(db, "users").select("*", count="exact").execute()
        assert result.count >= 1

    def test_select_with_order(self, db, sample_user, sample_admin):
        result = db_table(db, "users").select("*").order("name", desc=False).execute()
        names = [u["name"] for u in result.data]
        assert names == sorted(names)

    def test_select_with_limit(self, db, sample_user, sample_admin):
        result = db_table(db, "users").select("*").limit(1).execute()
        assert len(result.data) == 1

    def test_select_with_range(self, db, sample_user, sample_admin):
        result = db_table(db, "users").select("*").range(0, 0).execute()
        assert len(result.data) == 1

    def test_select_with_ilike(self, db, sample_user):
        result = db_table(db, "users").select("*").ilike("name", "%Test%").execute()
        assert len(result.data) >= 1

    def test_select_with_in(self, db, sample_user):
        result = db_table(db, "users").select("*").in_("role", ["STUDENT", "INSTRUCTOR"]).execute()
        assert all(u["role"] in ["STUDENT", "INSTRUCTOR"] for u in result.data)

    def test_select_with_is_null(self, db, sample_user):
        result = db_table(db, "users").select("*").is_("avatar_url", "null").execute()
        assert len(result.data) >= 1

    def test_select_with_not_is_null(self, db, sample_user):
        # sample_user has ra = "12345" which is not null
        result = db_table(db, "users").select("*").not_.is_("ra", "null").execute()
        assert all(u["ra"] is not None for u in result.data)


class TestTableQueryInsert:
    def test_insert_single(self, db):
        result = db_table(db, "users").insert({
            "id": str(uuid.uuid4()),
            "name": "Inserted User",
            "email": f"ins-{uuid.uuid4().hex[:6]}@test.com",
            "password_hash": "$2b$12$test",
            "role": "STUDENT",
            "ra": f"RA{uuid.uuid4().hex[:8]}",
        }).execute()
        assert len(result.data) == 1
        assert result.data[0]["name"] == "Inserted User"

    def test_insert_batch(self, db):
        result = db_table(db, "disciplines").insert([
            {"id": str(uuid.uuid4()), "name": "Disc A", "code": "A01"},
            {"id": str(uuid.uuid4()), "name": "Disc B", "code": "B01"},
        ]).execute()
        assert len(result.data) == 2


class TestTableQueryUpdate:
    def test_update_by_eq(self, db, sample_user):
        result = (
            db_table(db, "users")
            .update({"name": "Updated Via Compat"})
            .eq("id", sample_user.id)
            .execute()
        )
        assert len(result.data) == 1
        assert result.data[0]["name"] == "Updated Via Compat"


class TestTableQueryDelete:
    def test_delete_by_eq(self, db):
        uid = str(uuid.uuid4())
        db_table(db, "disciplines").insert({
            "id": uid, "name": "To Delete", "code": "DEL"
        }).execute()

        result = db_table(db, "disciplines").delete().eq("id", uid).execute()
        assert len(result.data) == 1
        assert result.data[0]["id"] == uid

        # Verify deleted
        check = db_table(db, "disciplines").select("*").eq("id", uid).execute()
        assert len(check.data) == 0


class TestTableQueryUpsert:
    def test_upsert_insert(self, db):
        uid = str(uuid.uuid4())
        result = db_table(db, "disciplines").upsert({
            "id": uid, "name": "Upserted", "code": "UPS"
        }).execute()
        assert len(result.data) == 1

    def test_upsert_update_existing(self, db, sample_discipline):
        result = db_table(db, "disciplines").upsert({
            "id": sample_discipline.id, "name": "Updated Discipline", "code": "UPD"
        }).execute()
        assert result.data[0]["name"] == "Updated Discipline"


class TestSanitizeData:
    def test_now_conversion(self):
        sanitized = TableQuery._sanitize_data({"created_at": "now()"})
        assert sanitized["created_at"] is not None
        assert hasattr(sanitized["created_at"], "isoformat")

    def test_metadata_alias(self):
        sanitized = TableQuery._sanitize_data({"metadata": '{"key": "value"}'})
        assert "extra_metadata" in sanitized
        assert "metadata" not in sanitized

    def test_exported_at_alias(self):
        sanitized = TableQuery._sanitize_data({"exported_at": "2026-01-01"})
        assert "moodle_exported_at" in sanitized
        assert "exported_at" not in sanitized


class TestUnknownTable:
    def test_raises_on_unknown(self, db):
        with pytest.raises(ValueError, match="Unknown table"):
            db_table(db, "nonexistent_table")
