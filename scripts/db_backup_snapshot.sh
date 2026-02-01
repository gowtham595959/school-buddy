#!/bin/bash

# ==============================
# DATABASE SNAPSHOT BACKUP ONLY
# ==============================

DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"
DB_USER="postgres"

# Unified backup directory
BACKUP_DIR="/workspaces/school-buddy/backups/db_backup_snapshot"

# Timestamp format: 16-Dec_15_59
TIMESTAMP=$(date +"%d-%b_%H_%M")

DB_DUMP_FILE="$BACKUP_DIR/db_full_${DB_NAME}_${TIMESTAMP}.backup"

mkdir -p "$BACKUP_DIR"

echo "==============================="
echo "🗃️ SCHOOL BUDDY - DB SNAPSHOT"
echo "==============================="
echo
echo "Database   : $DB_NAME"
echo "Container  : $DB_CONTAINER"
echo "Timestamp  : $TIMESTAMP"
echo

# Create database dump using pg_dump inside the PostGIS container
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DB_DUMP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Database snapshot created successfully:"
  echo "   → $DB_DUMP_FILE"
else
  echo "❌ ERROR: Database snapshot failed."
  echo "   No backup was created."
fi

echo
echo "Done."
