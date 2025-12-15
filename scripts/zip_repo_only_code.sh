#!/usr/bin/env bash
# --------------------------------------------------------
# Create a timestamped backup ZIP of the entire repository,
# excluding heavy or irrelevant folders.
# Output is always stored in:
#   /workspaces/school-buddy/backups/
# --------------------------------------------------------

ROOT_DIR="/workspaces/school-buddy"
BACKUP_DIR="$ROOT_DIR/backups"

# Timestamp format: 2025-02-14_23-15-42
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="schoolbuddy_backup_${TIMESTAMP}.zip"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "📦 Starting SchoolBuddy backup..."
echo "🗂  Backup directory: $BACKUP_DIR"
echo "🕒 Timestamp: $TIMESTAMP"

# Ensure backup folder exists
mkdir -p "$BACKUP_DIR"

# Create zip
echo "📁 Creating ZIP file: $BACKUP_PATH"
echo

cd "$ROOT_DIR"

zip -r "$BACKUP_PATH" \
  . \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*.log" \
  -x "*.zip" \
  -x "__pycache__/*" \
  -x "*.pyc" \
  -x ".env" \
  -x ".DS_Store" \
  -x "server/backend.log" \
  -x "client/.cache/*"

echo
echo "✅ Backup complete!"
echo "➡️  File saved at: ${BACKUP_PATH}"
echo "🎉 You may now upload the ZIP."
