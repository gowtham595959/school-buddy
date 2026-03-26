# Codespaces Usage & Optimization Guide

## 1. Your Usage Analysis (Last 2 Weeks – Mar 6–20, 2026)

### Daily Compute Hours (2-core machine)

| Date | Compute hrs | Gross $ | Billed $ | Notes |
|------|-------------|---------|----------|-------|
| Mar 6 | — | $1.90 | $0 | Cursor connected |
| Mar 7 | — | $3.93 | $0 | |
| Mar 8 | — | $2.88 | $0 | |
| Mar 9 | 11.04 | $2.00 | $1.26 | |
| Mar 10 | 20.35 | $3.68 | $3.66 | **~24 hr day** |
| Mar 11 | 5.31 | $0.97 | $0.96 | |
| Mar 12–14 | 0 | $0.01 | $0 | Codespace stopped |
| Mar 15 | 3.15 | $0.66 | $0.57 | |
| Mar 16 | 23.99 | $4.33 | $4.32 | **~24 hr day** |
| Mar 17 | 23.59 | $4.26 | $4.25 | **~24 hr day** |
| Mar 18 | 7.18 | $1.30 | $1.29 | |
| Mar 19 | 8.33 | $1.54 | $1.50 | |
| Mar 20 | 4.42 | $0.80 | $0.80 | |

**Total Mar 6–20:** ~104 compute hours ≈ **208 core hours**

### Free Tier Limits (Personal Account)

| Plan | Core hours/mo | 2-core runtime | Storage |
|------|---------------|----------------|---------|
| GitHub Free | 120 | ~60 hrs | 15 GB-month |
| GitHub Pro | 180 | ~90 hrs | 20 GB-month |

**You exceeded the free tier in ~8 days** (Mar 9–10 alone ≈ 62 core hours).

---

## 2. Why Cursor Keeps the Codespace Running

GitHub defines inactivity as: no typing, no mouse, **no terminal input or output**.

Cursor and dev servers can reset the idle timer because:
- Cursor sends background activity (AI, indexing, extensions)
- `npm run dev` / React / Node produce terminal output
- File watchers and language servers keep processes active

Result: the 30-minute idle timeout rarely triggers, so the Codespace stays active.

---

## 3. Azure & GitHub Billing

| Scenario | Where Codespaces are billed |
|----------|-----------------------------|
| **Personal account** | GitHub (card on file) |
| **Org with Azure subscription** | Azure invoice (Codespaces charges appear there) |

If your Codespaces bill appears under GitHub billing, Azure is not involved. Azure is only used when an Azure subscription is connected to a GitHub **organization** for billing.

---

## 4. Action Plan: Stay Within Free Tier

### A. Before You Start Coding

1. **Set idle timeout to 5 minutes**
   - GitHub → Settings → Codespaces → Default idle timeout → **5 minutes**
   - [Direct link](https://github.com/settings/codespaces)

2. **Set a spending limit**
   - GitHub → Settings → Billing → Spending limits → Codespaces
   - Set to **$0** to block overages, or a small cap (e.g. $5)

3. **Check for prebuilds**
   - Repo → Settings → Codespaces → remove prebuild configs if not needed
   - Prebuilds use storage even when no Codespace is running

### B. While Coding (Cursor)

1. **Stop dev servers when idle**
   - `Ctrl+C` in the terminal running `npm run dev` / `npm start`
   - Restart only when you need to test

2. **Use only Cursor**
   - Do not open the Codespace in the browser (VS Code)
   - Close any existing browser tabs for this Codespace

3. **Close Cursor when done**
   - Closing Cursor helps the Codespace go idle sooner

### C. When You Finish

1. **Run the stop script** (recommended)
   ```bash
   ./scripts/old/codespace-stop.sh
   ```
   This stops frontend + backend (ports 3000, 5050) and then stops the Codespace.

2. **Or stop manually**
   - GitHub → [github.com/codespaces](https://github.com/codespaces) → ⋮ → **Stop**
   - Or: Command Palette → `Codespaces: Stop Current Codespace`

3. **Do not rely on idle timeout**
   - Manually stop so compute stops immediately

4. **Delete old Codespaces**
   - GitHub → Codespaces → delete Codespaces you no longer need
   - Reduces storage usage over time

### D. Weekly Check

1. **Usage**
   - [github.com/settings/billing](https://github.com/settings/billing) → Codespaces
   - Track compute and storage vs free tier

2. **Quick process check**
   ```bash
   ps aux | grep -E "vscode|code-server" | grep -v grep
   ```
   - If you see VS Code processes, run: `pkill -f "vscode-remote|code-server"`

---

## 5. Target: Stay Within 60 Hours/Month (Free, 2-core)

| Action | Approx. savings |
|--------|------------------|
| Idle timeout 5 min | Large (Codespace stops quickly when idle) |
| Stop dev servers when not testing | Medium |
| Manually stop when done | Large |
| No browser + Cursor at same time | ~200MB RAM, fewer connections |
| Close Cursor when not coding | Medium |

**Rough target:** ~2 hours/day × 20 working days ≈ 40 hours/month → within free tier.

---

## 6. Start / Stop Workflow

### When you finish (stop everything)
```bash
./scripts/old/codespace-stop.sh
```
Stops backend, frontend, and the Codespace.

### When you come back (start everything)
1. **Start the Codespace:** Connect via Cursor (Remote-SSH) or VS Code. Selecting your Codespace will start it if stopped.
2. **Start services:** Run `./scripts/startup.sh`

---

## 7. Hourly Auto-Stop

When you run `./scripts/startup.sh`, a background script starts that runs `scripts/old/codespace-stop.sh` at each :00 (top of every hour). No cron needed.

### Worst that can happen if it stops while you're working

| Scenario | Impact |
|----------|--------|
| **Unsaved file** | Lost – save often (Cmd+S) |
| **Mid-edit** | Cursor disconnects, you reconnect and reopen |
| **Mid-git commit** | Interrupted – may need to re-run `git add` / `git commit` |
| **Database migration** | Risk of corruption – avoid migrations near :00 |
| **Deploy script** | Interrupted – re-run when back |
| **Cursor Composer/AI** | Partial changes may be applied – review before :00 |

### To disable
Don't run `startup.sh`, or run services manually (e.g. `codeRestart.sh`). The hourly script only starts when you run `startup.sh`.

### Timezone
Uses Codespace clock (typically UTC). :00 = midnight UTC, 01:00 = 1am UTC, etc.

---

## 8. Quick Reference Links

| What | Link |
|------|------|
| Codespaces list | https://github.com/codespaces |
| Billing & usage | https://github.com/settings/billing |
| Idle timeout | https://github.com/settings/codespaces |
| Spending limits | https://github.com/settings/billing/spending_limit |
