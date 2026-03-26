#!/bin/bash

echo "====================================="
echo "🚀 SCHOOL BUDDY - STARTUP CHECK"
echo "====================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_CONTAINER="schoolbuddy-postgis"
DB_IMAGE="postgis/postgis:15-3.3"
DB_NAME="schoolmap"
# Use named volume for portability (local Mac + Codespaces); or bind mount: "$ROOT_DIR/.local-data/postgres"
DB_VOLUME="${DB_VOLUME:-schoolbuddy-postgres-data}"

BACKEND_DIR="$ROOT_DIR/server"
FRONTEND_DIR="$ROOT_DIR/client"

log_section() {
  echo ""
  echo "-------------------------------------"
  echo "🔷 $1"
  echo "-------------------------------------"
}

log_ok() {
  echo "✅ $1"
}

log_warn() {
  echo "⚠️  $1"
}

log_err() {
  echo "❌ $1"
}

# Wait for Docker daemon (after launch or if already starting)
wait_for_docker() {
  local max_attempts="${1:-60}"
  local i=0
  while [ "$i" -lt "$max_attempts" ]; do
    if docker info > /dev/null 2>&1; then
      return 0
    fi
    sleep 2
    i=$((i + 1))
    if [ $((i % 5)) -eq 0 ]; then
      echo "   ... waiting for Docker ($((i * 2))s / $((max_attempts * 2))s max)"
    fi
  done
  return 1
}

# Start Docker when possible, then wait until the CLI can talk to the daemon
ensure_docker_running() {
  if ! command -v docker > /dev/null 2>&1; then
    log_err "Docker CLI not found. Install Docker Desktop: https://docker.com"
    return 1
  fi

  if docker info > /dev/null 2>&1; then
    return 0
  fi

  log_warn "Docker daemon is not reachable."

  case "$(uname -s)" in
    Darwin)
      log_warn "Launching Docker Desktop (macOS)..."
      # -g background; Docker may already be open — harmless
      open -ga Docker 2>/dev/null || open -a Docker 2>/dev/null || {
        log_err "Could not open Docker.app. Install/start Docker Desktop manually."
        return 1
      }
      ;;
    Linux)
      if command -v colima >/dev/null 2>&1; then
        log_warn "Trying: colima start"
        colima start 2>/dev/null || true
      else
        log_warn "Start Docker (e.g. sudo systemctl start docker) or Docker Desktop, then re-run."
      fi
      ;;
    *)
      log_warn "Start Docker manually, then re-run this script."
      ;;
  esac

  log_warn "Waiting for Docker to become ready (up to ~2 min)..."
  if ! wait_for_docker 60; then
    return 1
  fi
  return 0
}

# 1) Check Docker (auto-start on macOS where Docker Desktop is installed)
log_section "Checking Docker"
if ! ensure_docker_running; then
  log_err "Docker did not become ready in time. Open Docker Desktop and try again."
  exit 1
fi
log_ok "Docker is running."

# 2) Ensure PostGIS container exists and is running
create_db_container() {
  log_section "Creating PostGIS container"

  log_ok "Using volume: $DB_VOLUME"
  docker run -d \
    --name "$DB_CONTAINER" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB="$DB_NAME" \
    -p 5432:5432 \
    -v "$DB_VOLUME":/var/lib/postgresql/data \
    "$DB_IMAGE" \
    postgres -c listen_addresses='*'

  if [ $? -ne 0 ]; then
    log_err "Failed to create PostGIS container."
    exit 1
  fi

  log_ok "PostGIS container created: $DB_CONTAINER"
}

log_section "Checking PostGIS container"

EXISTS=$(docker ps -a --format '{{.Names}}' | grep -w "$DB_CONTAINER" || true)

if [ -n "$EXISTS" ]; then
  RUNNING=$(docker ps --format '{{.Names}}' | grep -w "$DB_CONTAINER" || true)

  if [ -n "$RUNNING" ]; then
    log_ok "PostGIS container '$DB_CONTAINER' is already running."
  else
    log_warn "PostGIS container '$DB_CONTAINER' exists but is stopped. Attempting to start..."
    START_OUTPUT=$(docker start "$DB_CONTAINER" 2>&1)
    if [ $? -ne 0 ]; then
      log_err "Failed to start existing PostGIS container:"
      echo "$START_OUTPUT"
      log_warn "Removing broken container and recreating a fresh one attached to the same volume..."
      docker rm -f "$DB_CONTAINER" || log_warn "Failed to remove container, but will try to recreate anyway."
      create_db_container
    else
      log_ok "PostGIS container started."
    fi
  fi
else
  log_warn "PostGIS container '$DB_CONTAINER' does not exist. Creating a new one..."
  create_db_container
fi

# 3) Wait for Postgres to be ready
log_section "Waiting for Postgres / PostGIS to become ready"

MAX_ATTEMPTS=30
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if docker exec -u postgres "$DB_CONTAINER" pg_isready -d "$DB_NAME" > /dev/null 2>&1; then
    log_ok "Postgres is ready (attempt $ATTEMPT / $MAX_ATTEMPTS)."
    break
  else
    log_warn "Postgres not ready yet (attempt $ATTEMPT / $MAX_ATTEMPTS). Retrying in 2s..."
    sleep 2
  fi
  ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
  log_err "Postgres did not become ready in time. Check 'docker logs $DB_CONTAINER'."
  exit 1
fi

# 4) Verify DB connectivity with psql
log_section "Verifying database connectivity"

docker exec -u postgres "$DB_CONTAINER" psql -d "$DB_NAME" -c "\dt" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  log_err "Cannot connect to database '$DB_NAME' inside container '$DB_CONTAINER'."
  echo "Try: docker logs $DB_CONTAINER"
  exit 1
fi
log_ok "Database '$DB_NAME' is accessible."

# 4b) Bootstrap schema if empty (init only — no demo schools; use backup for full v2 data)
TABLES_EXIST=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='schools' LIMIT 1" 2>/dev/null || echo "")
if [ -z "$TABLES_EXIST" ] || [ "$TABLES_EXIST" != "1" ]; then
  log_section "Initializing database (first run)"
  if [ -f "$ROOT_DIR/db/init.sql" ]; then
    docker exec -i "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" < "$ROOT_DIR/db/init.sql" || true
    log_ok "init.sql applied"
  fi
fi

# 4c) db/migrations/*.sql are not run here (full backup = schema+data; otherwise migrate by hand).
log_section "Database migrations"
log_warn "Not applied on startup. New SQL from git or fresh DB beyond init.sql:"
log_warn "  ./scripts/db_sync_azure.sh migrate"

# 4d) v2 app expects real school/catchment data from a backup (no in-repo demo seed)
SCHOOL_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc "SELECT COUNT(*)::text FROM schools" 2>/dev/null || echo "0")
SCHOOL_COUNT=$(echo "$SCHOOL_COUNT" | tr -d '[:space:]')
if [ "${SCHOOL_COUNT:-0}" = "0" ]; then
  log_warn "No schools in the database. For full data (e.g. 19 schools), restore a backup:"
  log_warn "  ./scripts/db_restore_from_backup_snapshot.sh"
  log_warn "Create a .backup in Codespace: ./scripts/db_backup_snapshot.sh → copy to backups/db_backup_snapshot/"
fi

# 5) Start backend
log_section "Starting Backend (Node)"

if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR" || exit 1

  if [ ! -d "node_modules" ]; then
    log_warn "Backend node_modules not found. Running npm install..."
    npm install
  fi

  log_ok "Starting backend with 'npm run dev' (PORT=${PORT:-5050})..."
  PORT="${PORT:-5050}" npm run dev > "$BACKEND_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  log_ok "Backend started (PID: $BACKEND_PID). Logs: $BACKEND_DIR/backend.log"
else
  log_err "Backend directory '$BACKEND_DIR' not found!"
fi

# 6) Start frontend
log_section "Starting Frontend (React)"

if [ -d "$FRONTEND_DIR" ]; then
  cd "$FRONTEND_DIR" || exit 1

  if [ ! -d "node_modules" ]; then
    log_warn "Frontend node_modules not found. Running npm install..."
    npm install
  fi

  log_ok "Starting frontend with 'npm start'..."
  npm start > "$FRONTEND_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  log_ok "Frontend started (PID: $FRONTEND_PID). Logs: $FRONTEND_DIR/frontend.log"

  # Open browser when dev server is ready (macOS). Set OPEN_BROWSER=0 to disable.
  FE_PORT="${CLIENT_PORT:-${PORT_FRONTEND:-3000}}"
  FE_URL="http://127.0.0.1:${FE_PORT}/"
  if [ "${OPEN_BROWSER:-1}" != "0" ]; then
    case "$(uname -s)" in
      Darwin)
        (
          for _ in $(seq 1 40); do
            sleep 2
            if curl -sf -o /dev/null "$FE_URL" 2>/dev/null; then
              open "$FE_URL"
              break
            fi
          done
        ) &
        log_ok "Will open $FE_URL in your browser when the dev server is ready (OPEN_BROWSER=0 to skip)."
        ;;
    esac
  fi
else
  log_err "Frontend directory '$FRONTEND_DIR' not found!"
fi

echo ""
echo "====================================="
echo "🎉 ALL SERVICES RUNNING SUCCESSFULLY!"
echo "====================================="

# Start hourly auto-stop in background (Codespaces only — scripts/old/codespace-stop-hourly.sh)
if [ -n "$CODESPACE_NAME" ] && [ -x "$ROOT_DIR/scripts/old/codespace-stop-hourly.sh" ]; then
  (sleep 10; "$ROOT_DIR/scripts/old/codespace-stop-hourly.sh") &
  echo ""
  echo "⏰ Hourly auto-stop enabled (will stop at each :00)"
fi

echo ""
echo "📜 LOG FILE LOCATIONS:"
echo "   🟦 Backend logs :   $BACKEND_DIR/backend.log"
echo "   🟩 Frontend logs :  $FRONTEND_DIR/frontend.log"
echo "   🟪 Docker logs (PostGIS):"
echo "        docker logs $DB_CONTAINER"
echo ""
echo "To watch logs live:"
echo "   tail -f server/backend.log"
echo "   tail -f client/frontend.log"
echo "====================================="
