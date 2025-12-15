#!/usr/bin/env bash
# scripts/codeRestart.sh
#
# Restart backend (5000) + frontend (3000) safely
# WITHOUT touching PostGIS container.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "========================================"
echo " 🔄 SCHOOL BUDDY — CODE RESTART SCRIPT"
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
  pid=$(lsof -t -i:"$port" || true)

  if [[ -n "$pid" ]]; then
    warn "Port $port in use by PID $pid — terminating..."
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  else
    ok "Port $port is clear."
  fi
}

# ---------- Stop running servers ----------
section "Stopping running FRONTEND"
kill_port 3000

section "Stopping running BACKEND"
kill_port 5000

echo "⏳ Waiting for ports to free up..."
sleep 2

# ---------- Restart backend ----------
section "Starting BACKEND"

cd "$ROOT_DIR/server"

if [[ ! -d node_modules ]]; then
  warn "node_modules missing — installing backend dependencies..."
  npm install
fi

npm run dev >"$ROOT_DIR/server/backend.log" 2>&1 &
sleep 2

if lsof -t -i:5000 >/dev/null 2>&1; then
  ok "Backend running on port 5000"
else
  err "Backend failed to start!"
  echo "▶ Check logs: $ROOT_DIR/server/backend.log"
  exit 1
fi

# ---------- Restart frontend ----------
section "Starting FRONTEND"

cd "$ROOT_DIR/client"

if [[ ! -d node_modules ]]; then
  warn "node_modules missing — installing frontend dependencies..."
  npm install
fi

npm start >"$ROOT_DIR/client/frontend.log" 2>&1 &
sleep 3

if lsof -t -i:3000 >/dev/null 2>&1; then
  ok "Frontend running on port 3000"
else
  err "Frontend failed to start!"
  echo "▶ Check logs: $ROOT_DIR/client/frontend.log"
  exit 1
fi

echo ""
echo "🎉 ALL SERVICES RESTARTED SUCCESSFULLY!"
echo "📜 Logs:"
echo "   - Backend:  $ROOT_DIR/server/backend.log"
echo "   - Frontend: $ROOT_DIR/client/frontend.log"
echo "========================================"
