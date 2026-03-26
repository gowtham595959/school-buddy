#!/usr/bin/env bash
# --------------------------------------------------------
# Create a timestamped backup ZIP of the entire repository,
# excluding heavy or irrelevant folders.
# Then run DB and code-format backups.
#
# All outputs stored in: <repo>/backups/
# Works on local Mac, Linux, and GitHub Codespaces (same repo path resolution).
# --------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"

# Unified timestamp format: 16-Dec_15_44
TIMESTAMP=$(date +"%d-%b_%H_%M")

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

cd "$ROOT_DIR" || exit 1

zip -r "$BACKUP_PATH" \
  . \
  -x "*/node_modules/*" \
  -x "node_modules/*" \
  -x "gis_backup/*" \
  -x "backups/*" \
  -x "*/.git/*" \
  -x ".git/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*.log" \
  -x "*.zip" \
  -x "__pycache__/*" \
  -x "*.pyc" \
  -x ".env" \
  -x ".DS_Store" \
  -x "server/backend.log" \
  -x "*.geojson" \
  -x "client/.cache/*"

echo
echo "✅ ZIP backup complete!"
echo "➡️  File saved at: ${BACKUP_PATH}"
echo

# --------------------------------------------------------
# Run additional backups (ABSOLUTE PATHS — important)
# --------------------------------------------------------

echo "📊 Running database table inspection backup..."
"$ROOT_DIR/scripts/db_tables_info_full.sh"
echo "✅ Database backup complete."
echo

echo "📄 Running code file format backup..."
"$ROOT_DIR/scripts/file_format_backup.sh"
echo "✅ Code file backup complete."
echo

echo "🎉 All backups completed successfully."
