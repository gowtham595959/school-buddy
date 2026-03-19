# DB Sync Strategy — When to Use What

With a large DB (~200MB geojson) and no direct connection to Azure's Postgres, here's the practical approach.

---

## Two sync modes

| Mode | What it syncs | When to use | Effort |
|------|---------------|-------------|--------|
| **Migrations** | Schema + small seed data (≤100 rows) | Every deploy, small changes | Automatic |
| **Full backup** | Entire DB (schema + all data) | Bulk data changes (GIS, catchments, many schools) | Manual, ~5 min |

---

## Decision flow

```
Did you change...?
│
├─ Schema (new columns, tables)
│  └─► Add migration → Deploy. Migrations run on startup. ✅
│
├─ Small data (a few schools, fees, flags)
│  └─► Add migration (002_seed_*.sql) → Deploy. ✅
│
└─ Bulk data (new catchments, many schools, geojson)
   └─► Full backup sync required. Run: ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full
```

---

## Why not "only copy changes"?

| Constraint | Impact |
|------------|--------|
| **Azure Postgres is inside the container** | No direct connection from Codespace. Can't run `pg_restore` or `psql` against it. |
| **Geojson is large** | Incremental sync would need to diff 200MB. Complex and error-prone. |
| **Single backup file** | Azure restores from one file. No "apply delta" without SSH into container. |

**Practical result:** Schema + small data → migrations. Bulk data → full backup.

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

# Deploy (GitHub Actions or manual)
# Migrations run automatically on container start.
```

### 3. Bulk data change (GIS, many schools)

```bash
# Ensure az login
az login

# Load Azure config
source scripts/azure.env

# Full sync
./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full
```

---

## Files involved

| File | Purpose |
|------|---------|
| `scripts/Code_DB_MergeGIT_DeployAzure.sh` | One script for Git + DB (see `./scripts/Code_DB_MergeGIT_DeployAzure.sh` for options) |
| `scripts/azure.env.example` | Template — copy to `azure.env`, add key |
| `scripts/azure.env` | Your credentials (gitignored) |
| `db/migrations/*.sql` | Schema + seed data (run on every deploy) |

---

## Future: Azure Database for PostgreSQL

If you migrate to **Azure Database for PostgreSQL** (managed):

- Direct connection string from anywhere
- `pg_dump` / `pg_restore` between local and Azure
- Possible incremental sync tools
- Extra cost (~$25–50/mo for Basic tier)
