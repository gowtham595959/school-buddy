#!/bin/bash

DATE=$(date +"%Y%m%d-%H%M")
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/schoolbuddy-$DATE.zip"

mkdir -p $BACKUP_DIR

echo "==============================="
echo "📦 SCHOOL BUDDY - FULL BACKUP"
echo "==============================="

zip -r $BACKUP_FILE . \
  -x "client/node_modules/*" \
  -x "server/node_modules/*" \
  -x "backups/*" \
  -x ".git/*"

echo "✅ Backup created:"
echo "   → $BACKUP_FILE"

echo "Done!"
