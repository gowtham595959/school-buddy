#!/usr/bin/env bash
# --------------------------------------------------------
# GIT DEPLOY WORKFLOW
# Stage → Commit → Push → (optional) Merge to main
#
# Usage:
#   ./scripts/git_deploy.sh stage              # Stage all (respects .gitignore)
#   ./scripts/git_deploy.sh commit "message"    # Stage + commit
#   ./scripts/git_deploy.sh push                # Push current branch
#   ./scripts/git_deploy.sh full "message"      # Stage + commit + push
#   ./scripts/git_deploy.sh merge-main          # Merge feature branch into main + push
#   ./scripts/git_deploy.sh all "message"       # Full: stage, commit, push, merge-main
# --------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Default feature branch (override with GIT_FEATURE_BRANCH env)
FEATURE_BRANCH="${GIT_FEATURE_BRANCH:-feature/catchments-v2}"
MAIN_BRANCH="main"

# Max file size to warn about (50 MB)
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

# Show all script options (used at end of status and as help)
show_script_options() {
  echo ""
  echo "====================================="
  echo "📋 What you can do with this script"
  echo "====================================="
  echo ""
  echo "  $0 status              Show full repo status (untracked, staged, committed)"
  echo "  $0 stage               Stage all (skips large files)"
  echo "  $0 commit \"message\"    Stage + commit"
  echo "  $0 push                Push current branch"
  echo "  $0 full \"message\"      Stage + commit + push"
  echo "  $0 merge-main          Merge $FEATURE_BRANCH → $MAIN_BRANCH and push"
  echo "  $0 all \"message\"       Full: stage, commit, push, merge-main"
  echo ""
}

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

# Find large untracked files (would be added by git add -A)
# Output: newline-separated "FILE_PATH SIZE_MB"
get_large_untracked_files() {
  git ls-files --others --exclude-standard | while IFS= read -r f; do
    [ -f "$f" ] || continue
    size_mb=$(du -m "$f" 2>/dev/null | cut -f1)
    if [ -n "$size_mb" ] && [ "$size_mb" -ge "$MAX_FILE_SIZE_MB" ]; then
      echo "$f $size_mb"
    fi
  done
}

# Display skipped large files (name and size separately)
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
  echo "  To push later: $0 push"
}

do_stage() {
  log_section "Staging changes"

  # Collect large files before staging
  large_files=""
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    size_mb=$(du -m "$f" 2>/dev/null | cut -f1)
    if [ -n "$size_mb" ] && [ "$size_mb" -ge "$MAX_FILE_SIZE_MB" ]; then
      large_files="${large_files}${f} ${size_mb}"$'\n'
    fi
  done < <(git ls-files --others --exclude-standard)

  git add -A

  # Unstage large files so they are not committed
  if [ -n "$large_files" ]; then
    echo "$large_files" | while IFS= read -r line; do
      [ -z "$line" ] && continue
      path="${line% *}"
      git reset HEAD -- "$path" 2>/dev/null || true
    done
  fi

  log_ok "Staged all changes (large files excluded)"
  git status --short

  # Display skipped files separately
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

  # Pull first if remote has new commits (avoids "rejected - fetch first").
  # Use merge (not rebase) to avoid conflicts with protected files like .vscode.
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

# --- Main ---
case "${1:-}" in
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
  *)
    # No args or unknown: show status (includes script options at end)
    do_status
    ;;
esac

# Show options at end for non-status commands
if [ "${1:-}" != "status" ] && [ -n "${1:-}" ]; then
  echo ""
  echo "====================================="
  echo "🎉 Done"
  echo "====================================="
  show_script_options
fi
