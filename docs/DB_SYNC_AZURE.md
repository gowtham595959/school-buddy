# DB Sync — Applying Codebase Changes to Azure

Your codebase has migrations (e.g. `db/migrations/001_add_schools_fees.sql`). Azure production restores from **restore.backup**, then **runs migrations automatically** on every container start.

**See [DB_SYNC_STRATEGY.md](./DB_SYNC_STRATEGY.md)** for when to use migrations vs full backup.

---

## How it works (updated)

| Step | What happens |
|------|--------------|
| 1. Restore | Container restores from `/docker-backup/restore.backup` (if DB is new) |
| 2. **Migrations** | Container runs `db/migrations/*.sql` — adds new columns, tables, etc. |
| 3. API start | Node.js starts with the updated schema |

**Backup** = your data (~200MB). **Migrations** = small schema changes (new columns, etc.). Both travel with the code. No need to re-upload backup for schema-only changes.

---

## When to do what

| Event | Action |
|-------|--------|
| **New migration** (e.g. `002_add_foo.sql`) | Just deploy. Migrations run automatically on container start. |
| **Code deploy** (merge to main) | Deploy as usual. Migrations run after restore. |
| **Bulk data change** (new schools, updated fees) | Create backup locally → upload to Azure → restart. |

---

## Industry standard: migrations on startup

Running migrations after DB restore/connect is a common pattern (Flyway, Liquibase, Rails, etc.). Benefits:

- **Backup** = data (large, rarely changes)
- **Migrations** = schema (small, versioned in code)
- **Deploy** = code + migrations together — no manual DB steps for schema changes

---

## Migration files

Place new migrations in `db/migrations/` with numeric prefix:

```
db/migrations/
  001_add_schools_fees.sql
  002_add_new_column.sql
  ...
```

Run them in order. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` where possible so re-runs are safe.

---

## Scripts

### `scripts/Code_DB_MergeGIT_DeployAzure.sh` (one script for Git + DB)

```bash
./scripts/Code_DB_MergeGIT_DeployAzure.sh              # Show status + all options
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full      # Full backup + upload + restart Azure
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-migrations # Run migrations locally only
```

### `scripts/db_sync_azure.sh` (lower-level)

- `migrate` — Run migrations on local DB
- `backup` — Create backup
- `upload` — Upload to Azure + restart
- `full` — migrate + backup + upload

### Config: `scripts/azure.env`

Copy `scripts/azure.env.example` to `scripts/azure.env`, add `AZURE_STORAGE_KEY`.
