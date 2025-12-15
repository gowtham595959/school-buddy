#!/bin/bash

DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"
BACKUP_DIR="/workspaces/school-buddy/backups"

echo "======================================"
echo "🔄 SCHOOL BUDDY - DATABASE RESTORE"
echo "======================================"

# Ensure backups directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo ""
echo "📂 Available backups:"
ls -1 $BACKUP_DIR/*.backup 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ No .backup files found in $BACKUP_DIR"
  exit 1
fi

echo ""
read -p "👉 Enter the EXACT filename to restore (without path): " FILE

BACKUP_FILE="$BACKUP_DIR/$FILE"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ File not found: $BACKUP_FILE"
  exit 1
fi

echo ""
echo "🧠 Optional safety step — backing up current database before overwrite."
SAFETY_BACKUP="$BACKUP_DIR/pre-restore-$(date +"%Y%m%d-%H%M").backup"

docker exec $DB_CONTAINER pg_dump -U postgres -d $DB_NAME -Fc > "$SAFETY_BACKUP"

echo "   ✔ Current DB saved to: $SAFETY_BACKUP"

echo ""
echo "⚠️ WARNING: This will OVERWRITE the existing database '$DB_NAME'."
read -p "Type YES to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo "❌ Restore cancelled."
  exit 1
fi

echo ""
echo "🔄 Dropping and recreating database..."

docker exec $DB_CONTAINER dropdb -U postgres $DB_NAME 2>/dev/null
docker exec $DB_CONTAINER createdb -U postgres $DB_NAME

echo "✔ Database recreated."

echo ""
echo "📥 Restoring backup from: $BACKUP_FILE"

docker exec -i $DB_CONTAINER pg_restore -U postgres -d $DB_NAME < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 SUCCESS! Database restored from:"
  echo "   → $BACKUP_FILE"
else
  echo ""
  echo "❌ ERROR: Something went wrong during restore."
  echo "   Your pre-restore backup is safe at:"
  echo "   → $SAFETY_BACKUP"
  exit 1
fi

echo ""
echo "======================================"
echo "🚀 DATABASE RESTORE COMPLETE"
echo "======================================"
