---
name: create-migration
description: Generate safe Alembic database migrations with automatic rollback validation
disable-model-invocation: true
context: fork
---

# Create Migration Skill

## Purpose

Generate reversible Alembic database migrations from SQLAlchemy model changes. User-only invocation ensures migrations are reviewed before execution.

## Usage

```
/create-migration [description]
```

**Examples:**

```
/create-migration add_doctor_notes_to_records
→ Creates migration_XXXX_add_doctor_notes_to_records.py

/create-migration alter_user_role_enum
→ Auto-detects model changes, generates safe ALTER TABLE
```

## Workflow

1. **Review** the generated migration file
2. **Test** on a local copy of the database
3. **Apply** to production with `alembic upgrade head`
4. **Keep** rollback script for emergency downgrade

## Generated Files

```
backend/alembic/versions/
├── XXXX_<description>.py          (upgrade + downgrade)
└── rollback_<description>.sql     (manual rollback SQL)
```

## Safety Checks

✅ Always generate both `upgrade()` and `downgrade()` functions
✅ Test rollback before committing
✅ Mark destructive migrations (DROP COLUMN, DROP TABLE)
✅ Add data backups for large table modifications
✅ Auto-detect column defaults for NOT NULL additions

## Example Migration

```python
# backend/alembic/versions/20250516_add_doctor_notes.py

def upgrade() -> None:
    op.add_column('medical_record', 
        sa.Column('doctor_notes', sa.String(2000), nullable=True)
    )

def downgrade() -> None:
    op.drop_column('medical_record', 'doctor_notes')
```

## Running Migrations

```bash
cd backend

# See pending migrations
alembic current
alembic heads

# Apply latest migration
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision>
```

## Important

⚠️ **Always test on a database copy first**

```bash
# Backup production database
pg_dump healthcare > backup_$(date +%Y%m%d).sql

# Test migration locally
psql -f backup.sql -d test_db
alembic upgrade head
```

Never apply untested migrations to production.
