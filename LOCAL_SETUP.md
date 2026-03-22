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
- Run database init and migrations
- Start backend (port 5000) and frontend (port 3000)

---

## 4. Open in browser

- **App:** http://localhost:3000
- **API:** http://localhost:5000

---

## 5. Full data (catchments, schools, etc.)

For a fully working app with catchment data, you need to restore from a backup:

```bash
./scripts/db_restore_from_backup_snapshot.sh
```

Use a `.backup` file from `backups/db_backup_snapshot/` or from a teammate.  
If you don’t have a backup, the app will run with basic school data from init/seed.

---

## 6. Stop when done

- Press **Ctrl+C** in the terminal where `startup.sh` is running
- Or run: `./scripts/codespace-stop.sh` (stops services; no Codespace locally)

---

## Folder structure

```
school-buddy/
├── client/          # React frontend
├── server/           # Node backend
├── db/               # init, seed, migrations
├── scripts/          # setup-local-mac.sh, startup.sh, etc.
└── LOCAL_SETUP.md    # this file
```

---

## Quick reference

| Action | Command |
|--------|---------|
| First-time setup | `./scripts/setup-local-mac.sh` |
| Start app | `./scripts/startup.sh` |
| Run migrations only | `./scripts/db_sync_azure.sh migrate` |
| Restore from backup | `./scripts/db_restore_from_backup_snapshot.sh` |
| Stop | `./scripts/codespace-stop.sh` |
