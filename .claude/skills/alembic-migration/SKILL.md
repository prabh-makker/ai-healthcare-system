---
name: alembic-migration
description: Generate and validate an Alembic migration for SQLAlchemy model changes. Args: description of the schema change.
disable-model-invocation: true
---

Generate an Alembic migration for: $ARGUMENTS

Steps:
1. Read current models in `backend/app/models/models.py` to understand existing schema
2. Read existing migrations in `backend/alembic/versions/` to understand current head
3. Describe the exact schema change needed (columns added/removed/modified, tables, constraints)
4. Generate the migration file in `backend/alembic/versions/` with:
   - Correct `down_revision` pointing to current head
   - Unique revision id (use short hash format)
   - Both `upgrade()` and `downgrade()` functions
   - No data migrations mixed with schema migrations
5. Warn if the change is destructive (DROP COLUMN, DROP TABLE) — these cannot be undone without a backup
6. Print the command to apply: `cd backend && alembic upgrade head`

Constraints:
- Never run `alembic upgrade head` automatically — user must confirm and run manually
- Always implement `downgrade()` — never leave it as `pass`
- For nullable→NOT NULL changes, always provide a server_default or handle existing NULLs first
