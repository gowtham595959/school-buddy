# School Buddy — CI/CD Handover Document

**Application:** School Buddy  
**Stack:** React (frontend) · Node.js/Express (API) · PostgreSQL 15 + PostGIS 3.3  
**Deployment target:** Azure Web App (single container)  
**Container registry:** Azure Container Registry (ACR)  
**Pipeline:** GitHub Actions  

---

## Table of Contents

1. [Application Architecture Overview](#1-application-architecture-overview)
2. [Container Architecture](#2-container-architecture)
3. [Repository Structure Relevant to CI/CD](#3-repository-structure-relevant-to-cicd)
4. [CI/CD Pipeline Overview](#4-cicd-pipeline-overview)
5. [GitHub Secrets — Required Configuration](#5-github-secrets--required-configuration)
6. [Parameters File](#6-parameters-file)
7. [Pipeline Jobs & Steps Detail](#7-pipeline-jobs--steps-detail)
8. [Azure Prerequisites](#8-azure-prerequisites)
9. [First-Time Setup Checklist](#9-first-time-setup-checklist)
10. [App Settings Reference](#10-app-settings-reference)
11. [Database Restore on First Boot](#11-database-restore-on-first-boot)
12. [Manual Deployment (Fallback)](#12-manual-deployment-fallback)
13. [Monitoring & Troubleshooting](#13-monitoring--troubleshooting)
14. [Known Constraints & Design Decisions](#14-known-constraints--design-decisions)

---

## 1. Application Architecture Overview

School Buddy is a GIS web application that allows UK parents to check school catchment areas, eligibility, and transport routes.

```
Browser
  │
  ▼
Azure Web App  (single Docker container, port 80)
  │
  ├── nginx (port 80)
  │     ├── Serves React SPA (built static files)
  │     └── Reverse-proxies /api/* → localhost:5000
  │
  ├── Node.js / Express API (port 5000, internal only)
  │     ├── /api/schools
  │     ├── /api/catchments, /api/catchments-v2/:id
  │     ├── /api/catchment-check
  │     ├── /api/geocode
  │     ├── /api/transport-route  (calls Google Maps Directions API)
  │     └── /api/health
  │
  └── PostgreSQL 15 + PostGIS 3.3 (port 5432, internal only)
        └── Database: schoolmap
```

**Key design choice:** All three services run inside a single Docker container. PostgreSQL data lives on the container's local filesystem (`/var/lib/postgresql/data`). On first boot, the container restores a `.backup` file mounted via Azure Files.

---

## 2. Container Architecture

### Build: Multi-stage Dockerfile

`docker/Dockerfile.all-in-one` uses two build stages:

| Stage | Base image | Purpose |
|---|---|---|
| `frontend-build` | `node:20-slim` | Runs `npm ci && npm run build` in `client/` |
| Runtime | `postgis/postgis:15-3.3` | Installs Node 20 + nginx, copies built assets & backend |

The final image contains:
- Built React SPA copied to `/usr/share/nginx/html`
- Node.js backend installed at `/app/server`
- nginx config at `/etc/nginx/sites-available/default`
- Startup script at `/start.sh`

### Startup sequence (`docker/start.sh`)

On every container start, `start.sh` runs in order:

1. **PostgreSQL init** — `initdb` only if `/var/lib/postgresql/data/PG_VERSION` doesn't exist (i.e., first boot)
2. **PostgreSQL start** — `pg_ctl start`
3. **Set password** — `ALTER USER postgres PASSWORD '...'`
4. **DB creation & restore** — Creates `schoolmap` DB and runs `pg_restore` from `/docker-backup/restore.backup` (only if the DB doesn't already exist)
5. **Node.js start** — `node src/index.js &` with `DATABASE_URL` constructed from env vars
6. **nginx start** — Foreground (`nginx -g 'daemon off;'`), keeps the container alive

### Azure Files mount

A critical Azure-specific constraint: **Azure Files (SMB) must NOT be mounted to `/var/lib/postgresql/data`** because SMB/CIFS does not support POSIX file ownership, which breaks `initdb`. Instead:

- Azure Files is mounted **only** to `/docker-backup`
- The `.backup` restore file must be named `restore.backup` in that share
- PostgreSQL data directory stays on the container's ephemeral filesystem

> **Implication:** If the container is restarted or re-deployed, PostgreSQL data is NOT lost as long as the container is restarted (not recreated). If the container is deleted/replaced (e.g., new deployment), the DB will be re-restored from the backup file on `/docker-backup`. This means **the backup file must always be kept up to date** if you want to preserve production data across deployments.

---

## 3. Repository Structure Relevant to CI/CD

```
school-buddy/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml              ← GitHub Actions pipeline
│   └── deploy.parameters.json      ← Non-secret deployment config
│
├── docker/
│   ├── Dockerfile.all-in-one       ← Production Docker image definition
│   ├── start.sh                    ← Container entrypoint & startup orchestration
│   └── nginx-all-in-one.conf       ← nginx: SPA serving + API proxy
│
├── client/                         ← React frontend (built during Docker build)
├── server/                         ← Node.js/Express API
└── docs/
    └── CICD_HANDOVER.md            ← This document
```

---

## 4. CI/CD Pipeline Overview

The pipeline is defined in `.github/workflows/deploy.yml` and runs automatically on every push to the `main` branch, or can be triggered manually via **Actions → Run workflow**.

### Trigger conditions

| Event | Behaviour |
|---|---|
| `push` to `main` | Automatic build + deploy |
| `workflow_dispatch` | Manual trigger; optionally specify a custom image tag or force deploy |

### Pipeline diagram

```
Push to main / Manual trigger
        │
        ▼
┌─────────────────────────┐
│  Job 1: build-and-push  │
│                         │
│  1. Checkout code       │
│  2. Read parameters     │
│  3. Set image tag       │
│     (git SHA by default)│
│  4. Login to ACR        │
│  5. Docker Buildx setup │
│  6. Build image         │
│     (multi-stage)       │
│  7. Push to ACR         │
│     - :sha tag          │
│     - :latest tag       │
└───────────┬─────────────┘
            │  outputs: full_image, image_tag
            ▼
┌─────────────────────────┐
│  Job 2: deploy          │
│  (environment: prod)    │
│                         │
│  1. Checkout code       │
│  2. Read parameters     │
│  3. Azure login         │
│  4. Update container    │
│     image on Web App    │
│  5. Apply app settings  │
│     (params + secrets)  │
│  6. Restart Web App     │
│  7. Health check poll   │
│     GET /api/health     │
│  8. Deployment summary  │
│  9. Azure logout        │
└─────────────────────────┘
```

### Image tagging strategy

By default, images are tagged with the **first 8 characters of the git commit SHA** (e.g., `a1b2c3d4`). This ensures:
- Every deployed image is traceable to a specific commit
- No ambiguity from floating tags like `latest`
- `latest` is also pushed as a convenience tag for manual pulls

The tag strategy is controlled by `.image.tagStrategy` in the parameters file.

---

## 5. GitHub Secrets — Required Configuration

Navigate to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Description | Where to find it |
|---|---|---|
| `AZURE_CLIENT_ID` | Service principal Application (client) ID | Azure AD → App registrations → your SP |
| `AZURE_CLIENT_SECRET` | Service principal client secret | Azure AD → App registrations → Certificates & secrets |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Azure AD → Overview |
| `ACR_USERNAME` | ACR admin username | ACR → Access keys → Username |
| `ACR_PASSWORD` | ACR admin password | ACR → Access keys → password |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password for the container | Your choice — set once, store safely |
| `GOOGLE_MAPS_API_KEY` | Google Maps Directions API key | Google Cloud Console → APIs & Services |

> **Security note:** Never put secret values in `deploy.parameters.json`. That file is committed to the repository. All secrets go in GitHub Secrets only.

### Enabling ACR Admin Account

ACR admin access must be enabled before copying the credentials:

```bash
az acr update --name <acr-name> --admin-enabled true
az acr credential show --name <acr-name>
```

---

## 6. Parameters File

**Location:** `.github/deploy.parameters.json`

This file stores all non-secret deployment configuration. It is read by both pipeline jobs at runtime using `jq`.

```json
{
  "acr": {
    "loginServer": "schoolbuddyacr.azurecr.io",    // ACR login server URL
    "repository": "school-buddy",                   // Repository name within ACR
    "resourceGroup": "school-buddy-rg",             // Azure resource group
    "subscriptionId": "<your-azure-subscription-id>"
  },
  "webapp": {
    "name": "school-buddy-app",                     // Azure Web App name
    "resourceGroup": "school-buddy-rg",             // Resource group (can differ from ACR)
    "slot": "production"                            // Deployment slot (for future use)
  },
  "image": {
    "tagStrategy": "sha"                            // "sha" | "latest"
  },
  "appSettings": {
    "WEBSITES_PORT": "80",                          // Port Azure exposes (must match nginx)
    "PORT": "5000",                                 // Node.js internal API port
    "POSTGRES_USER": "postgres",
    "POSTGRES_DB": "schoolmap",
    "NODE_ENV": "production"
    // POSTGRES_PASSWORD and GOOGLE_MAPS_API_KEY come from GitHub Secrets
  }
}
```

**To update for a new environment**, change the values in this file and push — the pipeline will pick them up on the next run.

---

## 7. Pipeline Jobs & Steps Detail

### Job 1: `build-and-push`

#### Step: Read deployment parameters
Extracts `acr.loginServer`, `acr.repository`, and `image.tagStrategy` from `deploy.parameters.json` using `jq` and writes them to `$GITHUB_OUTPUT` for subsequent steps.

#### Step: Set image tag
Determines the final Docker image tag:
- If a manual `image_tag` input was provided → uses that
- If `tagStrategy` is `sha` → uses the first 8 chars of `github.sha`
- Otherwise → uses `latest`

Constructs the full image reference, e.g. `schoolbuddyacr.azurecr.io/school-buddy:a1b2c3d4`.

#### Step: Log in to ACR
Uses `docker/login-action` with `ACR_USERNAME` and `ACR_PASSWORD` secrets.

#### Step: Set up Docker Buildx
Enables BuildKit with layer caching support via the registry (build cache is stored as a separate tag `buildcache` in ACR, greatly speeding up repeat builds).

#### Step: Build and push Docker image
Calls `docker/build-push-action` with:
- `context: .` — build context is the repository root
- `file: docker/Dockerfile.all-in-one` — the multi-stage production Dockerfile
- Pushes both the SHA tag and `:latest`
- Uses registry-based layer cache

---

### Job 2: `deploy`

This job requires the `production` environment in GitHub, which enables deployment protection rules (e.g., manual approval before deploying — configure in **Settings → Environments → production**).

#### Step: Log in to Azure
Uses `azure/login@v2` with a service principal JSON constructed from secrets. The subscription ID comes from the parameters file.

#### Step: Update Web App container image
Runs `az webapp config container set` to point the Web App at the new image in ACR. This also sets the ACR credentials on the Web App so it can pull the image.

```bash
az webapp config container set \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --container-image-name schoolbuddyacr.azurecr.io/school-buddy:a1b2c3d4 \
  --container-registry-url https://schoolbuddyacr.azurecr.io \
  --container-registry-user <ACR_USERNAME> \
  --container-registry-password <ACR_PASSWORD>
```

#### Step: Apply app settings
Reads the `appSettings` block from the parameters file, filters out comment keys (those starting with `_`), and constructs `key=value` pairs. Secrets (`POSTGRES_PASSWORD`, `GOOGLE_MAPS_API_KEY`) are appended from GitHub Secrets. The complete set is applied via `az webapp config appsettings set`.

App settings are surfaced as environment variables inside the container at runtime.

#### Step: Restart Web App
Issues `az webapp restart` to force the Web App to pull and start the new container. Without this explicit restart, Azure may continue using the cached previous container.

#### Step: Wait for health check
Polls `GET https://<webapp>.azurewebsites.net/api/health` every 15 seconds for up to 5 minutes (20 attempts). Returns 200 when the Node.js API is up. A failure here generates a warning (not a hard failure) since the container startup includes PostgreSQL init/restore which can take a few minutes on first boot.

---

## 8. Azure Prerequisites

The following Azure resources must exist before running the pipeline for the first time.

### Resource Group
```bash
az group create --name school-buddy-rg --location uksouth
```

### Azure Container Registry
```bash
az acr create \
  --name schoolbuddyacr \
  --resource-group school-buddy-rg \
  --sku Basic \
  --admin-enabled true
```

### Azure Web App (Linux container)
The Web App needs a Linux App Service Plan with Docker container support:

```bash
# App Service Plan (Linux, B2 or higher recommended)
az appservice plan create \
  --name school-buddy-plan \
  --resource-group school-buddy-rg \
  --is-linux \
  --sku B2

# Web App (container type)
az webapp create \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --plan school-buddy-plan \
  --deployment-container-image-name schoolbuddyacr.azurecr.io/school-buddy:latest
```

### Azure Files share (for DB backup)
```bash
# Storage account
az storage account create \
  --name schoolbuddystorage \
  --resource-group school-buddy-rg \
  --sku Standard_LRS

# File share
az storage share create \
  --name postgres-backup \
  --account-name schoolbuddystorage

# Mount to Web App at /docker-backup
az webapp config storage-account add \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --custom-id postgres-backup \
  --storage-type AzureFiles \
  --account-name schoolbuddystorage \
  --share-name postgres-backup \
  --mount-path /docker-backup \
  --access-key <storage-account-key>
```

### Service Principal for GitHub Actions
```bash
az ad sp create-for-rbac \
  --name "school-buddy-github-actions" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/school-buddy-rg \
  --sdk-auth
```
The output JSON gives you `clientId`, `clientSecret`, and `tenantId` — add these as GitHub Secrets.

---

## 9. First-Time Setup Checklist

- [ ] Create Azure resource group, ACR, App Service Plan, Web App
- [ ] Enable ACR admin account
- [ ] Create Azure Files storage account and `postgres-backup` share
- [ ] Upload the `restore.backup` file to the `postgres-backup` Azure Files share
- [ ] Mount the Azure Files share to the Web App at `/docker-backup`
- [ ] Create a service principal with Contributor access to the resource group
- [ ] Add all 7 GitHub Secrets (see [Section 5](#5-github-secrets--required-configuration))
- [ ] Update `.github/deploy.parameters.json` with your actual ACR name, subscription ID, Web App name, and resource group
- [ ] Create the `production` environment in GitHub (optional: add required reviewers for deployment protection)
- [ ] Push to `main` or trigger manually — the pipeline will build, push, and deploy

---

## 10. App Settings Reference

These environment variables are set on the Azure Web App by the pipeline and are available to the container at runtime.

| Variable | Source | Default | Description |
|---|---|---|---|
| `WEBSITES_PORT` | `deploy.parameters.json` | `80` | Port Azure routes traffic to (must match nginx listen port) |
| `PORT` | `deploy.parameters.json` | `5000` | Node.js API internal port |
| `POSTGRES_USER` | `deploy.parameters.json` | `postgres` | PostgreSQL superuser name |
| `POSTGRES_DB` | `deploy.parameters.json` | `schoolmap` | Database name |
| `NODE_ENV` | `deploy.parameters.json` | `production` | Node.js environment mode |
| `POSTGRES_PASSWORD` | GitHub Secret | — | PostgreSQL password (injected securely) |
| `GOOGLE_MAPS_API_KEY` | GitHub Secret | — | Required for transport route feature |

> `DATABASE_URL` is constructed at runtime inside `start.sh` from the above variables and is not set directly.

---

## 11. Database Restore on First Boot

When a freshly deployed container starts for the first time (i.e., the DB doesn't exist yet), `start.sh` automatically:

1. Runs `initdb` to create the PostgreSQL data directory
2. Creates the `schoolmap` database
3. Runs `pg_restore --no-owner --no-privileges -d schoolmap /docker-backup/restore.backup`

This means the DB is populated from the backup file without any manual intervention. The restore runs once and is skipped on subsequent restarts because the DB already exists.

### Keeping the backup current

Because the PostgreSQL data directory is ephemeral (lives on the container's local filesystem), **a container replacement (new deployment) causes data loss** unless:
- The backup file at `/docker-backup/restore.backup` is kept up to date, **or**
- The application is migrated to an external managed PostgreSQL service (e.g., Azure Database for PostgreSQL)

To create and upload a fresh backup:
```bash
# From inside the running container or a local dev environment
pg_dump -Fc -d schoolmap -f /tmp/restore.backup
# Upload to Azure Files
az storage file upload \
  --account-name schoolbuddystorage \
  --share-name postgres-backup \
  --source /tmp/restore.backup \
  --path restore.backup
```

---

## 12. Manual Deployment (Fallback)

If the pipeline is unavailable, you can deploy manually:

```bash
# 1. Build the image locally
docker build -f docker/Dockerfile.all-in-one -t schoolbuddyacr.azurecr.io/school-buddy:manual .

# 2. Push to ACR
az acr login --name schoolbuddyacr
docker push schoolbuddyacr.azurecr.io/school-buddy:manual

# 3. Update the Web App
az webapp config container set \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --container-image-name schoolbuddyacr.azurecr.io/school-buddy:manual \
  --container-registry-url https://schoolbuddyacr.azurecr.io \
  --container-registry-user <ACR_USERNAME> \
  --container-registry-password <ACR_PASSWORD>

# 4. Apply app settings (example — adjust as needed)
az webapp config appsettings set \
  --name school-buddy-app \
  --resource-group school-buddy-rg \
  --settings WEBSITES_PORT=80 PORT=5000 POSTGRES_USER=postgres POSTGRES_DB=schoolmap NODE_ENV=production \
             POSTGRES_PASSWORD=<password> GOOGLE_MAPS_API_KEY=<key>

# 5. Restart
az webapp restart --name school-buddy-app --resource-group school-buddy-rg
```

---

## 13. Monitoring & Troubleshooting

### Viewing container logs

```bash
# Stream live logs from Azure Web App
az webapp log tail --name school-buddy-app --resource-group school-buddy-rg

# Download log archive
az webapp log download --name school-buddy-app --resource-group school-buddy-rg
```

### Health endpoint

`GET https://school-buddy-app.azurewebsites.net/api/health`

Returns `200 OK` when the Node.js API is running and connected to PostgreSQL. This endpoint is used by the pipeline's post-deploy health check.

### Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Container exits immediately | PostgreSQL `initdb` failed (wrong filesystem permissions on data dir) | Ensure Azure Files is NOT mounted at `/var/lib/postgresql/data` |
| DB empty after deploy | `restore.backup` not present at `/docker-backup/restore.backup` | Upload the backup file to the Azure Files share |
| `502 Bad Gateway` | nginx is up but Node.js hasn't started yet | Wait for full startup (can take 2–4 min on cold start); check logs |
| `500` on `/api/transport-route` | Missing or invalid `GOOGLE_MAPS_API_KEY` | Check app settings in Azure portal or re-run pipeline with correct secret |
| Pipeline fails at "Apply app settings" | `jq` parsing error or empty secret value | Verify the parameters file is valid JSON; check all secrets are set |
| ACR pull fails on Web App | ACR credentials not updated after password rotation | Re-run the pipeline or manually update container settings |

---

## 14. Known Constraints & Design Decisions

| Constraint | Reason |
|---|---|
| Single-container all-in-one deployment | Chosen for simplicity and low cost. All three services (Postgres, Node, nginx) share one container rather than separate services. |
| PostgreSQL data on ephemeral filesystem | Azure Files (SMB) doesn't support POSIX ownership required by `initdb`. External managed DB would eliminate this constraint. |
| DB restore on every container replacement | Consequence of ephemeral storage. Production data backup must be kept current. |
| No staging slot configured | The pipeline deploys directly to production. Adding an Azure deployment slot (`--slot staging`) and a swap step would add zero-downtime deployments. |
| ACR admin credentials used for pull | Simpler to set up. For higher security, replace with a managed identity assigned to the Web App with `AcrPull` role. |
| Health check non-blocking | Pipeline warns rather than fails if health check times out, because PostgreSQL restore on first boot can exceed the polling window. |
