#!/bin/bash

DATE=$(date +"%Y%m%d-%H%M")
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/schoolbuddy-$DATE.zip"
DB_DUMP_FILE="$BACKUP_DIR/db-$DATE.backup"
DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"

mkdir -p $BACKUP_DIR

echo "==============================="
echo "📦 SCHOOL BUDDY - FULL BACKUP"
echo "==============================="

echo ""
echo "🗃️ Backing up database: $DB_NAME"

# Create database dump using pg_dump inside the PostGIS container
docker exec $DB_CONTAINER pg_dump -U postgres -d $DB_NAME -Fc > "$DB_DUMP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Database backup saved:"
  echo "   → $DB_DUMP_FILE"
else
  echo "❌ ERROR: Failed to back up database."
  echo "   Skipping DB backup…"
fi

echo ""
echo "📦 Creating full project ZIP backup..."

zip -r $BACKUP_FILE . \
  -x "client/node_modules/*" \
  -x "server/node_modules/*" \
  -x "backups/*" \
  -x ".git/*"

echo "   → Adding DB backup to ZIP..."
zip -j $BACKUP_FILE "$DB_DUMP_FILE" > /dev/null

echo ""
echo "✅ Backup created successfully:"
echo "   → $BACKUP_FILE"

echo ""
echo "Done!"
