"""Add google_sub and auth_provider to users table

Revision ID: 0003_add_user_google_auth
Revises: 0002_add_production_indexes
Create Date: 2026-09-17 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003_add_user_google_auth'
down_revision: Union[str, None] = '0002_add_production_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('google_sub', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=32), nullable=False, server_default='email'))
        batch_op.create_index('ix_users_google_sub', ['google_sub'], unique=True)
        batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index('ix_users_google_sub')
        batch_op.drop_column('auth_provider')
        batch_op.drop_column('google_sub')
        batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=False)
