# School Buddy — Local Mac Setup (G59)

Everything in one place. Run the bootstrap script once, then use Cursor locally.

---

## Your paths

| Item | Path |
|------|------|
| **Projects folder** | `/Users/g59/Desktop/G59_D/Business/Projects` |
| **School Buddy** | `/Users/g59/Desktop/G59_D/Business/Projects/school-buddy` |
| **GitHub repo** | `https://github.com/gowtham595959/school-buddy.git` |
| **Branch** | `feature/catchments-v2` |

---

## Step 1: Prerequisites (install once)

| Tool | Install |
|------|---------|
| **Node.js 18+** | https://nodejs.org or `brew install node` |
| **Docker Desktop** | https://docker.com — **must be running** before setup |
| **Git** | Usually pre-installed on Mac |

---

## Step 2: Run bootstrap (one time)

**Option A — Fresh clone** (repo not on your Mac yet):

```bash
cd /Users/g59/Desktop/G59_D/Business/Projects
git clone https://github.com/gowtham595959/school-buddy.git
cd school-buddy
git checkout feature/catchments-v2
chmod +x scripts/bootstrap-local-mac-g59.sh
./scripts/bootstrap-local-mac-g59.sh
```

**Option B — Existing repo** (e.g. you copied from Codespaces or have it in Business/):

```bash
cd /path/to/school-buddy   # wherever your repo is
git checkout feature/catchments-v2
# To move to Projects: copy the folder to Projects/, then:
cd /Users/g59/Desktop/G59_D/Business/Projects/school-buddy
chmod +x scripts/bootstrap-local-mac-g59.sh
./scripts/bootstrap-local-mac-g59.sh
```

The bootstrap will install deps and prepare the project. It will also copy any backup from `Business/school-buddy/backups/db_backup_snapshot/` if it exists.

---

## Step 3: Open in Cursor

1. Open **Cursor**
2. **File → Open Folder**
3. Select: `/Users/g59/Desktop/G59_D/Business/Projects/school-buddy`
4. Open the integrated terminal (Ctrl+`) and run:

```bash
./scripts/startup.sh
```

5. Open: **http://localhost:3000**

---

## Step 4: Full database (catchments, all schools)

If you have a backup from Codespaces or a teammate:

1. Copy the `.backup` file to:
   ```
   /Users/g59/Desktop/G59_D/Business/Projects/school-buddy/backups/db_backup_snapshot/
   ```
2. Run:
   ```bash
   ./scripts/db_restore_from_backup_snapshot.sh
   ```

**To get a backup from Codespaces before leaving:**

```bash
# In Codespaces terminal:
./scripts/zip_code_db_backup.sh   # or use your backup script
# Then download the backup and copy it to your Mac
```

Without a backup, the app runs with basic seed data (3 schools, minimal catchments).

---

## Daily workflow

| Action | Command |
|--------|---------|
| Start app | `cd .../school-buddy && ./scripts/startup.sh` |
| Stop | `Ctrl+C` or `./scripts/codespace-stop.sh` |
| Migrations | `./scripts/db_sync_azure.sh migrate` |
| Restore DB | `./scripts/db_restore_from_backup_snapshot.sh` |

---

## No Codespaces cost

Run everything locally. Cursor connects to your local folder. No GitHub Codespaces usage.
