# DB Sync — Applying Codebase Changes to Azure

The repo ships SQL under `db/migrations/`. **Production** loads data from **`restore.backup`** on the Azure Files share. Whether those files also run on every container start is controlled by **`RUN_DB_MIGRATIONS`** (see `docker/start.sh`). In `.github/deploy.parameters.json` this is set to **`0`**, so Azure **skips** boot-time migrations and treats the backup as the full source of truth.

**See [DB_SYNC_STRATEGY.md](./DB_SYNC_STRATEGY.md)** for when to use migrations locally vs full backup upload.

---

## How it works (production)

| Step | What happens |
|------|--------------|
| 1. Restore | If `schoolmap` is missing, container runs `pg_restore` from `/docker-backup/restore.backup`. Existing DB skips restore unless you use the one-shot `RESTORE_SCHOOLMAP_FROM_BACKUP=1` flow (see `docker/start.sh` header). |
| 2. SQL migrations | **If** `RUN_DB_MIGRATIONS` is unset or `1`: each `db/migrations/*.sql` runs once (ledger in `schema_migrations`). **If** `RUN_DB_MIGRATIONS` is `0` / `false` / `no` / `off`: this step is skipped — schema and data come only from the backup. |
| 3. API start | Node.js starts with the resulting database. |

---

## When to do what

| Event | Typical action (backup-as-truth, `RUN_DB_MIGRATIONS=0`) |
|-------|--------------------------------------------------------|
| **Bulk data or schema** already applied **locally** (Docker `schoolmap`) | Run **`db-full`**: pg_dump from local → upload `restore.backup` → restart Web App. No automatic migrate step in that script. |
| **You want the pipeline to apply new `db/migrations/*.sql` on boot** | Set **`RUN_DB_MIGRATIONS=1`** on the Web App (or in `deploy.parameters.json`), deploy, then rely on startup migrations — or keep `0` and ship schema via backup only. |
| **Apply every migration locally, then sync** | **`db-full-sql-files`** (or `db_sync_azure.sh full-with-migrate`): migrate → backup → upload. |

For day-to-day work on a mature DB, **`db-full`** assumes your local Docker database already has the right schema and data; it only dumps and uploads.

---

## Industry pattern (optional boot migrations)

Many stacks run migrations after the app connects to the DB. Here, that path is **optional** so a full **`pg_restore`** is not replayed against migration files that might drop or alter objects (`RUN_DB_MIGRATIONS=0`). When boot migrations are **on**, keep migrations idempotent (`IF NOT EXISTS`, etc.).

---

## Migration files

Place new migrations in `db/migrations/` with a numeric prefix:

```
db/migrations/
  001_add_schools_fees.sql
  002_add_new_column.sql
  ...
```

Run them in order locally with `./scripts/db_sync_azure.sh migrate` (uses `schema_migrations`).

---

## Scripts

### `scripts/Code_DB_MergeGIT_DeployAzure.sh` (Git + DB)

```bash
./scripts/Code_DB_MergeGIT_DeployAzure.sh                 # Status + options
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-migrations   # Run migrations on **local** Docker DB only
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full         # Local **backup → upload** → restart Azure (no local migrate)
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full-sql-files   # Local **migrate → backup → upload** → restart
```

Requires `scripts/azure.env` (and usually `az login`) for upload.

### `scripts/db_sync_azure.sh` (lower-level)

- `migrate` — Run migrations on **local** DB  
- `migrate-baseline` — Mark all `*.sql` as applied without running (one-time on an already-migrated DB)  
- `backup` — Create `db_full_<db>_<timestamp>.backup` under `backups/db_backup_snapshot/`  
- `upload` — Upload latest backup to Azure Files as `restore.backup` and restart the Web App  
- `download` — Pull Azure `restore.backup` to local backups folder  
- **`full`** — **backup → upload** (same idea as **`db-full`**, no local migrate)  
- **`full-with-migrate`** — **migrate → backup → upload** (same idea as **`db-full-sql-files`**)

### `scripts/sync_db_to_azure.sh` (short aliases)

Forwards to the merge script: `migrations` → `db-migrations`; `full` → `db-full`; `full-sql-files` or `full-with-migrate` → `db-full-sql-files`.

### Config: `scripts/azure.env`

Copy `scripts/azure.env.example` to `scripts/azure.env`, add `AZURE_STORAGE_KEY` (or use `az login` with RBAC).
