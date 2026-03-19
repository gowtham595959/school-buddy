#!/usr/bin/env bash
# --------------------------------------------------------
# DB SYNC — Apply migrations and sync backup to Azure
#
# Usage:
#   ./scripts/db_sync_azure.sh migrate   # Run migrations on local Docker DB
#   ./scripts/db_sync_azure.sh backup    # Create backup (calls db_backup_snapshot.sh)
#   ./scripts/db_sync_azure.sh upload   # Upload latest backup to Azure Files
#   ./scripts/db_sync_azure.sh full     # migrate + backup + upload
#
# For upload/full, set:
#   AZURE_STORAGE_ACCOUNT  — Storage account name
#   AZURE_STORAGE_KEY      — Storage account key (or use az login)
#   AZURE_BACKUP_SHARE    — Share name (default: postgres-backup)
#   AZURE_WEBAPP_NAME     — Web App name (for restart, default: school-buddy-app)
#   AZURE_WEBAPP_RG       — Resource group (default: school-buddy-rg)
# --------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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

  count=0
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$f" ] || continue
    echo "  Running $(basename "$f")..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$f"
    count=$((count + 1))
  done

  if [ "$count" -eq 0 ]; then
    log_warn "No migration files found."
  else
    log_ok "Ran $count migration(s)."
  fi
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

show_help() {
  echo "Usage: $0 {migrate|backup|upload|full}"
  echo ""
  echo "  migrate   Run db/migrations/*.sql on local Docker DB"
  echo "  backup    Create backup (db_backup_snapshot.sh)"
  echo "  upload    Upload latest backup to Azure Files, restart Web App"
  echo "  full      migrate → backup → upload"
  echo ""
  echo "For upload/full, set:"
  echo "  AZURE_STORAGE_ACCOUNT   Storage account name"
  echo "  AZURE_STORAGE_KEY      Storage key (optional if az login)"
  echo "  AZURE_BACKUP_SHARE     Share name (default: postgres-backup)"
  echo "  AZURE_WEBAPP_NAME      Web App name (default: school-buddy-app)"
  echo "  AZURE_WEBAPP_RG        Resource group (default: school-buddy-rg)"
  echo ""
  echo "See docs/DB_SYNC_AZURE.md for full workflow."
}

# --- Main ---
cd "$PROJECT_ROOT" || exit 1

case "${1:-}" in
  migrate)
    do_migrate
    ;;
  backup)
    do_backup
    ;;
  upload)
    do_upload
    ;;
  full)
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
