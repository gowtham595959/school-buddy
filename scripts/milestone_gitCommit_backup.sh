#!/bin/bash

# ================================
# 📦 SCHOOL-BUDDY MILESTONE BACKUP
# ================================

# Usage:
#   ./backup.sh "MS_1_Tiffin_Wallington_Nonsuch_Catchment" "Milestone description here"
#
# Creates:
#   - A git commit (if needed)
#   - A git tag using provided name
#   - A .zip backup excluding node_modules, logs, env
#   - A history log entry in backups/backup_history.txt
#
# ================================

MILESTONE_NAME="$1"
DESCRIPTION="$2"

if [ -z "$MILESTONE_NAME" ]; then
  echo "❌ ERROR: You must provide a milestone name"
  echo "Usage: ./backup.sh \"MS_1_Name\" \"Description\""
  exit 1
fi

# Create backup folder if not exists
mkdir -p backups

# Commit current changes
echo "🔍 Checking for uncommitted changes..."

if [[ -n $(git status --porcelain) ]]; then
  echo "📝 Committing changes..."
  git add .
  git commit -m "📦 Milestone: $MILESTONE_NAME — $DESCRIPTION"
else
  echo "👌 No changes to commit."
fi

# Tag the milestone
echo "🏷️ Tagging milestone: $MILESTONE_NAME"
git tag "$MILESTONE_NAME"

# Create ZIP backup
ZIP_FILE="backups/${MILESTONE_NAME}.zip"

echo "📦 Creating clean backup ZIP at $ZIP_FILE..."

zip -r "$ZIP_FILE" . \
  -x "node_modules/*" \
  -x "server/node_modules/*" \
  -x "client/node_modules/*" \
  -x "gis/node_modules/*" \
  -x "*.log" \
  -x "*.env" \
  -x "*.zip" \
  -x "backups/*" \
  -x ".git/*"

# Save backup history
echo "🗃️ Recording backup entry..."
echo "$(date) — $MILESTONE_NAME — $DESCRIPTION" >> backups/backup_history.txt

echo "🎉 Backup complete!"
echo "📁 Stored at: $ZIP_FILE"
echo "🏷️ Git tag created: $MILESTONE_NAME"
echo "ℹ️ To restore: git checkout $MILESTONE_NAME"
