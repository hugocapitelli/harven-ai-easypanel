"""Initial schema baseline — all tables from Supabase migration.

Revision ID: 001_initial
Revises: None
Create Date: 2026-02-28

This is a BASELINE migration. It documents the existing schema
created during the Supabase-to-Azure migration. Run with --sql
to generate the T-SQL script for new environments, or stamp
if the database already has these tables:

    alembic stamp 001_initial
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("ra", sa.String(50), nullable=True),
        sa.Column("jacad_ra", sa.String(50), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Disciplines
    op.create_table(
        "disciplines",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("jacad_codigo", sa.String(100), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Discipline Teachers
    op.create_table(
        "discipline_teachers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("discipline_id", sa.String(36), sa.ForeignKey("disciplines.id"), nullable=False),
        sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Discipline Students
    op.create_table(
        "discipline_students",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("discipline_id", sa.String(36), sa.ForeignKey("disciplines.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Courses
    op.create_table(
        "courses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("discipline_id", sa.String(36), sa.ForeignKey("disciplines.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, server_default="'draft'"),
        sa.Column("created_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Chapters
    op.create_table(
        "chapters",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Contents
    op.create_table(
        "contents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("chapter_id", sa.String(36), sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Questions
    op.create_table(
        "questions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("content_id", sa.String(36), sa.ForeignKey("contents.id"), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(50), nullable=True),
        sa.Column("options", sa.Text(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Chat Sessions
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content_id", sa.String(36), sa.ForeignKey("contents.id"), nullable=True),
        sa.Column("chapter_id", sa.String(36), nullable=True),
        sa.Column("course_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, server_default="'active'"),
        sa.Column("total_messages", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("performance_score", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("moodle_user_id", sa.String(100), nullable=True),
        sa.Column("moodle_activity_id", sa.String(100), nullable=True),
        sa.Column("synced_to_moodle", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column("moodle_exported_at", sa.DateTime(), nullable=True),
        sa.Column("moodle_portfolio_id", sa.String(255), nullable=True),
        sa.Column("moodle_rating", sa.String(50), nullable=True),
        sa.Column("discipline_id", sa.String(36), nullable=True),
        sa.Column("discipline_name", sa.String(255), nullable=True),
        sa.Column("content_title", sa.String(500), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("moodle_export_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Chat Messages
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("agent_type", sa.String(50), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # System Settings
    op.create_table(
        "system_settings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_name", sa.String(255), nullable=True),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("support_email", sa.String(255), nullable=True),
        sa.Column("primary_color", sa.String(20), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("login_logo_url", sa.String(500), nullable=True),
        sa.Column("login_bg_url", sa.String(500), nullable=True),
        sa.Column("module_auto_register", sa.Boolean(), nullable=True),
        sa.Column("module_ai_tutor", sa.Boolean(), nullable=True),
        sa.Column("module_gamification", sa.Boolean(), nullable=True),
        sa.Column("module_dark_mode", sa.Boolean(), nullable=True),
        sa.Column("limit_tokens", sa.Integer(), nullable=True),
        sa.Column("limit_upload_mb", sa.Integer(), nullable=True),
        sa.Column("ai_daily_token_limit", sa.Integer(), nullable=True),
        sa.Column("openai_key", sa.String(500), nullable=True),
        sa.Column("anthropic_connected", sa.Boolean(), nullable=True),
        sa.Column("sso_azure", sa.Boolean(), nullable=True),
        sa.Column("sso_google", sa.Boolean(), nullable=True),
        sa.Column("moodle_url", sa.String(500), nullable=True),
        sa.Column("moodle_token", sa.String(500), nullable=True),
        sa.Column("moodle_enabled", sa.Boolean(), nullable=True),
        sa.Column("moodle_sync_frequency", sa.String(50), nullable=True),
        sa.Column("moodle_last_sync", sa.String(50), nullable=True),
        sa.Column("moodle_export_format", sa.String(20), nullable=True),
        sa.Column("moodle_auto_export", sa.Boolean(), nullable=True),
        sa.Column("moodle_portfolio_enabled", sa.Boolean(), nullable=True),
        sa.Column("moodle_rating_enabled", sa.Boolean(), nullable=True),
        sa.Column("moodle_webhook_secret", sa.String(500), nullable=True),
        sa.Column("jacad_enabled", sa.Boolean(), nullable=True),
        sa.Column("jacad_url", sa.String(500), nullable=True),
        sa.Column("jacad_api_key", sa.String(500), nullable=True),
        sa.Column("jacad_sync_frequency", sa.String(50), nullable=True),
        sa.Column("jacad_last_sync", sa.String(50), nullable=True),
        sa.Column("jacad_auto_create_users", sa.Boolean(), nullable=True),
        sa.Column("jacad_sync_enrollments", sa.Boolean(), nullable=True),
        sa.Column("smtp_server", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), nullable=True),
        sa.Column("smtp_user", sa.String(255), nullable=True),
        sa.Column("smtp_password", sa.String(500), nullable=True),
        sa.Column("pwd_min_length", sa.Integer(), nullable=True),
        sa.Column("pwd_special_chars", sa.Boolean(), nullable=True),
        sa.Column("pwd_expiration", sa.Boolean(), nullable=True),
        sa.Column("session_timeout", sa.String(50), nullable=True),
        sa.Column("force_2fa", sa.Boolean(), nullable=True),
        sa.Column("firewall_blocked_ips", sa.Text(), nullable=True),
        sa.Column("firewall_whitelist", sa.Text(), nullable=True),
        sa.Column("last_force_logout", sa.String(50), nullable=True),
        sa.Column("backup_enabled", sa.Boolean(), nullable=True),
        sa.Column("backup_frequency", sa.String(50), nullable=True),
        sa.Column("backup_retention", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # System Logs
    op.create_table(
        "system_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("msg", sa.Text(), nullable=True),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # System Backups
    op.create_table(
        "system_backups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("size_mb", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("records", sa.Integer(), nullable=True),
        sa.Column("storage_path", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # User Activities
    op.create_table(
        "user_activities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # User Stats
    op.create_table(
        "user_stats",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("total_points", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_sessions", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_messages", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("avg_score", sa.Float(), nullable=True),
        sa.Column("streak_days", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # User Achievements
    op.create_table(
        "user_achievements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("achievement_type", sa.String(100), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("earned_at", sa.DateTime(), nullable=True),
    )

    # Certificates
    op.create_table(
        "certificates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("certificate_url", sa.String(500), nullable=True),
        sa.Column("issued_at", sa.DateTime(), nullable=True),
    )

    # Course Progress
    op.create_table(
        "course_progress",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("progress_pct", sa.Float(), nullable=True, server_default="0"),
        sa.Column("last_chapter_id", sa.String(36), nullable=True),
        sa.Column("last_content_id", sa.String(36), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Token Usage
    op.create_table(
        "token_usage",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(36), nullable=True),
        sa.Column("tokens_input", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("tokens_output", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("cost_usd", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Moodle Ratings
    op.create_table(
        "moodle_ratings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("chat_sessions.id"), nullable=False),
        sa.Column("moodle_rating", sa.String(50), nullable=True),
        sa.Column("moodle_feedback", sa.Text(), nullable=True),
        sa.Column("rated_at", sa.DateTime(), nullable=True),
    )

    # Integration Logs
    op.create_table(
        "integration_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("system", sa.String(50), nullable=True),
        sa.Column("operation", sa.String(100), nullable=True),
        sa.Column("direction", sa.String(20), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("records_processed", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # External Mappings
    op.create_table(
        "external_mappings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("local_id", sa.String(36), nullable=True),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("external_system", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("external_mappings")
    op.drop_table("integration_logs")
    op.drop_table("moodle_ratings")
    op.drop_table("token_usage")
    op.drop_table("notifications")
    op.drop_table("course_progress")
    op.drop_table("certificates")
    op.drop_table("user_achievements")
    op.drop_table("user_stats")
    op.drop_table("user_activities")
    op.drop_table("system_backups")
    op.drop_table("system_logs")
    op.drop_table("system_settings")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("questions")
    op.drop_table("contents")
    op.drop_table("chapters")
    op.drop_table("courses")
    op.drop_table("discipline_students")
    op.drop_table("discipline_teachers")
    op.drop_table("disciplines")
    op.drop_table("users")
