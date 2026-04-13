"""Add session_reviews table for instructor conversation evaluation.

Revision ID: 002_session_reviews
Revises: 001_initial
Create Date: 2026-03-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_session_reviews"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "session_reviews",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("instructor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending_student"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_session_reviews_session_id", "session_reviews", ["session_id"])
    op.create_index("ix_session_reviews_instructor_id", "session_reviews", ["instructor_id"])


def downgrade() -> None:
    op.drop_index("ix_session_reviews_instructor_id", table_name="session_reviews")
    op.drop_index("ix_session_reviews_session_id", table_name="session_reviews")
    op.drop_table("session_reviews")
