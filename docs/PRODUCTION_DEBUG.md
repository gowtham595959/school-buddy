# Production Debugging — DB Not Connected

Use this checklist when production (Azure) is deployed but the database isn't working.

---

## Quick checks

### 1. Health endpoint

```bash
curl -s https://school-buddy-app.azurewebsites.net/api/health | jq
```

| Response | Meaning |
|----------|---------|
| `{"ok":true,"db":"up"}` | DB connected — problem is elsewhere |
| `{"ok":false,"db":"down"}` | DB not connected — follow steps below |
| `502 Bad Gateway` | Container still starting or crashed |
| `404` / timeout | App not reachable |

---

### 2. Container logs

```bash
az webapp log tail \
  --name school-buddy-app \
  --resource-group school-buddy-rg
```

Look for:

| Log message | Cause | Fix |
|-------------|-------|-----|
| `[DB] WARNING: No backup file at /docker-backup/restore.backup` | Backup not uploaded or mount missing | [Upload backup](#fix-1-upload-backup-file) |
| `[API] ERROR: Node.js exited immediately` | Node crashed (often DB connection) | Check POSTGRES_PASSWORD secret |
| `column "fees" does not exist` (or similar) | Schema mismatch — backup older than code | Redeploy. Migrations now run on startup and add missing columns. |
| `[DB] Restore complete` then `[API] Node.js running` | Startup OK | If health still fails, check secrets |
| `data directory has wrong ownership` | Azure Files mounted at PG data dir | [Remove wrong mount](#fix-2-remove-wrong-mount) |

---

### 3. GitHub Secrets (must match exactly)

Pipeline uses these secret names:

| Secret | Used for |
|--------|----------|
| `POSTGRES_PASSWORD_SCHOOL_BUDDY` | PostgreSQL password |
| `ACR_USERNAME_SCHOOL_BUDDY` | ACR pull |
| `ACR_PASSWORD_SCHOOL_BUDDY` | ACR pull |
| `GOOGLE_MAPS_API_KEY` | Transport routes |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | Azure login |

**Check:** GitHub → Settings → Secrets and variables → Actions. If `POSTGRES_PASSWORD_SCHOOL_BUDDY` is missing or wrong, DB connection will fail.

---

### 4. Azure Files mount

The backup file must be at `/docker-backup/restore.backup` inside the container.

```bash
# List storage mounts on the Web App
az webapp config storage-account list \
  --name school-buddy-app \
  --resource-group school-buddy-rg
```

You should see a mount with `mountPath: /docker-backup`. If not, the backup share was never configured.

```bash
# Verify backup file exists in the share
az storage file list \
  --share-name postgres-backup \
  --account-name <storage-account-name> \
  --account-key <storage-key>
```

Expect `restore.backup` in the list.

---

## Fixes

### Fix 1: Upload backup file

If the backup file is missing:

1. **Create a backup locally** (with Docker running):

   ```bash
   ./scripts/db_backup_snapshot.sh
   ```

   Output: `backups/db_backup_snapshot/db_full_schoolmap_<timestamp>.backup`

2. **Upload to Azure Files**:

   ```bash
   az storage file upload \
     --account-name <storage-account> \
     --account-key <storage-key> \
     --share-name postgres-backup \
     --source backups/db_backup_snapshot/db_full_schoolmap_<timestamp>.backup \
     --path restore.backup
   ```

3. **Restart the Web App** (container will re-run restore on next boot):

   ```bash
   az webapp restart --name school-buddy-app --resource-group school-buddy-rg
   ```

   Wait 2–3 minutes for restore to complete.

---

### Fix 2: Remove wrong mount

If you previously mounted Azure Files to `/var/lib/postgresql/data`, remove it:

```bash
az webapp config storage-account delete \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --custom-id postgres-data
```

Then restart the Web App.

---

### Fix 3: Add / fix Azure Files mount

If the backup share was never mounted:

```bash
# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group school-buddy-rg \
  --account-name <storage-account> \
  --query "[0].value" -o tsv)

az webapp config storage-account add \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --custom-id postgres-backup \
  --storage-type AzureFiles \
  --share-name postgres-backup \
  --account-name <storage-account> \
  --access-key $STORAGE_KEY \
  --mount-path /docker-backup
```

Then upload `restore.backup` (see Fix 1) and restart.

---

### Fix 4: Re-apply app settings

If secrets were added/updated, re-run the pipeline or apply manually:

```bash
az webapp config appsettings set \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --settings \
    WEBSITES_PORT=80 \
    PORT=5000 \
    POSTGRES_USER=postgres \
    POSTGRES_DB=schoolmap \
    NODE_ENV=production \
    POSTGRES_PASSWORD="<your-password>" \
    GOOGLE_MAPS_API_KEY="<your-key>"
```

Then restart.

---

## Summary: Why DB might not connect

| Cause | How to confirm | Fix |
|-------|----------------|-----|
| No backup file | Logs: "No backup file at /docker-backup/restore.backup" | Upload backup (Fix 1) |
| Mount not configured | `az webapp config storage-account list` empty | Add mount (Fix 3) |
| Wrong mount path | Logs: "wrong ownership" | Remove postgres-data mount (Fix 2) |
| Missing/wrong POSTGRES_PASSWORD | Health returns db:down | Add/fix secret, re-deploy |
| Container still starting | 502, logs show restore in progress | Wait 2–3 min |

---

## Next: DB schema sync

After the DB is connected, see [DB_SYNC_AZURE.md](./DB_SYNC_AZURE.md) for applying migrations and keeping the backup up to date.
