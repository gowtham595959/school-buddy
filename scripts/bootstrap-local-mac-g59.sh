#!/usr/bin/env bash
# scripts/bootstrap-local-mac-g59.sh
#
# One-time bootstrap: clone/setup School Buddy in your Projects folder.
# Run from anywhere on your Mac. Uses your paths:
#   Projects: /Users/g59/Desktop/G59_D/Business/Projects
#   Repo:     https://github.com/gowtham595959/school-buddy.git
#   Branch:   feature/catchments-v2
#
# Prerequisites: Node.js 18+, Docker Desktop (running), Git
#

set -e

PROJECTS_DIR="/Users/g59/Desktop/G59_D/Business/Projects"
REPO_DIR="$PROJECTS_DIR/school-buddy"
REPO_URL="https://github.com/gowtham595959/school-buddy.git"
BRANCH="feature/catchments-v2"

log_section() {
  echo ""
  echo "-------------------------------------"
  echo "🔷 $1"
  echo "-------------------------------------"
}

log_ok() { echo "✅ $1"; }
log_warn() { echo "⚠️  $1"; }
log_err() { echo "❌ $1"; }

log_section "School Buddy — Local Mac Bootstrap (G59)"
echo "Projects folder: $PROJECTS_DIR"
echo "Target:          $REPO_DIR"
echo ""

# 1. Check Projects folder exists
log_section "1. Checking Projects folder"
if [ ! -d "$PROJECTS_DIR" ]; then
  log_err "Projects folder not found: $PROJECTS_DIR"
  echo "Create it with: mkdir -p \"$PROJECTS_DIR\""
  exit 1
fi
log_ok "Projects folder exists"

# 2. Clone or update repo
log_section "2. Cloning / updating repo"

if [ -d "$REPO_DIR/.git" ]; then
  log_ok "Repo already exists at $REPO_DIR"
  cd "$REPO_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  log_ok "Checked out and pulled $BRANCH"
else
  log_warn "Cloning repo into $REPO_DIR..."
  cd "$PROJECTS_DIR"
  git clone "$REPO_URL" school-buddy
  cd "$REPO_DIR"
  git checkout "$BRANCH"
  log_ok "Cloned and checked out $BRANCH"
fi

# 3. Run setup
log_section "3. Running setup-local-mac.sh"
chmod +x scripts/setup-local-mac.sh
./scripts/setup-local-mac.sh

# 4. Copy backup from Business folder if exists (optional)
EXISTING_BACKUP="/Users/g59/Desktop/G59_D/Business/school-buddy/backups/db_backup_snapshot"
if [ -d "$EXISTING_BACKUP" ] && [ -n "$(ls -A "$EXISTING_BACKUP"/*.backup 2>/dev/null)" ]; then
  log_section "4. Found existing backup"
  mkdir -p "$REPO_DIR/backups/db_backup_snapshot"
  cp -n "$EXISTING_BACKUP"/*.backup "$REPO_DIR/backups/db_backup_snapshot/" 2>/dev/null || true
  log_ok "Copied backups to $REPO_DIR/backups/db_backup_snapshot/"
else
  log_section "4. Backup (optional)"
  log_warn "No backup found at $EXISTING_BACKUP"
  echo "   For full catchment data, copy a .backup file to:"
  echo "   $REPO_DIR/backups/db_backup_snapshot/"
  echo "   Then run: ./scripts/db_restore_from_backup_snapshot.sh"
fi

# 5. Done
log_section "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Open Cursor"
echo "  2. File → Open Folder → $REPO_DIR"
echo "  3. In terminal: ./scripts/startup.sh"
echo "  4. Open http://localhost:3000"
echo ""
echo "To restore full DB (if you have a backup):"
echo "  ./scripts/db_restore_from_backup_snapshot.sh"
echo ""
echo "📂 Project path for Cursor:"
echo "   $REPO_DIR"
echo ""
