#!/usr/bin/env bash
# scripts/old/codespace-stop-hourly.sh — GitHub Codespaces only.
#
# Runs in background. Every minute, checks if it's :00 (top of hour).
# At :55, shows a 5-minute warning. At :00, runs codespace-stop.sh.
# No cron needed.
#
# Started automatically by startup.sh (when CODESPACE_NAME is set).
# To disable, or kill this process.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOP_SCRIPT="$SCRIPT_DIR/codespace-stop.sh"
LOG="$SCRIPT_DIR/codespace-stop-hourly.log"
SKIP_FLAG="$SCRIPT_DIR/codespace-stop-skip.flag"

log() { echo "[$(date -Iseconds)] $*" >> "$LOG"; }

# Show warning in all open terminals (and try wall if available)
show_warning() {
  local skip_path="$SCRIPT_DIR/codespace-stop-skip.sh"
  local msg="
================================================================================
  WARNING: Codespace will STOP in 5 minutes! Save your work!
  To skip THIS hour only, run:
  $skip_path
  To cancel completely, run:
  pkill -f codespace-stop-hourly
================================================================================
"
  log "WARNING: $msg"
  echo "$msg" >> "$LOG"
  # Broadcast to all terminal sessions (bell + red text)
  for tty in /dev/pts/[0-9]*; do
    [ -e "$tty" ] 2>/dev/null || continue
    printf '\a' > "$tty" 2>/dev/null || true
    echo -e "\n\033[1;31m$msg\033[0m\n" > "$tty" 2>/dev/null || true
  done
  # Try wall (broadcasts to all users' terminals)
  echo "WARNING: Codespace will STOP in 5 minutes! Save your work! To skip: $skip_path" | wall 2>/dev/null || true
}

log "Started. Will run codespace-stop.sh at each :00 (warning at :55)"

while true; do
  sleep 60
  minute=$(date +%M)
  if [ "$minute" = "55" ]; then
    log "5-minute warning at $(date)"
    show_warning
  elif [ "$minute" = "00" ]; then
    if [ -f "$SKIP_FLAG" ]; then
      log "Skipped stop at $(date) - user requested skip this hour"
      rm -f "$SKIP_FLAG"
      # Continues to next hour
    else
      log "Triggering stop at $(date)"
      "$STOP_SCRIPT" >> "$LOG" 2>&1
      exit 0
    fi
  fi
done
