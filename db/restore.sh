#!/bin/sh
set -e

BACKUP="/docker-backup/restore.backup"
if [ ! -f "$BACKUP" ]; then
  echo "======================================"
  echo "No backup at $BACKUP - skipping restore"
  echo "Schema from init.sql + migrations"
  echo "======================================"
  exit 0
fi

echo "======================================"
echo "Restoring SchoolBuddy database backup"
echo "======================================"

pg_restore \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  "$BACKUP"

echo "======================================"
echo "Database restore complete"
echo "======================================"
