#!/usr/bin/env bash
# scripts/codespace-stop-skip.sh
#
# Skips the NEXT scheduled stop (this hour only).
# The hourly script will warn again at :55 next hour and stop at :00 next hour.
# Use this when you need a bit more time but don't want to kill the script entirely.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
touch "$SCRIPT_DIR/codespace-stop-skip.flag"
echo "✅ Skipped this hour's stop. You'll get another warning at :55 next hour."
