# Reducing Codespaces Compute Costs

This doc explains why you may see 4+ hours billed and how to avoid it.

---

## EXACT 4.62 HR SOURCE (Diagnostics 21 Mar 2026)

### Evidence: Cursor Connection Logs

Stored in `/home/codespace/.cursor-server/data/logs/` — each folder = one connection session:

| Date (UTC) | Session Start | Notes |
|------------|---------------|-------|
| Mar 20 | 02:48 | |
| Mar 20 | 09:53 | |
| Mar 20 | 11:42 | |
| Mar 20 | 13:10 | |
| Mar 20 | 14:49 | |
| Mar 20 | 15:05 | |
| Mar 20 | 19:14 | |
| Mar 20 | 22:51 | Last session before overnight run |
| **Mar 21** | **03:18** | **Overnight session** — ~4.5 hr from last Mar 20 session |
| Mar 21 | 15:12 | Current (when you connected) |

### Most Likely Explanation for 4.62 Hours

**The Codespace ran overnight: Mar 20 22:51 UTC → Mar 21 03:18 UTC ≈ 4.5 hours**

- Last session Mar 20: **22:51** — you (or Cursor) connected
- Next session Mar 21: **03:18** — a new terminal/session was started
- **The Codespace stayed running in between** — ~4h 27m ≈ 4.5 hr

**Why it didn’t stop:**
1. **Idle timeout** — possibly 30+ min or even 4 hr
2. **Terminal output** — any running process (e.g. `npm run dev`, dev server) resets idle
3. **Cursor/browser tab left open** — keeps the Codespace “active”
4. **Restore session** — Cursor or another client may have reconnected at 03:18

### How to See Your Exact Usage (No Guessing)

1. Open **https://github.com/settings/billing**
2. Go to **Usage** / **Metered usage**
3. Click **Get usage report** → choose “Codespaces” and the date range
4. GitHub will email a CSV with per-codespace, per-day breakdown

Or in the web UI: filter by **Product: Codespaces** and **Group by: Day** (or Repository) to see when compute was used.

---

## What We Found (Diagnostics Run 21 Mar 2026)

| Finding | Details |
|--------|---------|
| **Current session** | Container started ~5 min ago when you connected — each connect = new/billing session |
| **Environment** | GitHub Codespaces (`CODESPACES=true`) |
| **Cursor** | Has `--enable-remote-auto-shutdown` (helps when you close Cursor) |
| **Docker** | `schoolbuddy-postgis` not running; does not drive Codespace billing |

---

## Why 4+ Hours Can Be Billed

### 1. **Terminal Output Resets Idle Timeout**

GitHub counts **terminal output** as activity. If you leave any of these running:

- `npm run dev` (React/Vite)
- `node server` (Node backend)
- `./scripts/startup.sh` (starts Docker, DB)

…then **every request, log line, or HMR reload** resets the idle timer. The Codespace stays "active" and keeps billing.

### 2. **Browser Tab Left Open**

If the Codespaces/Cursor tab is open in a browser, the connection can keep the Codespace alive even when you're not typing.

### 3. **Idle Timeout Setting**

- Default: 30 minutes
- Your setting might be 60–240 minutes
- Check: **GitHub → Settings → Codespaces → Default idle timeout**

### 4. **Multiple Sessions**

- Morning session: 1 hr
- Afternoon session: 2 hr  
- Evening: 1 hr  
→ ~4 hours total for the day

---

## How to Avoid High Bills

### Do This

| Action | Why |
|--------|-----|
| **Stop the Codespace when done** | Don’t leave it running; stop from GitHub UI or `gh codespace stop` |
| **Set idle timeout to 5–15 minutes** | GitHub → Settings → Codespaces → Default idle timeout = 5 or 10 min |
| **Stop dev servers before leaving** | Kill `npm run dev` and node server so terminal output stops |
| **Close Cursor/browser tab** | Helps auto-shutdown work |
| **Avoid port forwarding if not needed** | Port activity can keep the Codespace active |

### Check Your Timeout

1. GitHub → **Settings** → **Codespaces**
2. **Default idle timeout** — set to **5** or **10** minutes

---

## Quick Cost Check

- **2-core Codespace** ≈ $0.18/hour
- 4.62 hr × $0.18 ≈ **$0.83**
- 8 hr/day × 30 days × $0.18 ≈ **$43/month** if left running

---

## When You’re Done for the Day

1. Stop `npm run dev` and any node processes (Ctrl+C in terminals)
2. Close Cursor or the Codespaces browser tab
3. In GitHub: **Codespaces** → your space → **Stop**

Or use CLI: `gh codespace stop`
