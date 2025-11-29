#!/usr/bin/env bash

# ==========================================
# RESTORE SCRIPT FOR SCHOOL-BUDDY PROJECT
# ==========================================

BACKUP_DIR="/workspaces/school-buddy/backups"
TARGET_DIR="/workspaces/school-buddy"
TEMP_DIR="/workspaces/school-buddy/restore_temp"

echo "🔄 Starting restore..."

# ------------------------------------------
# 1. Ensure backups folder exists
# ------------------------------------------
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Backup folder not found at $BACKUP_DIR"
  exit 1
fi

# ------------------------------------------
# 2. List available backups
# ------------------------------------------
echo "📦 Available backup files:"
ls -1 "$BACKUP_DIR"/*.zip 2>/dev/null

echo ""
read -p "👉 Enter the exact backup filename to restore: " BACKUP_FILE

FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"

# ------------------------------------------
# 3. Validate backup exists
# ------------------------------------------
if [ ! -f "$FULL_PATH" ]; then
    echo "❌ Backup file not found: $FULL_PATH"
    exit 1
fi

echo "📁 Backup selected: $FULL_PATH"

# ------------------------------------------
# 4. Prepare temporary restore directory
# ------------------------------------------
echo "🧹 Cleaning temp directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📦 Extracting backup into temp folder..."
unzip -q "$FULL_PATH" -d "$TEMP_DIR"

# ------------------------------------------
# 5. Restore files safely
# ------------------------------------------
echo "♻️ Restoring files into project folder..."

cp -r "$TEMP_DIR"/* "$TARGET_DIR"

echo "🎉 Restore complete!"

echo "⚠️ IMPORTANT: This only restores CODE."
echo "⚠️ For database restore, run pg_restore or psql separately."
