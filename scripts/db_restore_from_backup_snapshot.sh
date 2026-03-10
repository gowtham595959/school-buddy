#!/bin/bash

DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"
DB_USER="postgres"

# Resolve project root relative to this script (works locally and in DevContainer)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_BACKUP_DIR="$PROJECT_ROOT/backups/db_backup_snapshot"

echo "======================================"
echo "🔄 SCHOOL BUDDY - DATABASE RESTORE"
echo "======================================"
echo

BACKUP_DIR="$DEFAULT_BACKUP_DIR"

# If default directory missing or empty, prompt user
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.backup 2>/dev/null)" ]; then
  echo "⚠️ No database backups found in default location:"
  echo "   $BACKUP_DIR"
  echo
  read -p "👉 Enter alternate backup directory path: " BACKUP_DIR
fi

# Validate backup directory
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo
echo "📂 Available database backups in:"
echo "   $BACKUP_DIR"
echo

ls -1 "$BACKUP_DIR"/*.backup 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ No .backup files found in $BACKUP_DIR"
  exit 1
fi

echo
read -p "👉 Enter the EXACT filename to restore (without path): " FILE

BACKUP_FILE="$BACKUP_DIR/$FILE"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ File not found: $BACKUP_FILE"
  exit 1
fi

echo
echo "🧠 Safety step — backing up current database before overwrite."

SAFETY_BACKUP="$PROJECT_ROOT/backups/pre-restore-db_$(date +"%d-%b_%H_%M").backup"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$SAFETY_BACKUP"

echo "   ✔ Current DB saved to:"
echo "   → $SAFETY_BACKUP"

echo
echo "⚠️ WARNING: This will OVERWRITE the existing database '$DB_NAME'."
read -p "Type YES to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo "❌ Restore cancelled."
  exit 1
fi

echo
echo "🔄 Dropping and recreating database..."

docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" "$DB_NAME" 2>/dev/null
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DB_NAME"

echo "✔ Database recreated."

echo
echo "📥 Restoring backup from:"
echo "   → $BACKUP_FILE"

docker cp "$BACKUP_FILE" "$DB_CONTAINER":/tmp/restore_target.backup
docker exec "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges /tmp/restore_target.backup
docker exec "$DB_CONTAINER" rm /tmp/restore_target.backup

if [ $? -eq 0 ]; then
  echo
  echo "🎉 SUCCESS! Database restored from:"
  echo "   → $BACKUP_FILE"
else
  echo
  echo "❌ ERROR: Something went wrong during restore."
  echo "   Your pre-restore backup is safe at:"
  echo "   → $SAFETY_BACKUP"
  exit 1
fi

echo
echo "======================================"
echo "🚀 DATABASE RESTORE COMPLETE"
echo "======================================"
