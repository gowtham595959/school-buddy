# Deploy SchoolBuddy — All-in-One Container on Azure

This guide deploys the entire application as **one Docker image** containing:

| Process | Internal port | Exposed |
|---------|--------------|---------|
| PostgreSQL 15 + PostGIS 3.3 | 5432 | No |
| Node.js API | 5000 | No |
| nginx (frontend + API proxy) | 80 | **Yes — public** |

One Azure Web App, one container, one public URL.

---

## Architecture

```
Browser
  └─► Azure Web App (port 80)
        └─► nginx
              ├── /api/* → localhost:5000  (Node.js)
              └── /*     → /usr/share/nginx/html  (React build)
                              │
                              └─► localhost:5432  (PostgreSQL)
```

---

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in
- [Docker Desktop](https://www.docker.com/products/docker-desktop) running
- Your `.backup` file at `backups/db_backup_snapshot/db_full_schoolmap_05-Mar_12_53.backup`
- A Google Maps API key

---

## Step 1 — Variables (set once)

Run these in **PowerShell** before any other commands. Replace the placeholder values.

```powershell
$RG            = "schoolbuddy-rg"
$LOCATION      = "canadacentral"
$ACR_NAME      = "schoolbuddyacr"           # must be globally unique, lowercase
$APP_NAME      = "schoolbuddy-app"          # Web App name
$PLAN_NAME     = "schoolbuddy-plan"
$PG_PASSWORD   = "YourStrongPassword123!"   # change this
$GMAPS_KEY     = "AIza..."                  # your Google Maps key
$BACKUP_FILE   = "backups\db_backup_snapshot\db_full_schoolmap_05-Mar_12_53.backup"
$IMAGE         = "$ACR_NAME.azurecr.io/schoolbuddy/all-in-one:latest"
```

---

## Step 2 — Create Azure resources

```powershell
# Resource group
az group create --name $RG --location $LOCATION

# Container Registry (Basic tier is fine)
az acr create --resource-group $RG --name $ACR_NAME --sku Basic --admin-enabled true

# App Service Plan — Linux, B2 or higher (B1 is too small for DB + Node + nginx)
az appservice plan create `
  --name $PLAN_NAME `
  --resource-group $RG `
  --location $LOCATION `
  --is-linux `
  --sku B2
```

> **Why B2?** PostgreSQL alone needs ~200 MB RAM. B1 (1.75 GB) is tight; B2 (3.5 GB) is comfortable.

---

## Step 3 — Create Azure Files share for the backup file

> **Why only one share?**
> Azure Files uses SMB/CIFS which does **not** support POSIX file ownership.
> Mounting it at `/var/lib/postgresql/data` causes PostgreSQL's `initdb` to
> fail with *"data directory has wrong ownership"*.
> The PostgreSQL data directory lives **inside the container** on the local
> filesystem (pre-owned by the `postgres` user in the image).
> Azure Files is used **only** to hold the `.backup` restore file, which is
> read-only at startup.
>
> **Trade-off**: if the container restarts, PostgreSQL re-initialises from the
> backup (takes 1–3 min). Any data written after the restore (e.g. new catchment
> definitions entered via the UI) is lost on restart. For a primarily read-heavy
> school map this is acceptable.

```powershell
$STORAGE_NAME  = "schoolbuddystorage"       # lowercase, 3-24 chars, globally unique
$SHARE_BACKUP  = "postgres-backup"

# Storage account
az storage account create `
  --name $STORAGE_NAME `
  --resource-group $RG `
  --location $LOCATION `
  --sku Standard_LRS

# Get the storage key
$STORAGE_KEY = $(az storage account keys list `
  --resource-group $RG `
  --account-name $STORAGE_NAME `
  --query "[0].value" -o tsv)

# Create the backup share
az storage share create --name $SHARE_BACKUP --account-name $STORAGE_NAME --account-key $STORAGE_KEY
```

### Upload the database backup to Azure Files

```powershell
az storage file upload `
  --account-name $STORAGE_NAME `
  --account-key $STORAGE_KEY `
  --share-name $SHARE_BACKUP `
  --source $BACKUP_FILE `
  --path "restore.backup"
```

---

## Step 4 — Build and push the all-in-one image

Run from the **repository root** (where `docker/` and `server/` and `client/` are):

```powershell
# Log in to ACR
az acr login --name $ACR_NAME

# Build (the Dockerfile is in docker/ but the context is the repo root)
docker build -f docker/Dockerfile.all-in-one -t $IMAGE .

# Push
docker push $IMAGE
```

> The build takes 3–6 minutes the first time (npm installs + React build).

---

## Step 5 — Create the Web App

```powershell
# ACR credentials
$ACR_USER     = $(az acr credential show --name $ACR_NAME --query "username" -o tsv)
$ACR_PASSWORD = $(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Create Web App for Containers
az webapp create `
  --resource-group $RG `
  --plan $PLAN_NAME `
  --name $APP_NAME `
  --deployment-container-image-name $IMAGE

# Configure ACR credentials
az webapp config container set `
  --resource-group $RG `
  --name $APP_NAME `
  --container-image-name $IMAGE `
  --container-registry-url "https://$ACR_NAME.azurecr.io" `
  --container-registry-user $ACR_USER `
  --container-registry-password $ACR_PASSWORD
```

---

## Step 6 — Mount Azure Files backup share

Mount **only** the backup share. Do **not** mount anything to `/var/lib/postgresql/data`.

```powershell
az webapp config storage-account add `
  --resource-group $RG `
  --name $APP_NAME `
  --custom-id postgres-backup `
  --storage-type AzureFiles `
  --share-name $SHARE_BACKUP `
  --account-name $STORAGE_NAME `
  --access-key $STORAGE_KEY `
  --mount-path "/docker-backup"
```

---

## Step 7 — Set environment variables

```powershell
az webapp config appsettings set `
  --resource-group $RG `
  --name $APP_NAME `
  --settings `
    WEBSITES_PORT=80 `
    POSTGRES_USER=postgres `
    POSTGRES_PASSWORD=$PG_PASSWORD `
    POSTGRES_DB=schoolmap `
    PORT=5000 `
    GOOGLE_MAPS_API_KEY=$GMAPS_KEY `
    FRONTEND_ORIGIN="https://$APP_NAME.azurewebsites.net"
```

---

## Step 8 — Restart and verify

```powershell
az webapp restart --resource-group $RG --name $APP_NAME
```

Wait 2–3 minutes (DB restore runs on first start), then open:

```
https://<APP_NAME>.azurewebsites.net
```

### Check logs

```powershell
az webapp log tail --resource-group $RG --name $APP_NAME
```

You should see:
```
>>> [DB] Initialising PostgreSQL data directory...
>>> [DB] Starting PostgreSQL...
>>> [DB] Creating database 'schoolmap'...
>>> [DB] Restoring from backup: /docker-backup/restore.backup
>>> [DB] Restore complete.
>>> [API] Starting Node.js on port 5000...
>>> [nginx] Starting nginx on port 80...
```

On subsequent restarts (container was restarted, data dir is fresh again):
```
>>> [DB] Initialising PostgreSQL data directory...
>>> [DB] Starting PostgreSQL...
>>> [DB] Creating database 'schoolmap'...
>>> [DB] Restoring from /docker-backup/restore.backup ...
>>> [DB] Restore complete.
>>> [API] Starting Node.js on port 5000...
>>> [nginx] Starting nginx on port 80...
```

> **Note on data persistence**: The PostgreSQL data directory lives inside the
> container's local filesystem. Azure Files is only used for the backup file.
> On every container restart the database is re-initialised and restored from
> the backup (~1–3 minutes). Any data written to the database after the restore
> (e.g. new catchment definitions) is lost on the next restart. This is the
> correct trade-off for avoiding the Azure Files ownership error.

---

## Updating the application

After a code change:

```powershell
docker build -f docker/Dockerfile.all-in-one -t $IMAGE .
docker push $IMAGE
az webapp restart --resource-group $RG --name $APP_NAME
```

Or trigger a redeploy via the Azure Portal → **Deployment Center → Sync**.

---

## Troubleshooting

### "data directory has wrong ownership" in logs

**Do not mount Azure Files to `/var/lib/postgresql/data`.** Azure Files (SMB/CIFS)
does not support POSIX file ownership, so PostgreSQL always sees "wrong ownership"
on that path.

The correct setup is: **no mount at `/var/lib/postgresql/data`**. The PostgreSQL
data directory lives inside the container on its local filesystem. If you previously
added that mount in the Azure Portal, remove it:

```powershell
az webapp config storage-account delete `
  --resource-group $RG `
  --name $APP_NAME `
  --custom-id postgres-data
```

### Container won't start

1. Azure Portal → your Web App → **Log stream** — read the raw output
2. Check ACR credentials: `az acr credential show --name $ACR_NAME`
3. Ensure the image was pushed: `az acr repository list --name $ACR_NAME`

### DB restore is slow / times out

The restore can take 1–3 minutes. Azure Web Apps have a 230-second startup timeout.
If the restore exceeds this, Azure restarts the container; on the next boot it
starts the restore again from the beginning. This is safe — the data dir is always
wiped clean at the start of each boot.

### "No backup file found"

The Azure Files backup share was not mounted or the file wasn't uploaded. Verify:
```powershell
az storage file list --share-name $SHARE_BACKUP --account-name $STORAGE_NAME --account-key $STORAGE_KEY
```

### API returns 502

nginx is up but Node.js hasn't started yet (DB restore still running). Wait 30–60 seconds and refresh.

### Increase the App Service Plan

If the container is being OOM-killed:
```powershell
az appservice plan update --name $PLAN_NAME --resource-group $RG --sku P1V3
```

---

## Cost estimate (canadacentral, 2026)

| Resource | SKU | ~Monthly cost |
|----------|-----|--------------|
| App Service Plan | B2 Linux | ~$65 USD |
| Container Registry | Basic | ~$5 USD |
| Storage Account | Standard LRS | ~$1 USD |
| **Total** | | **~$71 USD/month** |

To reduce cost during development, **stop** (not delete) the Web App when not in use:
```powershell
az webapp stop  --resource-group $RG --name $APP_NAME
az webapp start --resource-group $RG --name $APP_NAME
```

---

## GitHub Actions CI/CD (optional)

Create `.github/workflows/deploy-all-in-one.yml`:

```yaml
name: Deploy All-in-One

on:
  push:
    branches: [main]

env:
  ACR_NAME: schoolbuddyacr
  IMAGE: schoolbuddyacr.azurecr.io/schoolbuddy/all-in-one:latest

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.ACR_NAME }}.azurecr.io
          username: ${{ secrets.ACR_USER }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.all-in-one
          push: true
          tags: ${{ env.IMAGE }}

      - name: Restart Web App
        uses: azure/cli@v1
        with:
          azcliversion: latest
          inlineScript: |
            az webapp restart \
              --resource-group schoolbuddy-rg \
              --name ${{ secrets.APP_NAME }}
        env:
          AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
```

Add these GitHub Secrets:
- `ACR_USER` / `ACR_PASSWORD` — from `az acr credential show`
- `APP_NAME` — your Web App name
- `AZURE_CREDENTIALS` — from `az ad sp create-for-rbac --sdk-auth`
