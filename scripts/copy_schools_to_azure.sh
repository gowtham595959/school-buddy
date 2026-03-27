#!/usr/bin/env bash
# --------------------------------------------------------
# Copy schools table (full DB) from Codespace to Azure
#
# Steps:
#   1. Apply migrations + school updates to local DB
#   2. Create backup
#   3. Upload to Azure Files as restore.backup
#   4. Restart Azure Web App
#
# Prerequisites:
#   - Local: Docker PostGIS running (schoolbuddy-postgis)
#   - Azure: az CLI installed and logged in (az login)
#   - Set: AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY
#   - Optional: AZURE_WEBAPP_NAME, AZURE_WEBAPP_RG (defaults in script)
# --------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

echo "=============================================="
echo "📤 Copy DB (schools + all) from Codespace → Azure"
echo "=============================================="

# 1. Apply updates to local DB
echo ""
echo "Step 1: Applying migrations and school updates to local DB..."
docker exec -i schoolbuddy-postgis psql -U postgres -d schoolmap < db/migrations/001_add_schools_fees.sql 2>/dev/null || true
docker exec -i schoolbuddy-postgis psql -U postgres -d schoolmap < server/scripts/update_schools_data.sql 2>/dev/null || true
docker exec -i schoolbuddy-postgis psql -U postgres -d schoolmap < server/scripts/update_schools_fees.sql 2>/dev/null || true
docker exec -i schoolbuddy-postgis psql -U postgres -d schoolmap < server/scripts/update_schools_flags.sql 2>/dev/null || true
echo "✅ Local DB updated."

# 2. Create backup
echo ""
echo "Step 2: Creating backup..."
"$SCRIPT_DIR/db_backup_snapshot.sh"
echo "✅ Backup created."

# 3 & 4. Upload and restart (uses db_sync_azure.sh)
echo ""
echo "Step 3 & 4: Upload to Azure and restart Web App..."
"$SCRIPT_DIR/db_sync_azure.sh" upload

echo ""
echo "=============================================="
echo "🎉 Done. Azure will restore from the new backup on next container start."
echo "   Wait 2–3 minutes, then check: https://<your-app>.azurewebsites.net"
echo "=============================================="
