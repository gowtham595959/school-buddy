#!/usr/bin/env bash
# --------------------------------------------------------
# DB SYNC — Apply migrations and sync backup to Azure
#
# Usage:
#   ./scripts/db_sync_azure.sh migrate          # Run each db/migrations/*.sql once (tracked)
#   ./scripts/db_sync_azure.sh migrate-baseline # Mark all *.sql as applied (no-op). Run ONCE on an
#                                               # existing DB that already has schema, then use migrate.
#   ./scripts/db_sync_azure.sh backup    # Create backup (calls db_backup_snapshot.sh)
#   ./scripts/db_sync_azure.sh upload           # Upload latest backup to Azure Files
#   ./scripts/db_sync_azure.sh full             # backup + upload (same as merge script db-full)
#   ./scripts/db_sync_azure.sh full-with-migrate # migrate + backup + upload
#   ./scripts/db_sync_azure.sh download # pull restore.backup from Azure Files → backups/
#
# Optional: copy scripts/azure.env.example → scripts/azure.env (gitignored) and set vars.
# Do not commit secrets. For download/upload you can use `az login` instead of a storage key.
#
# For upload/download/full/full-with-migrate, set:
#   AZURE_STORAGE_ACCOUNT  — Storage account name
#   AZURE_STORAGE_KEY      — Storage account key (or use az login)
#   AZURE_BACKUP_SHARE    — Share name (default: postgres-backup)
#   AZURE_WEBAPP_NAME     — Web App name (for restart, default: school-buddy-app)
#   AZURE_WEBAPP_RG       — Resource group (default: school-buddy-rg)
# --------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$SCRIPT_DIR/azure.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/azure.env"
  set +a
fi
MIGRATIONS_DIR="$PROJECT_ROOT/db/migrations"
BACKUP_DIR="$PROJECT_ROOT/backups/db_backup_snapshot"

DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"
DB_USER="postgres"
SHARE_NAME="${AZURE_BACKUP_SHARE:-postgres-backup}"
WEBAPP_NAME="${AZURE_WEBAPP_NAME:-school-buddy}"
WEBAPP_RG="${AZURE_WEBAPP_RG:-Schoolbuddy-dev-01}"

log_section() {
  echo ""
  echo "-------------------------------------"
  echo "🔷 $1"
  echo "-------------------------------------"
}

log_ok() { echo "✅ $1"; }
log_warn() { echo "⚠️  $1"; }
log_err() { echo "❌ $1"; }

migration_table_sql='CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);'

do_migrate() {
  log_section "Running migrations"
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_warn "No migrations directory: $MIGRATIONS_DIR"
    return 0
  fi

  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_err "Container $DB_CONTAINER is not running. Start it first (e.g. ./scripts/startup.sh)."
    exit 1
  fi

  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "$migration_table_sql" || exit 1

  mig_count=$(
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
      "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d '[:space:]'
  )
  if [ "${mig_count:-0}" = "0" ]; then
    subj_rows=$(
      docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM school_subjects;" 2>/dev/null | tr -d '[:space:]' || echo "0"
    )
    if [ "${subj_rows:-0}" -gt 0 ] 2>/dev/null; then
      log_err "schema_migrations is empty but school_subjects has rows — running migrate would replay"
      log_err "destructive SQL (e.g. 052) and wipe subjects. Run once:"
      log_err "  $0 migrate-baseline"
      log_err "then run migrate again."
      exit 1
    fi
  fi

  ran=0
  skipped=0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    already=$(
      docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT 1 FROM schema_migrations WHERE filename = '${base//\'/\'\'}' LIMIT 1;" 2>/dev/null | tr -d '[:space:]'
    )
    if [ "$already" = "1" ]; then
      echo "  Skip (already applied) $base"
      skipped=$((skipped + 1))
      continue
    fi
    echo "  Running $base..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f" || exit 1
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "INSERT INTO schema_migrations (filename) VALUES ('${base//\'/\'\'}');" || exit 1
    ran=$((ran + 1))
  done < <(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

  if [ "$ran" -eq 0 ] && [ "$skipped" -eq 0 ]; then
    log_warn "No migration files found."
  else
    log_ok "Applied $ran migration(s), skipped $skipped already applied."
  fi
}

do_migrate_baseline() {
  log_section "Baseline: marking all migration files as applied (does not run SQL)"
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_warn "No migrations directory: $MIGRATIONS_DIR"
    return 0
  fi
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_err "Container $DB_CONTAINER is not running."
    exit 1
  fi
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "$migration_table_sql" || exit 1

  n=0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "INSERT INTO schema_migrations (filename) VALUES ('${base//\'/\'\'}') ON CONFLICT (filename) DO NOTHING;" || exit 1
    n=$((n + 1))
  done < <(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
  log_ok "Recorded $n migration filename(s). New files added later will run normally."
  log_warn "Only use baseline on a DB that already matches these migrations; otherwise schema will be wrong."
}

do_backup() {
  log_section "Creating backup"
  "$SCRIPT_DIR/db_backup_snapshot.sh"
  log_ok "Backup created in $BACKUP_DIR"
}

do_upload() {
  log_section "Uploading backup to Azure Files"

  if ! command -v az &>/dev/null; then
    log_err "Azure CLI (az) not found. Install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi

  # Find latest backup
  latest=$(ls -t "$BACKUP_DIR"/db_full_"$DB_NAME"_*.backup 2>/dev/null | head -1)
  if [ -z "$latest" ]; then
    log_err "No backup found in $BACKUP_DIR. Run: ./scripts/db_sync_azure.sh backup"
    exit 1
  fi

  echo "  Source: $latest"

  if [ -z "$AZURE_STORAGE_ACCOUNT" ]; then
    log_err "Set AZURE_STORAGE_ACCOUNT (storage account name)."
    exit 1
  fi

  if [ -n "$AZURE_STORAGE_KEY" ]; then
    az storage file upload \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --account-key "$AZURE_STORAGE_KEY" \
      --share-name "$SHARE_NAME" \
      --source "$latest" \
      --path restore.backup
  else
    # Use az login (requires Storage Blob Data Contributor or similar)
    az storage file upload \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --share-name "$SHARE_NAME" \
      --source "$latest" \
      --path restore.backup
  fi

  log_ok "Uploaded to $SHARE_NAME/restore.backup"

  log_section "Restarting Web App"
  if az webapp show --name "$WEBAPP_NAME" --resource-group "$WEBAPP_RG" &>/dev/null; then
    az webapp restart --name "$WEBAPP_NAME" --resource-group "$WEBAPP_RG"
    log_ok "Restart issued. Wait 2–3 min for DB restore."
  else
    log_warn "Web App $WEBAPP_NAME not found. Restart manually if needed."
  fi
}

do_download() {
  log_section "Downloading restore.backup from Azure Files"

  if ! command -v az &>/dev/null; then
    log_err "Azure CLI (az) not found. Install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi

  if [ -z "$AZURE_STORAGE_ACCOUNT" ]; then
    log_err "Set AZURE_STORAGE_ACCOUNT in scripts/azure.env or the environment."
    exit 1
  fi

  mkdir -p "$BACKUP_DIR"
  dest="$BACKUP_DIR/restore_from_azure.backup"
  echo "  Share: $SHARE_NAME  path: restore.backup  →  $dest"

  if [ -n "$AZURE_STORAGE_KEY" ]; then
    az storage file download \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --account-key "$AZURE_STORAGE_KEY" \
      --share-name "$SHARE_NAME" \
      --path restore.backup \
      --dest "$dest"
  else
    az storage file download \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --share-name "$SHARE_NAME" \
      --path restore.backup \
      --dest "$dest"
  fi

  log_ok "Downloaded. Restore locally with:"
  log_ok "  ./scripts/db_restore_from_backup_snapshot.sh"
  log_ok "  (choose restore_from_azure.backup when prompted)"
}

show_help() {
  echo "Usage: $0 {migrate|migrate-baseline|backup|upload|download|full|full-with-migrate}"
  echo ""
  echo "  migrate           Run each db/migrations/*.sql once (see schema_migrations table)"
  echo "  migrate-baseline  Mark every *.sql as applied without running (one-time on existing DB)"
  echo "  backup     Create backup (db_backup_snapshot.sh)"
  echo "  upload     Upload latest backup to Azure Files, restart Web App"
  echo "  download   Download Azure Files restore.backup → backups/db_backup_snapshot/restore_from_azure.backup"
  echo "  full       backup → upload (no migrations; dump reflects local Docker DB as-is)"
  echo "  full-with-migrate  migrate → backup → upload"
  echo ""
  echo "Put non-secret + secret vars in scripts/azure.env (see azure.env.example). Optional: az login instead of key."
  echo ""
  echo "For upload/download/full/full-with-migrate, set:"
  echo "  AZURE_STORAGE_ACCOUNT   Storage account name"
  echo "  AZURE_STORAGE_KEY      Storage key (optional if az login + RBAC)"
  echo "  AZURE_BACKUP_SHARE     Share name (default: postgres-backup)"
  echo "  AZURE_WEBAPP_NAME      Web App name (default: school-buddy)"
  echo "  AZURE_WEBAPP_RG        Resource group (default: Schoolbuddy-dev-01)"
  echo ""
  echo "See docs/DB_SYNC_AZURE.md for full workflow."
}

# --- Main ---
cd "$PROJECT_ROOT" || exit 1

case "${1:-}" in
  migrate)
    do_migrate
    ;;
  migrate-baseline)
    do_migrate_baseline
    ;;
  backup)
    do_backup
    ;;
  upload)
    do_upload
    ;;
  download)
    do_download
    ;;
  full)
    do_backup
    do_upload
    ;;
  full-with-migrate)
    do_migrate
    do_backup
    do_upload
    ;;
  *)
    show_help
    exit 1
    ;;
esac

echo ""
echo "====================================="
echo "🎉 Done"
echo "====================================="
