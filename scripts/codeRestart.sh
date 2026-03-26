#!/usr/bin/env bash
# scripts/codeRestart.sh
#
# Restart backend (5050 default — avoid macOS AirPlay on 5000) + frontend (3000)
# WITHOUT touching PostGIS container.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${PORT:-5050}"

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

# ---------- Kill by port (all listeners — lsof can return multiple PIDs) ----------
kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)

  if [[ -n "$pids" ]]; then
    warn "Port $port has listener(s), terminating..."
    # shellcheck disable=SC2009
    echo "$pids" | tr ' ' '\n' | sort -u | while read -r p; do
      [[ -n "$p" ]] || continue
      kill "$p" 2>/dev/null || true
    done
    sleep 1
    pids=$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "$pids" | tr ' ' '\n' | sort -u | while read -r p; do
        [[ -n "$p" ]] || continue
        kill -9 "$p" 2>/dev/null || true
      done
    fi
  else
    ok "Port $port is clear."
  fi
}

# ---------- Stop running servers ----------
section "Stopping running FRONTEND"
kill_port 3000

section "Stopping running BACKEND"
kill_port "$BACKEND_PORT"
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

PORT="$BACKEND_PORT" npm run dev >"$ROOT_DIR/server/backend.log" 2>&1 &
sleep 2

if lsof -t -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  ok "Backend running on port $BACKEND_PORT"
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

fe_ok=0
for _ in $(seq 1 30); do
  sleep 2
  if curl -sf -o /dev/null "http://127.0.0.1:3000/" 2>/dev/null; then
    fe_ok=1
    break
  fi
done

if [[ "$fe_ok" -eq 1 ]]; then
  ok "Frontend responding on http://localhost:3000"
else
  err "Frontend did not become ready on port 3000 (see log below)."
  echo "▶ Full log: $ROOT_DIR/client/frontend.log"
  echo ""
  tail -30 "$ROOT_DIR/client/frontend.log" 2>/dev/null || true
  echo ""
  err "If you see 'Something is already running on port 3000': close Cursor port forwards on 3000,"
  err "or set PORT=3001 in client/.env and open http://localhost:3001"
  exit 1
fi

echo ""
echo "🎉 ALL SERVICES RESTARTED SUCCESSFULLY!"
echo "📜 Logs:"
echo "   - Backend:  $ROOT_DIR/server/backend.log"
echo "   - Frontend: $ROOT_DIR/client/frontend.log"
echo "========================================"
