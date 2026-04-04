#!/usr/bin/env bash
# --------------------------------------------------------
# School Buddy — Code, DB, Merge GIT, Deploy Azure
#
# GIT (GitHub):
#   status              Show repo status (untracked, staged, committed)
#   stage               Stage all (skips large files)
#   commit "message"    Stage + commit
#   push                Push current branch
#   full "message"      Stage + commit + push
#   merge-main          Merge feature branch → main and push
#   all "message"       Full: stage, commit, push, merge-main
#
# DB (Azure sync — uses local Docker schoolbuddy-postgis, same on Mac or Codespace):
#   db-migrations         Run migrations on local Docker DB (each file once)
#   db-migrate-baseline   Mark all migrations applied (one-time; see db_sync_azure.sh)
#   db-full               Local DB snapshot → pg_dump → upload restore.backup → restart Azure (no migrations)
#   db-full-sql-files     Run all local migrations first, then same as db-full
#
# Usage: ./scripts/Code_DB_MergeGIT_DeployAzure.sh [command] [args]
# --------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Auto-load Azure config for DB commands
if [ -f "$SCRIPT_DIR/azure.env" ]; then
  set -a
  source "$SCRIPT_DIR/azure.env"
  set +a
fi

FEATURE_BRANCH="${GIT_FEATURE_BRANCH:-feature/catchments-v2}"
MAIN_BRANCH="main"
MAX_FILE_SIZE_MB=50

log_section() {
  echo ""
  echo "-------------------------------------"
  echo "🔷 $1"
  echo "-------------------------------------"
}

log_ok() { echo "✅ $1"; }
log_warn() { echo "⚠️  $1"; }
log_err() { echo "❌ $1"; }

show_script_options() {
  echo ""
  echo "====================================="
  echo "📋 Options"
  echo "====================================="
  echo ""
  echo "  GIT (GitHub):"
  echo "    $0 status              Show repo status"
  echo "    $0 stage               Stage all (skips large files)"
  echo "    $0 commit \"message\"    Stage + commit"
  echo "    $0 push                Push current branch"
  echo "    $0 full \"message\"      Stage + commit + push"
  echo "    $0 merge-main          Merge $FEATURE_BRANCH → $MAIN_BRANCH"
  echo "    $0 all \"message\"       Full: stage, commit, push, merge-main"
  echo ""
  echo "  DB (Azure sync):"
  echo "    $0 db-migrations          Run migrations on local DB"
  echo "    $0 db-migrate-baseline    Mark all .sql applied (one-time if DB already migrated)"
  echo "    $0 db-full                Full sync: backup → upload → restart Azure (no migrations)"
  echo "    $0 db-full-sql-files      Migrations on local → backup → upload → restart Azure"
  echo ""
}

# ─── GIT ────────────────────────────────────────────────────────────────────

do_status() {
  local branch
  branch=$(git branch --show-current)
  local ahead behind
  ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
  behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")

  echo ""
  echo "====================================="
  echo "📊 GIT STATUS"
  echo "====================================="

  log_section "Branch"
  echo "  Current: $branch"
  if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
    [ "$ahead" -gt 0 ] && echo "  Ahead of origin: $ahead commit(s)"
    [ "$behind" -gt 0 ] && echo "  Behind origin: $behind commit(s)"
  else
    echo "  In sync with origin"
  fi

  log_section "Staged (to be committed)"
  if git diff --cached --quiet 2>/dev/null; then
    echo "  (none)"
  else
    git diff --cached --name-status | sed 's/^/  /'
  fi

  log_section "Unstaged (modified, tracked)"
  if git diff --name-only | grep -q .; then
    git diff --name-status | sed 's/^/  /'
  else
    echo "  (none)"
  fi

  log_section "Untracked"
  untracked=$(git ls-files --others --exclude-standard)
  if [ -z "$untracked" ]; then
    echo "  (none)"
  else
    echo "$untracked" | sed 's/^/  /'
  fi

  log_section "Large untracked (≥${MAX_FILE_SIZE_MB} MB, will be skipped on stage)"
  large=""
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    size_mb=$(du -m "$f" 2>/dev/null | cut -f1)
    if [ -n "$size_mb" ] && [ "$size_mb" -ge "$MAX_FILE_SIZE_MB" ]; then
      large="${large}  $f  ($size_mb MB)"$'\n'
    fi
  done < <(git ls-files --others --exclude-standard)
  if [ -z "$large" ]; then
    echo "  (none)"
  else
    echo "$large"
  fi

  log_section "Recent commits (last 5)"
  git log --oneline -5 | sed 's/^/  /'

  show_script_options
}

show_skipped_files() {
  [ -n "$1" ] || return 0
  echo ""
  echo "-------------------------------------"
  echo "⏭️  Skipped (large files, not staged)"
  echo "-------------------------------------"
  echo "$1" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    path="${line% *}"
    size="${line##* }"
    printf "  %-60s %6s MB\n" "$path" "$size"
  done
  echo ""
  log_warn "Add these to .gitignore to avoid future prompts."
}

do_stage() {
  log_section "Staging changes"
  large_files=""
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    size_mb=$(du -m "$f" 2>/dev/null | cut -f1)
    if [ -n "$size_mb" ] && [ "$size_mb" -ge "$MAX_FILE_SIZE_MB" ]; then
      large_files="${large_files}${f} ${size_mb}"$'\n'
    fi
  done < <(git ls-files --others --exclude-standard)

  git add -A
  if [ -n "$large_files" ]; then
    echo "$large_files" | while IFS= read -r line; do
      [ -z "$line" ] && continue
      path="${line% *}"
      git reset HEAD -- "$path" 2>/dev/null || true
    done
  fi

  log_ok "Staged all changes (large files excluded)"
  git status --short
  show_skipped_files "$large_files"
}

do_commit() {
  local msg="${1:-Update}"
  log_section "Committing"
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$msg"
    log_ok "Committed: $msg"
  else
    log_warn "Nothing to commit (working tree clean or already committed)"
  fi
}

do_push() {
  local branch
  branch=$(git branch --show-current)
  log_section "Pushing $branch"
  if git fetch origin "$branch" 2>/dev/null; then
    behind=$(git rev-list --count HEAD..origin/"$branch" 2>/dev/null || echo "0")
    if [ "$behind" -gt 0 ]; then
      log_warn "Remote has $behind new commit(s). Pulling first..."
      git pull origin "$branch" --no-rebase
    fi
  fi
  git push origin "$branch"
  log_ok "Pushed to origin/$branch"
}

do_merge_main() {
  log_section "Merge $FEATURE_BRANCH → $MAIN_BRANCH"
  local current
  current=$(git branch --show-current)
  if [ "$current" != "$FEATURE_BRANCH" ]; then
    log_warn "Current branch is '$current'. Checking out $FEATURE_BRANCH..."
    git checkout "$FEATURE_BRANCH"
  fi
  git fetch origin "$MAIN_BRANCH" 2>/dev/null || true
  git checkout "$MAIN_BRANCH"
  git pull origin "$MAIN_BRANCH" 2>/dev/null || true
  git merge "$FEATURE_BRANCH" -m "Merge $FEATURE_BRANCH into $MAIN_BRANCH"
  git push origin "$MAIN_BRANCH"
  log_ok "Merged and pushed to main"
  git checkout "$FEATURE_BRANCH"
}

# ─── DB ─────────────────────────────────────────────────────────────────────

do_db_migrations() {
  log_section "DB: Running migrations on local"
  "$SCRIPT_DIR/db_sync_azure.sh" migrate
}

do_db_migrate_baseline() {
  log_section "DB: Baseline migration ledger (mark all .sql as applied)"
  "$SCRIPT_DIR/db_sync_azure.sh" migrate-baseline
}

do_db_full() {
  log_section "DB: Full sync local Docker → Azure"

  if [ -z "$AZURE_STORAGE_ACCOUNT" ]; then
    log_err "AZURE_STORAGE_ACCOUNT not set. Source scripts/azure.env"
    exit 1
  fi

  if [ -z "$AZURE_STORAGE_KEY" ] && command -v az &>/dev/null; then
    log_warn "Fetching storage key via az..."
    AZURE_STORAGE_KEY=$(az storage account keys list \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --resource-group "${AZURE_WEBAPP_RG:-Schoolbuddy-dev-01}" \
      --query "[0].value" -o tsv 2>/dev/null)
    export AZURE_STORAGE_KEY
  fi

  if [ -z "$AZURE_STORAGE_KEY" ]; then
    log_err "Set AZURE_STORAGE_KEY in scripts/azure.env"
    exit 1
  fi

  "$SCRIPT_DIR/db_sync_azure.sh" backup
  "$SCRIPT_DIR/db_sync_azure.sh" upload
  log_ok "Full sync complete. Wait 2–3 min after Web App restart."
  log_warn "Azure only auto-restores when schoolmap does not exist yet. If data did not change:"
  log_warn "  1) Deploy image with latest docker/start.sh"
  log_warn "  2) Web App Configuration: RUN_DB_MIGRATIONS=0 skips SQL migrations on boot (see deploy.parameters.json)"
  log_warn "  3) Azure Portal → RESTORE_SCHOOLMAP_FROM_BACKUP = 1 → restart → remove (one-shot new backup)"
}

do_db_full_sql_files() {
  do_db_migrations
  do_db_full
}

# ─── Main ───────────────────────────────────────────────────────────────────

case "${1:-}" in
  # Git
  status)
    do_status
    ;;
  stage)
    do_stage
    ;;
  commit)
    do_stage
    do_commit "${2:-Update}"
    ;;
  push)
    do_push
    ;;
  full)
    do_stage
    do_commit "${2:-Update}"
    do_push
    ;;
  merge-main)
    do_merge_main
    ;;
  all)
    do_stage
    do_commit "${2:-Update}"
    do_push
    do_merge_main
    ;;
  # DB
  db-migrations)
    do_db_migrations
    ;;
  db-migrate-baseline)
    do_db_migrate_baseline
    ;;
  db-full)
    do_db_full
    ;;
  db-full-sql-files)
    do_db_full_sql_files
    ;;
  *)
    do_status
    ;;
esac

if [ "${1:-}" != "status" ] && [ -n "${1:-}" ]; then
  echo ""
  echo "====================================="
  echo "🎉 Done"
  echo "====================================="
  show_script_options
fi
