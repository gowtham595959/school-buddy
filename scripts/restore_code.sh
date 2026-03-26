#!/usr/bin/env bash

# ==========================================
# RESTORE SCRIPT FOR SCHOOL-BUDDY (CODE ONLY)
# ==========================================
# Repo root from script location (local Mac, Linux, Codespaces).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TARGET_DIR="$ROOT_DIR"
TEMP_DIR="$ROOT_DIR/restore_temp"

# Safety backup of current code (ZIP)
SAFETY_TIMESTAMP=$(date +"%d-%b_%H_%M")
SAFETY_BACKUP="$BACKUP_DIR/pre-code-restore_${SAFETY_TIMESTAMP}.zip"

echo "=========================================="
echo "🔄 SCHOOL BUDDY - CODE RESTORE"
echo "=========================================="
echo

# ------------------------------------------
# 1. Ensure backups folder exists
# ------------------------------------------
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Backup folder not found at $BACKUP_DIR"
  exit 1
fi

# ------------------------------------------
# 2. List available ZIP backups
# ------------------------------------------
echo "📦 Available ZIP backups:"
ls -1 "$BACKUP_DIR"/schoolbuddy_backup_*.zip 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ No ZIP backups found in $BACKUP_DIR"
  exit 1
fi

echo
read -p "👉 Enter the EXACT ZIP filename to restore: " BACKUP_FILE

FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"

# ------------------------------------------
# 3. Validate backup exists
# ------------------------------------------
if [ ! -f "$FULL_PATH" ]; then
  echo "❌ Backup file not found: $FULL_PATH"
  exit 1
fi

echo
echo "📁 Backup selected:"
echo "   → $FULL_PATH"
echo

# ------------------------------------------
# 4. Safety snapshot of current code
# ------------------------------------------
echo "🧠 Safety step — backing up current code before restore..."

cd "$TARGET_DIR" || exit 1

zip -r "$SAFETY_BACKUP" . \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*.log" \
  -x "*.zip" \
  -x ".env" \
  -x ".DS_Store"

echo "   ✔ Current code saved to:"
echo "   → $SAFETY_BACKUP"
echo

# ------------------------------------------
# 5. Prepare temporary restore directory
# ------------------------------------------
echo "🧹 Preparing temporary restore directory..."

rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📦 Extracting backup into temp folder..."
unzip -q "$FULL_PATH" -d "$TEMP_DIR"

# ------------------------------------------
# 6. Restore files safely (controlled overwrite)
# ------------------------------------------
echo
echo "⚠️ WARNING: This will OVERWRITE existing code in:"
echo "   $TARGET_DIR"
read -p "Type YES to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo "❌ Restore cancelled."
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo
echo "♻️ Restoring code files..."

rsync -av --delete \
  --exclude "node_modules/" \
  --exclude ".git/" \
  --exclude "backups/" \
  "$TEMP_DIR"/ "$TARGET_DIR"/

# ------------------------------------------
# 7. Cleanup
# ------------------------------------------
rm -rf "$TEMP_DIR"

echo
echo "🎉 CODE RESTORE COMPLETE"
echo
echo "📌 Notes:"
echo " - Database NOT restored (run DB restore separately)"
echo " - Previous code snapshot saved at:"
echo "   → $SAFETY_BACKUP"
echo
echo "=========================================="
