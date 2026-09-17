"""Add production indexes and generated_learning_paths table

Revision ID: 0002_add_production_indexes
Revises: 0001_initial_schema
Create Date: 2026-09-17 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002_add_production_indexes'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Compound index on document_chunks (document_id, page_number)
    op.create_index(
        'ix_document_chunks_doc_page',
        'document_chunks',
        ['document_id', 'page_number'],
        unique=False,
    )

    # 2. Compound index on messages (conversation_id, created_at)
    op.create_index(
        'ix_messages_convo_created',
        'messages',
        ['conversation_id', 'created_at'],
        unique=False,
    )

    # 3. Create generated_learning_paths table
    op.create_table(
        'generated_learning_paths',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('language', sa.String(length=32), nullable=True, server_default='auto'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('steps', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_generated_learning_paths_document_id'), 'generated_learning_paths', ['document_id'], unique=False)
    op.create_index(op.f('ix_generated_learning_paths_user_id'), 'generated_learning_paths', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_generated_learning_paths_user_id'), table_name='generated_learning_paths')
    op.drop_index(op.f('ix_generated_learning_paths_document_id'), table_name='generated_learning_paths')
    op.drop_table('generated_learning_paths')
    op.drop_index('ix_messages_convo_created', table_name='messages')
    op.drop_index('ix_document_chunks_doc_page', table_name='document_chunks')
