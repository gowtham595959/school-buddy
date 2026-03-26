#!/usr/bin/env bash
# scripts/setup-local-mac.sh
#
# One-time setup for School Buddy on local Mac.
# Run from the project root: ./scripts/setup-local-mac.sh
#
# Prerequisites (install manually first):
#   1. Node.js 18+ — https://nodejs.org or: brew install node
#   2. Docker Desktop — https://docker.com (must be running)
#   3. Git — usually pre-installed
#

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log_section() {
  echo ""
  echo "-------------------------------------"
  echo "🔷 $1"
  echo "-------------------------------------"
}

log_ok() { echo "✅ $1"; }
log_warn() { echo "⚠️  $1"; }
log_err() { echo "❌ $1"; }

log_section "School Buddy — Local Mac Setup"
echo "Project: $ROOT_DIR"
echo ""

# 1. Check Node.js
log_section "1. Checking Node.js"
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  log_ok "Node.js $NODE_VER"
else
  log_err "Node.js not found. Install from https://nodejs.org or: brew install node"
  exit 1
fi

# 2. Check npm
if command -v npm >/dev/null 2>&1; then
  log_ok "npm $(npm -v)"
else
  log_err "npm not found (usually comes with Node.js)"
  exit 1
fi

# 3. Check Docker
log_section "2. Checking Docker"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    log_ok "Docker is installed and running"
  else
    log_err "Docker is installed but not running. Start Docker Desktop and try again."
    exit 1
  fi
else
  log_err "Docker not found. Install Docker Desktop from https://docker.com"
  exit 1
fi

# 4. Check Git
log_section "3. Checking Git"
if command -v git >/dev/null 2>&1; then
  log_ok "Git $(git --version | cut -d' ' -f3)"
else
  log_warn "Git not found (optional for setup)"
fi

# 5. Install dependencies
log_section "4. Installing dependencies"

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  log_warn "Root node_modules not found. Running npm install..."
  npm install
  log_ok "Root deps installed"
else
  log_ok "Root deps already present"
fi

if [ ! -d "$ROOT_DIR/client/node_modules" ]; then
  log_warn "Client node_modules not found. Installing..."
  (cd "$ROOT_DIR/client" && npm install)
  log_ok "Client deps installed"
else
  log_ok "Client deps already present"
fi

if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
  log_warn "Server node_modules not found. Installing..."
  (cd "$ROOT_DIR/server" && npm install)
  log_ok "Server deps installed"
else
  log_ok "Server deps already present"
fi

# 6. Database
log_section "5. Database"
log_ok "startup.sh will create the PostGIS container and run migrations on first run"

log_section "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start everything:  ./scripts/startup.sh"
echo "  2. Open:             http://localhost:3000"
echo "  3. Backend API:      http://localhost:5050 (default; avoid AirPlay on 5000)"
echo ""
echo "To stop:"
echo "  - Press Ctrl+C in the terminal where you ran startup.sh"
echo "  - Or run: ./scripts/old/codespace-stop.sh  (stops services; Codespace stop only if CODESPACE_NAME is set)"
echo ""
