#!/usr/bin/env bash
#
# scripts/generate_full_docs.sh
#
# Architecture + Docs generator.
#
# What it does:
#   - Scans backend (server/src) and frontend (client/src).
#   - Extracts:
#       * Express routes & middleware wiring
#       * Router methods (router.get/post/put/delete/patch)
#       * Frontend API calls to /api/...
#       * GIS GeoJSON assets and references
#       * DB schema (best-effort via psql + DATABASE_URL)
#   - Writes a dated snapshot under: docs_archives/YYYY-MM-DD_HH-MM-SS/
#   - Builds a dynamic ASCII architecture diagram using real data.
#
# Usage:
#   cd scripts
#   chmod +x generate_full_docs.sh    # (once)
#   ./generate_full_docs.sh
#
# Notes:
#   - Safe to run anytime; it only *reads* your code / DB.
#   - If DB or psql aren't available, it falls back to textual notes.

set -euo pipefail

# ----- Directories -----
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/server"
FRONTEND_DIR="$ROOT_DIR/client"
GIS_DIR="$ROOT_DIR/gis"

ARCHIVE_DIR="$ROOT_DIR/docs_archives"
DATE_TAG="$(date +"%Y-%m-%d_%H-%M-%S")"
OUT_DIR="$ARCHIVE_DIR/$DATE_TAG"

mkdir -p "$OUT_DIR"

echo "📁 Generating docs into: $OUT_DIR"

# =====================================================================
# 1) PROJECT OVERVIEW
# =====================================================================

OVERVIEW_FILE="$OUT_DIR/01_project_overview.md"

cat > "$OVERVIEW_FILE" <<EOF
# Project Overview — $DATE_TAG

This folder is an automatically generated architecture snapshot of the project.

## Paths

- Root directory: \`$ROOT_DIR\`
- Backend:       \`$BACKEND_DIR\`
- Frontend:      \`$FRONTEND_DIR\`
- GIS assets:    \`$GIS_DIR\`

## Purpose of this snapshot

- Give a fast, high-level picture of how the system is wired together.
- Show:
  - Backend Express entrypoint and routers
  - Frontend components that call backend APIs
  - GIS files and which routes use them
  - Database schema (where available)
- Provide a stable "checkpoint" for future milestones.

EOF

# =====================================================================
# 2) BACKEND ROUTES + EXPRESS WIRING
# =====================================================================

ROUTES_FILE="$OUT_DIR/02_backend_routes.md"

echo "🧩 Scanning backend routes..."
cat > "$ROUTES_FILE" <<EOF
# Backend Routes & Express Wiring — $DATE_TAG

## Entry: \`server/src/index.js\`

EOF

INDEX_JS="$BACKEND_DIR/src/index.js"
if [[ -f "$INDEX_JS" ]]; then
  echo '```js' >> "$ROUTES_FILE"
  # Show only app.use / app.get / app.post lines with line numbers
  nl -ba "$INDEX_JS" | grep -E 'app\.use\(|app\.(get|post|put|delete|patch)\(' || true >> "$ROUTES_FILE"
  echo '```' >> "$ROUTES_FILE"
else
  echo "_No server/src/index.js found._" >> "$ROUTES_FILE"
fi

echo >> "$ROUTES_FILE"
echo "## Routers under \`server/src/routes\`" >> "$ROUTES_FILE"
echo >> "$ROUTES_FILE"

if [[ -d "$BACKEND_DIR/src/routes" ]]; then
  for f in "$BACKEND_DIR"/src/routes/*.js; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    echo "### $base" >> "$ROUTES_FILE"
    echo "" >> "$ROUTES_FILE"

    # Show router methods with line numbers
    if grep -qE 'router\.(get|post|put|delete|patch)\(' "$f"; then
      echo '```js' >> "$ROUTES_FILE"
      nl -ba "$f" | grep -E 'router\.(get|post|put|delete|patch)\(' || true >> "$ROUTES_FILE"
      echo '```' >> "$ROUTES_FILE"
    else
      echo "_No HTTP methods (get/post/put/delete/patch) found in this router._" >> "$ROUTES_FILE"
    fi
    echo >> "$ROUTES_FILE"
  done
else
  echo "_No routes directory found at server/src/routes._" >> "$ROUTES_FILE"
fi

# =====================================================================
# 3) FRONTEND API CALLS (fetch/axios → /api/...)
# =====================================================================

FRONTEND_API_FILE="$OUT_DIR/03_frontend_apis.md"
echo "🌐 Scanning frontend API calls..."

cat > "$FRONTEND_API_FILE" <<EOF
# Frontend API Usage — $DATE_TAG

This section lists which frontend files call backend \`/api/...\` endpoints.

We scan for:

- \`fetch("/api/...")\`
- \`axios.get("/api/...")\`, \`axios.post("/api/...")\`, etc.

## API call sites

EOF

if [[ -d "$FRONTEND_DIR/src" ]]; then
  # grep JS/JSX/TS/TSX files for /api patterns
  grep -RInE 'fetch\(["'"'"'`]/api|axios\.(get|post|put|delete|patch)\(["'"'"'`]/api' \
    "$FRONTEND_DIR/src" \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sed 's/^/- /' >> "$FRONTEND_API_FILE" || echo "_No API calls found under client/src._" >> "$FRONTEND_API_FILE"
else
  echo "_No client/src directory found._" >> "$FRONTEND_API_FILE"
fi

# =====================================================================
# 4) DATABASE SCHEMA (best-effort via psql + DATABASE_URL)
# =====================================================================

DB_SCHEMA_FILE="$OUT_DIR/04_db_schema.md"
echo "🗄  Inspecting DB schema (if possible)..."

cat > "$DB_SCHEMA_FILE" <<EOF
# Database Schema (Best Effort) — $DATE_TAG

We try to connect using \`DATABASE_URL\` from \`server/.env\` and introspect tables.

If this section only shows text and no columns, psql or DATABASE_URL may not be available.

EOF

BACKEND_ENV="$BACKEND_DIR/.env"
DB_URL=""
if [[ -f "$BACKEND_ENV" ]] && grep -q '^DATABASE_URL=' "$BACKEND_ENV"; then
  DB_URL="$(grep '^DATABASE_URL=' "$BACKEND_ENV" | head -n1 | cut -d= -f2-)"
fi

if command -v psql >/dev/null 2>&1 && [[ -n "${DB_URL}" ]]; then
  {
    echo "## Connection"
    echo ""
    echo "- DATABASE_URL: \`$DB_URL\`"
    echo ""

    echo "## Public tables"
    echo ""
    psql "$DB_URL" -Atc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" \
      | sed 's/^/- /' || true

    echo ""
    echo "## Column details for key tables (schools, catchments, etc.)"
    echo ""

    for tbl in schools catchments; do
      echo "### Table: $tbl"
      echo ""
      psql "$DB_URL" -Atc "
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '$tbl'
        ORDER BY ordinal_position;
      " 2>/dev/null \
        | awk -F'|' '{printf "- %s (%s, nullable=%s)\n", $1, $2, $3}' || echo "_No such table or failed to query: $tbl_"
      echo ""
    done
  } >> "$DB_SCHEMA_FILE" 2>/dev/null || {
    echo "_Failed to query DB via psql; check DATABASE_URL or DB availability._" >> "$DB_SCHEMA_FILE"
  }
else
  echo "_psql not found or DATABASE_URL missing; skipping live DB inspection._" >> "$DB_SCHEMA_FILE"
fi

# =====================================================================
# 5) GIS ASSETS & THEIR USAGE
# =====================================================================

GIS_FILE="$OUT_DIR/05_gis_assets.md"
echo "🗺  Scanning GIS assets..."

cat > "$GIS_FILE" <<EOF
# GIS Assets — $DATE_TAG

## GeoJSON files in \`gis/\`

EOF

if [[ -d "$GIS_DIR" ]]; then
  find "$GIS_DIR" -maxdepth 1 -type f -name '*.geojson' -printf "- %f\n" >> "$GIS_FILE" || true
else
  echo "_No gis directory found._" >> "$GIS_FILE"
fi

echo "" >> "$GIS_FILE"
echo "## Where these files are referenced in server code" >> "$GIS_FILE"
echo "" >> "$GIS_FILE"

if [[ -d "$BACKEND_DIR/src" && -d "$GIS_DIR" ]]; then
  for gf in "$GIS_DIR"/*.geojson; do
    [[ -f "$gf" ]] || continue
    base="$(basename "$gf")"
    echo "### $base" >> "$GIS_FILE"
    echo "" >> "$GIS_FILE"
    grep -RIn "$base" "$BACKEND_DIR/src" 2>/dev/null | sed 's/^/    /' >> "$GIS_FILE" || echo "    (no references found)" >> "$GIS_FILE"
    echo "" >> "$GIS_FILE"
  done
else
  echo "_Backend src directory not found; cannot map GIS usage._" >> "$GIS_FILE"
fi

# =====================================================================
# 6) DYNAMIC ASCII ARCHITECTURE DIAGRAM
# =====================================================================

ASCII_FILE="$OUT_DIR/06_ascii_architecture.txt"
echo "📐 Building dynamic ASCII architecture diagram..."

# Infer frontend entry file
FRONT_ENTRY="(not found)"
if [[ -f "$FRONTEND_DIR/src/index.jsx" ]]; then
  FRONT_ENTRY="client/src/index.jsx"
elif [[ -f "$FRONTEND_DIR/src/index.js" ]]; then
  FRONT_ENTRY="client/src/index.js"
fi

# Try to find main App component
FRONT_APP_FILE="$(find "$FRONTEND_DIR/src" -maxdepth 2 -type f \( -name 'App.jsx' -o -name 'App.js' -o -name 'App.tsx' \) 2>/dev/null | head -n1 || true)"
[[ -z "$FRONT_APP_FILE" ]] && FRONT_APP_FILE="(App component not found)"

# Extract unique frontend files that call /api
FRONT_API_CALLERS="$OUT_DIR/_tmp_front_api_callers.txt"
if [[ -d "$FRONTEND_DIR/src" ]]; then
  grep -RIlE 'fetch\(["'"'"'`]/api|axios\.(get|post|put|delete|patch)\(["'"'"'`]/api' \
    "$FRONTEND_DIR/src" \
    --include='*.js' \
    --include='*.jsx' \
    --include='*.ts' \
    --include='*.tsx' \
    2>/dev/null \
    | sed "s|$ROOT_DIR/||" \
    | sort -u > "$FRONT_API_CALLERS" || true
else
  : > "$FRONT_API_CALLERS"
fi

# Get backend routers from server/src/index.js
BACKEND_USE_LINES="$OUT_DIR/_tmp_backend_app_use.txt"
if [[ -f "$INDEX_JS" ]]; then
  nl -ba "$INDEX_JS" | grep -E 'app\.use\(' 2>/dev/null | sed "s|$ROOT_DIR/||" > "$BACKEND_USE_LINES" || true
else
  : > "$BACKEND_USE_LINES"
fi

# List router files
ROUTER_NAMES="(none)"
if [[ -d "$BACKEND_DIR/src/routes" ]]; then
  ROUTER_NAMES="$(ls "$BACKEND_DIR/src/routes" 2>/dev/null | tr '\n' ', ' | sed 's/, $//' || echo '(none)')"
fi

# List GIS files
GIS_NAMES="(none)"
if [[ -d "$GIS_DIR" ]]; then
  GIS_NAMES="$(find "$GIS_DIR" -maxdepth 1 -type f -name '*.geojson' -printf '%f, ' 2>/dev/null | sed 's/, $//' || echo '(none)')"
fi

# Build the ASCII diagram
cat > "$ASCII_FILE" <<EOF
Architecture Snapshot — $DATE_TAG
=================================

NOTE: This diagram is generated from the *actual* codebase:
- Frontend entry, main App component
- Components that call /api/...
- Backend Express app + routers
- GIS GeoJSON assets

--------------------------------------------------------------------------------
FRONTEND (React)
--------------------------------------------------------------------------------

  Entry file:
    $FRONT_ENTRY

  Main App component:
    $FRONT_APP_FILE

  Components / files that call /api/...:
$(if [[ -s "$FRONT_API_CALLERS" ]]; then sed 's/^/    - /' "$FRONT_API_CALLERS"; else echo "    - (none detected)"; fi)

--------------------------------------------------------------------------------
BACKEND (Express + Node)
--------------------------------------------------------------------------------

  Express entry:
    server/src/index.js

  app.use(...) wiring (from index.js):

$(if [[ -s "$BACKEND_USE_LINES" ]]; then sed 's/^/    /' "$BACKEND_USE_LINES"; else echo "    (no app.use lines found or index.js missing)"; fi)

  Router files under server/src/routes:
    $ROUTER_NAMES

--------------------------------------------------------------------------------
DATABASE (PostgreSQL, best-effort)
--------------------------------------------------------------------------------

  - Connection via server/.env → DATABASE_URL (if set)
  - Detailed schema in: 04_db_schema.md

--------------------------------------------------------------------------------
GIS LAYER (GeoJSON)
--------------------------------------------------------------------------------

  Files under gis/:
    $GIS_NAMES

--------------------------------------------------------------------------------
HIGH-LEVEL FLOW
--------------------------------------------------------------------------------

                 ┌──────────────────────────────┐
                 │         FRONTEND (React)     │
                 │  ${FRONT_ENTRY}$(printf '%*s' $((28 - \${#FRONT_ENTRY:-0})) '')│
                 └───────────────┬──────────────┘
                                 │ renders
                                 ▼
                     ┌──────────────────────┐
                     │       App.jsx        │
                     │  (and pages/views)   │
                     └───────────────┬──────┘
                                     │ calls
                                     ▼
                   (Components listed under "calls /api")
                                     │
                                     ▼
               ┌────────────────────────────────────────┐
               │             BACKEND (Express)          │
               │          server/src/index.js           │
               └─────┬───────────────────────┬─────────┘
                     │                       │
                     ▼                       ▼
         ┌───────────────────┐      ┌───────────────────────┐
         │ routes/schools.js │      │ routes/tiffin.js      │
         │  /api/schools     │      │ /api/schools/...      │
         └───────────────┬───┘      └───────────────┬──────┘
                         │                          │
                         ▼                          ▼
         ┌─────────────────────────┐   ┌─────────────────────────┐
         │ PostgreSQL (schoolmap) │   │ gis/*.geojson           │
         │ tables: schools, ...   │   │ tiffin_boundary, ...    │
         └─────────────────────────┘   └─────────────────────────┘

EOF

# Cleanup temp files
rm -f "$FRONT_API_CALLERS" "$BACKEND_USE_LINES" 2>/dev/null || true

echo
echo "✅ Documentation snapshot created in: $OUT_DIR"
echo "   - 01_project_overview.md"
echo "   - 02_backend_routes.md"
echo "   - 03_frontend_apis.md"
echo "   - 04_db_schema.md"
echo "   - 05_gis_assets.md"
echo "   - 06_ascii_architecture.txt"
echo
