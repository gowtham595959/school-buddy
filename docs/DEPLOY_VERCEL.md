# Deploying School Buddy to Vercel (Hobby Tier)

This guide covers deploying the full stack to production entirely on free tiers.

| Layer    | Technology           | Host            | Cost |
|----------|----------------------|-----------------|------|
| Frontend | React (CRA)          | Vercel Hobby    | Free |
| Backend  | Node.js / Express    | Vercel Hobby    | Free |
| Database | PostgreSQL + PostGIS | Supabase Free   | Free |

The backend and frontend are deployed as **two separate Vercel projects**. The frontend uses a Vercel rewrite rule to proxy `/api/*` calls to the backend, so no frontend source code changes are needed.

### Vercel Hobby tier limits (what matters for this project)

| Limit | Hobby value | This project |
|---|---|---|
| Serverless function timeout | **10 seconds** | ✅ Safe — transport route now runs all 4 Google API calls in parallel (~1–2 s total) |
| Bandwidth | 100 GB / month | ✅ Well within range |
| Serverless invocations | 100 GB-hrs / month | ✅ Well within range |
| Projects | Unlimited | ✅ |
| Custom domains | Supported | ✅ |

> The transport route was the only risk. It previously made 4 Google Maps API calls **sequentially** (up to ~8 s). It has been refactored to run them with `Promise.all` in parallel, bringing the total to ~1–2 s.

---

## Prerequisites

- [Vercel account](https://vercel.com/signup) (free)
- [Supabase account](https://supabase.com) (free)
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- Git repo pushed to GitHub (required for Vercel deployment)

---

## Step 1 — Set up the Database on Supabase

Supabase provides managed PostgreSQL with PostGIS pre-installed, which this project requires.

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your users (e.g. **London** for UK schools data).
3. Set a strong database password and save it.
4. Once the project is ready, open the **SQL Editor** (left sidebar).

### Run the schema

Paste and run `db/init.sql` in the SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS schools CASCADE;
CREATE TABLE schools (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    lat  DOUBLE PRECISION NOT NULL,
    lon  DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326)
);

DROP TABLE IF EXISTS catchments CASCADE;
CREATE TABLE catchments (
    id        SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    radius_m  INTEGER NOT NULL
);

DROP TABLE IF EXISTS postcodes CASCADE;
CREATE TABLE postcodes (
    id   SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS postcodes_geom_idx ON postcodes USING GIST (geom);
```

### Run the seed data

Paste and run `db/seed.sql` in the SQL Editor:

```sql
INSERT INTO schools (name, lat, lon) VALUES
  ('Tiffin Girls', 51.4172, -0.2928),
  ('Nonsuch',      51.355417, -0.223868),
  ('Wallington',   51.348,    -0.1488)
ON CONFLICT (name) DO NOTHING;

UPDATE schools
SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
WHERE geom IS NULL;

INSERT INTO catchments (school_id, radius_m)
SELECT id, 5250 FROM schools WHERE name = 'Nonsuch'
ON CONFLICT DO NOTHING;

INSERT INTO catchments (school_id, radius_m)
SELECT id, 6700 FROM schools WHERE name = 'Wallington'
ON CONFLICT DO NOTHING;
```

### Get the connection string

1. Go to **Project Settings → Database → Connection string → URI**.
2. Copy the **URI** — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
3. Save this — you will need it in Step 2.

> **Note:** If you have additional postcode polygon data (for Tiffin Girls catchment), load it into the `postcodes` table using your preferred PostgreSQL client (e.g. DBeaver, TablePlus, or `psql`) connected to the Supabase connection string.

---

## Step 2 — Deploy the Backend

The backend is a standard Express app. Vercel runs it as a serverless Node function.

### Add `vercel.json` to the server folder

Create `server/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

### Deploy

```bash
cd server
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name** → `school-buddy-api` (or any name)
- **In which directory is your code located?** → `./` (current directory)

When asked about environment variables, or after deployment, go to the Vercel dashboard for this project → **Settings → Environment Variables** and add:

| Name           | Value                                                     |
|----------------|-----------------------------------------------------------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres` |

Then redeploy to apply the variable:

```bash
vercel --prod
```

Your backend will be live at a URL like:
```
https://school-buddy-api.vercel.app
```

Verify it works by visiting:
```
https://school-buddy-api.vercel.app/api/health
```

---

## Step 3 — Deploy the Frontend

The frontend is a Create React App project. A `vercel.json` rewrite rule is used to forward `/api/*` requests to the live backend, so no code changes are needed.

### Add `vercel.json` to the client folder

Create `client/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://school-buddy-api.vercel.app/api/:path*"
    }
  ]
}
```

> Replace `https://school-buddy-api.vercel.app` with your actual backend URL from Step 2.

### Deploy

```bash
cd client
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Project name** → `school-buddy` (or any name)
- **In which directory is your code located?** → `./`
- **Want to override the build settings?** → No (Vercel auto-detects CRA)

Then deploy to production:

```bash
vercel --prod
```

Your frontend will be live at a URL like:
```
https://school-buddy.vercel.app
```

---

## Step 4 — Verify the Deployment

Open your frontend URL and check:

- [ ] The map loads
- [ ] Schools appear as markers
- [ ] Postcode search (geocoding) works
- [ ] Catchment check returns results
- [ ] Transport route works

If anything fails, check the **Vercel dashboard → Functions → Logs** for the backend project to see errors.

---

## Environment Variables Reference

### Backend (`server/`) — set in Vercel dashboard

| Variable       | Description                        | Example                                                |
|----------------|------------------------------------|--------------------------------------------------------|
| `DATABASE_URL` | Supabase PostgreSQL connection URI | `postgresql://postgres:pass@db.abc.supabase.co:5432/postgres` |

### Frontend (`client/`) — no env vars required

The `/api` proxy is handled by `vercel.json` rewrites, so no `REACT_APP_*` variables are needed.

---

## Re-deploying After Code Changes

After pushing changes to GitHub, redeploy with:

```bash
# Backend changes
cd server && vercel --prod

# Frontend changes
cd client && vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard to enable **automatic deployments on push**.

---

## Troubleshooting

**`DATABASE_URL not set` warning in backend logs**
→ Go to Vercel dashboard → your backend project → Settings → Environment Variables → add `DATABASE_URL` and redeploy.

**Frontend shows blank map or API errors**
→ Check that the `destination` URL in `client/vercel.json` matches your backend's Vercel URL exactly.

**PostGIS extension error on Supabase**
→ Supabase has PostGIS pre-installed, but you must run `CREATE EXTENSION IF NOT EXISTS postgis;` first (included in `db/init.sql`).

**Serverless function timeout**
→ The transport route now uses `Promise.all` to fetch all 4 travel modes in parallel and should complete in ~1–2 s. If you add new routes that make multiple external API calls, use `Promise.all` rather than sequential `await` in a loop.
