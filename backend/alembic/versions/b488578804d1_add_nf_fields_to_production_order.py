"""add_nf_fields_to_production_order

Revision ID: b488578804d1
Revises: 28abcf0c5b9d
Create Date: 2026-04-30 16:49:08.415186

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b488578804d1'
down_revision: Union[str, Sequence[str], None] = '28abcf0c5b9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('production_orders', sa.Column('nf_number', sa.String(), nullable=True))
    op.add_column('production_orders', sa.Column('nf_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('production_orders', 'nf_date')
    op.drop_column('production_orders', 'nf_number')
