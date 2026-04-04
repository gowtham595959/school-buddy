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
#
# After uploading a new restore.backup (e.g. db-full), Azure will NOT re-apply it on
# restart while schoolmap already exists. One-shot: set App Setting
#   RESTORE_SCHOOLMAP_FROM_BACKUP=1
# restart the Web App, wait for boot, then REMOVE the setting (or restores wipe data every boot).
#
# SQL migrations (/app/db/migrations/*.sql): set App Setting
#   RUN_DB_MIGRATIONS=0
# when the pg_restore backup is the full source of truth (recommended with db-full).
# Values that skip migrations: 0, false, no, off (case-insensitive). Unset or 1 = run migrations.
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

# ── 4. Create DB and restore backup ───────────────────────────
DB_EXISTS=$(gosu postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'")

restore_from_backup() {
  if [ ! -f "$BACKUP_FILE" ]; then
    echo ">>> [DB] WARNING: No backup file at $BACKUP_FILE — cannot restore."
    return 1
  fi
  echo ">>> [DB] Restoring from $BACKUP_FILE ..."
  gosu postgres pg_restore \
    --no-owner \
    --no-privileges \
    -d "$PG_DB" \
    "$BACKUP_FILE" \
    || echo ">>> [DB] pg_restore finished (warnings above are non-fatal)."
  echo ">>> [DB] Restore complete."
}

if [ "${RESTORE_SCHOOLMAP_FROM_BACKUP:-}" = "1" ] && [ -f "$BACKUP_FILE" ]; then
  echo ">>> [DB] RESTORE_SCHOOLMAP_FROM_BACKUP=1 — reloading $PG_DB from share (see header comment)."
  if [ "$DB_EXISTS" = "1" ]; then
    gosu postgres psql -d postgres -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PG_DB' AND pid <> pg_backend_pid();" \
      >/dev/null 2>&1 || true
    gosu postgres dropdb "$PG_DB" || true
  fi
  gosu postgres createdb "$PG_DB"
  restore_from_backup
elif [ "$DB_EXISTS" != "1" ]; then
  echo ">>> [DB] Creating database '$PG_DB'..."
  gosu postgres createdb "$PG_DB"

  if [ -f "$BACKUP_FILE" ]; then
    restore_from_backup
  else
    echo ">>> [DB] WARNING: No backup file at $BACKUP_FILE — starting with empty database."
    echo "         Upload your .backup file to the Azure Files 'postgres-backup' share"
    echo "         as 'restore.backup', then restart the container."
  fi
else
  echo ">>> [DB] Database '$PG_DB' already exists — skipping restore."
  echo "         (Upload a new restore.backup then set RESTORE_SCHOOLMAP_FROM_BACKUP=1 once to apply it.)"
fi

# ── 4b. SQL migrations (optional — off when backup is full DB source of truth) ─
RUN_DB_MIGRATIONS_NORM=$(echo "${RUN_DB_MIGRATIONS:-1}" | tr '[:upper:]' '[:lower:]')
SKIP_SQL_MIGRATIONS=0
case "$RUN_DB_MIGRATIONS_NORM" in
  0|false|no|off) SKIP_SQL_MIGRATIONS=1 ;;
esac

if [ "$SKIP_SQL_MIGRATIONS" = "1" ]; then
  echo ">>> [DB] Skipping /app/db/migrations (RUN_DB_MIGRATIONS=$RUN_DB_MIGRATIONS). Using DB as restored from backup only."
elif [ -d /app/db/migrations ] && [ -n "$(ls -A /app/db/migrations/*.sql 2>/dev/null)" ]; then
  echo ">>> [DB] Running migrations (skipped per file if already in schema_migrations)..."
  gosu postgres psql -d "$PG_DB" -v ON_ERROR_STOP=1 -c \
    "CREATE TABLE IF NOT EXISTS schema_migrations (
       filename TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );"
  applied=0
  skipped=0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    already=$(gosu postgres psql -d "$PG_DB" -tAc \
      "SELECT 1 FROM schema_migrations WHERE filename = '${base//\'/\'\'}' LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
    if [ "$already" = "1" ]; then
      echo ">>> [DB]   Skip (applied) $base"
      skipped=$((skipped + 1))
      continue
    fi
    echo ">>> [DB]   Applying $base..."
    gosu postgres psql -d "$PG_DB" -f "$f" -v ON_ERROR_STOP=1
    gosu postgres psql -d "$PG_DB" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migrations (filename) VALUES ('${base//\'/\'\'}');"
    applied=$((applied + 1))
  done < <(ls -1 /app/db/migrations/*.sql 2>/dev/null | sort)
  echo ">>> [DB] Migrations complete ($applied applied, $skipped skipped)."
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
