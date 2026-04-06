# DB Sync Strategy — When to Use What

With a large DB (~200MB geojson) and no direct connection to Azure's Postgres, here's the practical approach.

---

## Two sync modes

| Mode | What it syncs | When to use | Effort |
|------|---------------|-------------|--------|
| **Boot migrations** (`RUN_DB_MIGRATIONS=1`) | `db/migrations/*.sql` on container start | Small schema changes without a new backup (optional; **off** in `deploy.parameters.json` today) | Automatic on deploy/restart |
| **Local migrations + dump** | You run `migrate` locally, then **backup** | Same as above when Azure skips boot migrations (`RUN_DB_MIGRATIONS=0`) | Manual |
| **Full backup** (`db-full`) | Entire DB via `pg_dump` → `restore.backup` | Bulk data (GIS, catchments), or any change when backup is source of truth | Manual, ~5 min |

---

## Decision flow

```
Did you change...?
│
├─ Schema (new columns, tables)
│  ├─► Azure RUN_DB_MIGRATIONS=1: add migration → deploy; migrations run on startup.
│  └─► Azure RUN_DB_MIGRATIONS=0 (default in repo): migrate locally →
│      ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full
│      (or one shot: db-full-sql-files = migrate + backup + upload).
│
├─ Small data (a few schools, fees, flags)
│  └─► Same split: boot migrations if enabled, else local migrate + db-full.
│
└─ Bulk data (new catchments, many schools, geojson)
   └─► Full backup sync: ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full
       (local Docker DB must already be correct — script does not run migrations).
```

---

## Why not "only copy changes"?

| Constraint | Impact |
|------------|--------|
| **Azure Postgres is inside the container** | No direct connection from Codespace. Can't run `pg_restore` or `psql` against it. |
| **Geojson is large** | Incremental sync would need to diff 200MB. Complex and error-prone. |
| **Single backup file** | Azure restores from one file. No "apply delta" without SSH into container. |

**Practical result:** With **`RUN_DB_MIGRATIONS=0`** (current default in deploy config), schema and data reach Azure mainly via **`db-full`**. With **`RUN_DB_MIGRATIONS=1`**, small schema changes can ship as migration files on deploy. Bulk data still favors a full backup.

---

## Repeatable process

### 1. One-time setup

```bash
# Copy config template
cp scripts/azure.env.example scripts/azure.env

# Edit azure.env — add your storage key:
# az storage account keys list --account-name stgaccschbuddydev01 --resource-group Schoolbuddy-dev-01 --query "[0].value" -o tsv

# Load before sync (or add to .bashrc)
source scripts/azure.env
```

### 2. Schema or small data change

```bash
# Add migration
echo "ALTER TABLE ..." >> db/migrations/003_my_change.sql

# Local Docker
./scripts/db_sync_azure.sh migrate

# Azure with RUN_DB_MIGRATIONS=0 (typical): ship schema via backup
source scripts/azure.env   # az login if needed
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full

# OR enable boot migrations on the Web App (RUN_DB_MIGRATIONS=1) and deploy;
# then new migration files apply on container start without a new backup.
```

### 3. Bulk data change (GIS, many schools)

```bash
# Ensure data is correct in local Docker (loaders, SQL, etc.).
# db-full does not run migrations — use db-full-sql-files if you need migrate first.

az login
source scripts/azure.env

./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full
# Optional: ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full-sql-files
```

---

## Files involved

| File | Purpose |
|------|---------|
| `scripts/Code_DB_MergeGIT_DeployAzure.sh` | One script for Git + DB: `db-full`, `db-full-sql-files`, `db-migrations`, … |
| `scripts/db_sync_azure.sh` | `backup`, `upload`, `full`, `full-with-migrate`, `migrate`, … |
| `scripts/azure.env.example` | Template — copy to `azure.env`, add key |
| `scripts/azure.env` | Your credentials (gitignored) |
| `db/migrations/*.sql` | Schema + seed (local via `migrate`; on Azure only if `RUN_DB_MIGRATIONS` enabled) |
| `.github/deploy.parameters.json` | Includes `RUN_DB_MIGRATIONS` (repo default skips boot migrations) |

---

## Future: Azure Database for PostgreSQL

If you migrate to **Azure Database for PostgreSQL** (managed):

- Direct connection string from anywhere
- `pg_dump` / `pg_restore` between local and Azure
- Possible incremental sync tools
- Extra cost (~$25–50/mo for Basic tier)
