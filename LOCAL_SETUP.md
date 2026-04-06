# School Buddy — Local Mac Setup

Everything lives in this one folder. Follow the steps below.

**If you're G59** and want setup in `/Users/g59/Desktop/G59_D/Business/Projects`, see [docs/LOCAL_SETUP_G59.md](docs/LOCAL_SETUP_G59.md) instead.

---

## 1. Prerequisites (install once)

| Tool | Install |
|------|---------|
| **Node.js 18+** | https://nodejs.org or `brew install node` |
| **Docker Desktop** | https://docker.com — **must be running** before setup |
| **Git** | Usually pre-installed on Mac |

---

## 2. One-time setup

```bash
cd school-buddy
chmod +x scripts/setup-local-mac.sh
./scripts/setup-local-mac.sh
```

This installs npm dependencies for root, client, and server.

---

## 3. Start the app

```bash
./scripts/startup.sh
```

This will:
- Create/start the PostGIS Docker container
- Run `db/init.sql` only if the DB has no `schools` table yet (migrations are **not** run — use `./scripts/db_sync_azure.sh migrate` or a backup restore)
- Start backend (port 5050 by default — macOS reserves 5000 for AirPlay) and frontend (port 3000)

---

## 4. Open in browser

- **App:** http://localhost:3000
- **API:** http://localhost:5050 (or set `PORT` in `server/.env`; Azure/production still uses `PORT=5000` inside the container)

### Pure local + database in Docker (typical Mac setup)

- **Node and React run on your Mac**; **only Postgres runs in Docker** (`docker compose` maps **5432 → localhost**).
- **`server/.env`:** `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/schoolmap` (see `server/.env.example`).
- **Cursor / VS Code “Ports”:** With a normal local folder, that panel is for **remote** dev; it can stay empty. You do **not** need port forwarding — open the URLs above in your browser. SQLTools already uses `127.0.0.1:5432`, which is correct for a published Docker port.

---

## 5. Full data (catchments, schools, etc.)

For a fully working app with catchment data, you need to restore from a backup:

```bash
./scripts/db_restore_from_backup_snapshot.sh
```

Use a `.backup` file from `backups/db_backup_snapshot/`, Azure, or Codespace (`./scripts/db_backup_snapshot.sh`).  
Without a restore, `schools` stays empty until you load a backup (migrations do not insert demo schools).

---

## 6. Stop when done

- Press **Ctrl+C** in the terminal where `startup.sh` is running
- Or run: `./scripts/old/codespace-stop.sh` (stops services; Codespace only if `CODESPACE_NAME` is set)

---

## Folder structure

```
school-buddy/
├── client/          # React frontend
├── server/           # Node backend
├── db/               # init, migrations
├── scripts/          # setup-local-mac.sh, startup.sh, etc.
└── LOCAL_SETUP.md    # this file
```

---

## Quick reference

| Action | Command |
|--------|---------|
| First-time setup | `./scripts/setup-local-mac.sh` |
| Start app | `./scripts/startup.sh` |
| Run migrations only (local Docker) | `./scripts/db_sync_azure.sh migrate` |
| Restore from backup | `./scripts/db_restore_from_backup_snapshot.sh` |
| Push local DB to Azure (`backup` → upload; no local migrate) | `source scripts/azure.env` then `./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full` |
| Same, but run migrations locally first | `./scripts/Code_DB_MergeGIT_DeployAzure.sh db-full-sql-files` |
| Stop | `./scripts/old/codespace-stop.sh` |

Azure upload needs `az login` and `scripts/azure.env`. See [docs/DB_SYNC_AZURE.md](docs/DB_SYNC_AZURE.md).
