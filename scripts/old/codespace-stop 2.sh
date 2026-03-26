#!/usr/bin/env bash
# scripts/old/codespace-stop.sh — GitHub Codespaces only (optional for local Mac).
#
# Stops all services started by startup.sh (backend, frontend)
# and then stops the GitHub Codespace to avoid compute charges.
#
# Services stopped (from startup.sh / codeRestart.sh):
#   - Frontend (React) on port 3000
#   - Backend (Node) on port 5050 (default; avoid macOS AirPlay on 5000)
#   - PostGIS Docker container (optional, kept running by default for faster restart)
#
# WHEN YOU COME BACK:
#   1. Open Cursor (or VS Code) → Remote-SSH → Connect to your Codespace
#      (This will START the Codespace if it's stopped)
#   2. Run: ./scripts/startup.sh from repo root
#   3. You're ready to code!
#
# Or from terminal (if gh CLI is installed locally):
#   gh codespace start -c YOUR_CODESPACE_NAME
#   Then connect via Cursor/VS Code and run ./scripts/startup.sh

set -e

echo "========================================"
echo " 🛑 SCHOOL BUDDY — STOP CODESPACE"
echo "========================================"
echo

# ---------- Helper formatting ----------
section() {
  echo ""
  echo "----------------------------------------"
  echo "🔷 $1"
  echo "----------------------------------------"
}

ok() { echo "✅ $1"; }
warn() { echo "⚠️  $1"; }
err() { echo "❌ $1"; }

# ---------- Kill by port ----------
kill_port() {
  local port="$1"
  local pid
  pid=$(lsof -t -i:"$port" 2>/dev/null || true)

  if [[ -n "$pid" ]]; then
    warn "Port $port in use by PID $pid — stopping..."
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    sleep 1
    ok "Port $port stopped."
  else
    ok "Port $port already clear."
  fi
}

# ---------- Stop frontend (port 3000) ----------
section "Stopping FRONTEND (port 3000)"
kill_port 3000

# ---------- Stop backend (5050 + legacy 5000) ----------
section "Stopping BACKEND (ports 5050 / 5000)"
kill_port 5050
kill_port 5000

# ---------- Optional: stop PostGIS container ----------
# Uncomment below to also stop Docker PostGIS (saves a bit of resources)
# section "Stopping PostGIS container"
# docker stop schoolbuddy-postgis 2>/dev/null && ok "PostGIS stopped." || ok "PostGIS not running."

echo ""
echo "⏳ Waiting for processes to fully terminate..."
sleep 2

# ---------- Stop the Codespace ----------
section "Stopping GitHub Codespace"

if [[ -n "$CODESPACE_NAME" ]]; then
  if command -v gh >/dev/null 2>&1; then
    ok "Stopping Codespace: $CODESPACE_NAME"
    # Unset GITHUB_TOKEN so gh uses stored credentials (Codespace token is often invalid)
    if (unset GITHUB_TOKEN && gh codespace stop -c "$CODESPACE_NAME" 2>&1); then
      echo ""
      ok "Codespace stop requested. It will shut down shortly."
    else
      echo ""
      err "gh codespace stop FAILED."
      warn "Try: unset GITHUB_TOKEN && gh auth refresh -h github.com -s codespace"
      warn "Or stop manually: GitHub → Codespaces → ⋮ → Stop"
    fi
    echo ""
    echo "📌 WHEN YOU COME BACK:"
    echo "   1. Connect via Cursor/VS Code (Remote-SSH) to this Codespace"
    echo "   2. Run: ./scripts/startup.sh"
    echo ""
  else
    warn "gh CLI not found. Stop the Codespace manually:"
    echo "   → GitHub: https://github.com/codespaces → ⋮ → Stop"
    echo "   → Or: Command Palette → 'Codespaces: Stop Current Codespace'"
  fi
else
  warn "Not running in a Codespace (CODESPACE_NAME not set)."
  ok "Services stopped. No Codespace to stop."
fi

echo "========================================"
echo "🎉 DONE — All services stopped."
echo "========================================"
