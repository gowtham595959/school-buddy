#!/bin/bash

echo "====================================="
echo "🚀 SCHOOL BUDDY - STARTUP CHECK"
echo "====================================="

DB_CONTAINER="schoolbuddy-postgis"
DB_IMAGE="postgis/postgis:15-3.3"
DB_NAME="schoolmap"
DB_VOLUME="8514c8aeb5bf4ede1b1df4e6af7694bb556a7ce3c52e287f3acf5e4629ef51fc"

BACKEND_DIR="/workspaces/school-buddy/server"
FRONTEND_DIR="/workspaces/school-buddy/client"

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

# 1) Check Docker
log_section "Checking Docker"
if ! docker info > /dev/null 2>&1; then
  log_err "Docker is NOT running! Start Docker and try again."
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

# 5) Start backend
log_section "Starting Backend (Node)"

if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR" || exit 1

  if [ ! -d "node_modules" ]; then
    log_warn "Backend node_modules not found. Running npm install..."
    npm install
  fi

  log_ok "Starting backend with 'npm run dev'..."
  npm run dev > "$BACKEND_DIR/backend.log" 2>&1 &
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
else
  log_err "Frontend directory '$FRONTEND_DIR' not found!"
fi

echo ""
echo "====================================="
echo "🎉 ALL SERVICES RUNNING SUCCESSFULLY!"
echo "====================================="

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
