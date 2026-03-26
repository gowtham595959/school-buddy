#!/usr/bin/env bash
# --------------------------------------------------------
# DB SYNC — Apply migrations and sync backup to Azure
#
# Usage:
#   ./scripts/db_sync_azure.sh migrate   # Run migrations on local Docker DB
#   ./scripts/db_sync_azure.sh backup    # Create backup (calls db_backup_snapshot.sh)
#   ./scripts/db_sync_azure.sh upload   # Upload latest backup to Azure Files
#   ./scripts/db_sync_azure.sh full     # migrate + backup + upload
#   ./scripts/db_sync_azure.sh download # pull restore.backup from Azure Files → backups/
#
# Optional: copy scripts/azure.env.example → scripts/azure.env (gitignored) and set vars.
# Do not commit secrets. For download/upload you can use `az login` instead of a storage key.
#
# For upload/download/full, set:
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
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    echo "  Running $(basename "$f")..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f" || exit 1
    count=$((count + 1))
  done < <(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

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
  echo "Usage: $0 {migrate|backup|upload|download|full}"
  echo ""
  echo "  migrate    Run db/migrations/*.sql on local Docker DB"
  echo "  backup     Create backup (db_backup_snapshot.sh)"
  echo "  upload     Upload latest backup to Azure Files, restart Web App"
  echo "  download   Download Azure Files restore.backup → backups/db_backup_snapshot/restore_from_azure.backup"
  echo "  full       migrate → backup → upload"
  echo ""
  echo "Put non-secret + secret vars in scripts/azure.env (see azure.env.example). Optional: az login instead of key."
  echo ""
  echo "For upload/download/full, set:"
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
