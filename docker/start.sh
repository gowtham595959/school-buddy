#!/bin/bash
set -e

# ============================================================
# SchoolBuddy All-in-One Container Startup
# Order: PostgreSQL (5432) → Node API (5000) → nginx (80)
#
# PostgreSQL data lives INSIDE the container at /var/lib/postgresql/data.
# DO NOT mount Azure Files to that path — Azure Files (SMB/CIFS) does not
# support POSIX ownership and will break initdb.
# Mount Azure Files ONLY to /docker-backup for the .backup restore file.
# ============================================================

PG_DATA="/var/lib/postgresql/data"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
PG_DB="${POSTGRES_DB:-schoolmap}"
BACKUP_FILE="/docker-backup/restore.backup"
PG_LOG="/var/log/postgresql/postgresql.log"
API_PORT="${PORT:-5000}"

# ── 1. Initialise PostgreSQL data directory (first boot only) ─
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
  echo ">>> [DB] Initialising PostgreSQL data directory..."
  gosu postgres initdb -D "$PG_DATA" --auth-host=md5 --auth-local=trust
  echo ">>> [DB] Initdb complete."
fi

# ── 2. Start PostgreSQL ──────────────────────────────────────
echo ">>> [DB] Starting PostgreSQL..."
gosu postgres pg_ctl -D "$PG_DATA" -l "$PG_LOG" start -w -t 60
echo ">>> [DB] PostgreSQL started."

# ── 3. Set postgres password ─────────────────────────────────
gosu postgres psql -c "ALTER USER \"$PG_USER\" PASSWORD '$PG_PASSWORD';"

# ── 4. Create DB and restore backup (runs only if DB missing) ─
DB_EXISTS=$(gosu postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'")

if [ "$DB_EXISTS" != "1" ]; then
  echo ">>> [DB] Creating database '$PG_DB'..."
  gosu postgres createdb "$PG_DB"

  if [ -f "$BACKUP_FILE" ]; then
    echo ">>> [DB] Restoring from $BACKUP_FILE ..."
    gosu postgres pg_restore \
      --no-owner \
      --no-privileges \
      -d "$PG_DB" \
      "$BACKUP_FILE" \
      || echo ">>> [DB] pg_restore finished (warnings above are non-fatal)."
    echo ">>> [DB] Restore complete."
  else
    echo ">>> [DB] WARNING: No backup file at $BACKUP_FILE — starting with empty database."
    echo "         Upload your .backup file to the Azure Files 'postgres-backup' share"
    echo "         as 'restore.backup', then restart the container."
  fi
else
  echo ">>> [DB] Database '$PG_DB' already exists — skipping restore."
fi

# ── 4b. Run migrations (schema updates; use IF NOT EXISTS for idempotency) ─
if [ -d /app/db/migrations ] && [ -n "$(ls -A /app/db/migrations/*.sql 2>/dev/null)" ]; then
  echo ">>> [DB] Running migrations..."
  for f in /app/db/migrations/*.sql; do
    [ -f "$f" ] || continue
    echo ">>> [DB]   Applying $(basename "$f")..."
    gosu postgres psql -d "$PG_DB" -f "$f" -v ON_ERROR_STOP=1
  done
  echo ">>> [DB] Migrations complete."
fi

# ── 5. Start Node.js API ─────────────────────────────────────
echo ">>> [API] Starting Node.js on port $API_PORT..."
cd /app/server
export DATABASE_URL="postgresql://$PG_USER:$PG_PASSWORD@localhost:5432/$PG_DB"
node src/index.js &
NODE_PID=$!
echo ">>> [API] Node.js PID=$NODE_PID"

# Brief pause so node can connect to postgres and log any startup errors
sleep 3
if ! kill -0 $NODE_PID 2>/dev/null; then
  echo ">>> [API] ERROR: Node.js exited immediately — check logs above."
  exit 1
fi
echo ">>> [API] Node.js running."

# ── 6. Start nginx (foreground — keeps container alive) ──────
echo ">>> [nginx] Starting nginx on port 80..."
echo ""
echo "======================================================"
echo " SchoolBuddy is running"
echo "   Frontend + API  →  http://localhost:80"
echo "   Raw API          →  http://localhost:$API_PORT"
echo "   PostgreSQL        →  localhost:5432  db=$PG_DB"
echo "======================================================"

exec nginx -g "daemon off;"
