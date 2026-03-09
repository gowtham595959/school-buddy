#!/bin/bash
set -e

echo "======================================"
echo "Restoring SchoolBuddy database backup"
echo "======================================"

pg_restore \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  /docker-backup/restore.backup

echo "======================================"
echo "Database restore complete"
echo "======================================"
