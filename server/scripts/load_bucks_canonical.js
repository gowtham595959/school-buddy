#!/usr/bin/env node
/**
 * Minimal, safe loader for Buckinghamshire polygons into canonical_geometries.
 *
 * Core principles:
 * - Only adds what's necessary (no app logic changes).
 * - Isolated via new geography_type: 'map_bucks_polygon'.
 * - Deterministic keys from GeoJSON stable IDs (no fuzzy matching).
 * - Upserts only within (geography_type, member_code) for Bucks.
 * - Priority areas: load ONLY Area A / Area B (skip anything else).
 *
 * Inputs:
 *  - data/geo/bucks/bucks_grammar_boys_2026.geojson
 *  - data/geo/bucks/bucks_grammar_girls_2026.geojson
 *  - data/geo/bucks/buckinghamshire_priority_areas.geojson
 *
 * Output:
 *  canonical_geometries rows with:
 *   geography_type = 'map_bucks_polygon'
 *   member_code:
 *     boys:     <DFES>_boys
 *     girls:    <DFES>_girls
 *     priority: <ESTAB>_priority_a | <ESTAB>_priority_b
 *
 * SRID: 4326 (matches existing canonical_geometries data)
 *
 * IMPORTANT FIX:
 *  canonical_geometries.geom is typed as MULTIPOLYGON in this DB.
 *  Some GeoJSON features are Polygon, so we wrap with ST_Multi(...)
 *  to ensure type matches (Polygon -> MultiPolygon, MultiPolygon unchanged).
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env (same convention as other server/scripts)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not found in server/.env");
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BOYS = path.join(PROJECT_ROOT, "data/geo/bucks/bucks_grammar_boys_2026.geojson");
const GIRLS = path.join(PROJECT_ROOT, "data/geo/bucks/bucks_grammar_girls_2026.geojson");
const PRIORITY = path.join(PROJECT_ROOT, "data/geo/bucks/buckinghamshire_priority_areas.geojson");

const GEOGRAPHY_TYPE = "map_bucks_polygon";
const SRID = 4326;

function readGeojsonFeatures(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  const features = Array.isArray(json?.features) ? json.features : [];
  return features.filter((f) => f && f.type === "Feature" && f.geometry);
}

function normText(x) {
  return String(x ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Only accept Area A / Area B (skip unknown labels).
 * Examples seen: "Catchment Area A", "Catchment Area B"
 */
function priorityTagFromCatchmentLabel(labelRaw) {
  const label = normText(labelRaw).toLowerCase();
  if (label.includes("area a")) return "priority_a";
  if (label.includes("area b")) return "priority_b";
  return null; // strict: skip anything else
}

function buildRows() {
  const rows = [];

  // Boys grammar polygons
  for (const f of readGeojsonFeatures(BOYS)) {
    const p = f.properties || {};
    const dfes = p.DFES;
    const name = normText(p.NAME);
    if (!dfes || !name) continue;

    rows.push({
      geography_type: GEOGRAPHY_TYPE,
      member_code: `${dfes}_boys`,
      name,
      geom_geojson: f.geometry,
      source: "bucks_arcgis",
      dataset_version: "bucks_grammar_boys_2026",
    });
  }

  // Girls grammar polygons
  for (const f of readGeojsonFeatures(GIRLS)) {
    const p = f.properties || {};
    const dfes = p.DFES;
    const name = normText(p.NAME);
    if (!dfes || !name) continue;

    rows.push({
      geography_type: GEOGRAPHY_TYPE,
      member_code: `${dfes}_girls`,
      name,
      geom_geojson: f.geometry,
      source: "bucks_arcgis",
      dataset_version: "bucks_grammar_girls_2026",
    });
  }

  // Priority areas (strictly only A/B)
  for (const f of readGeojsonFeatures(PRIORITY)) {
    const p = f.properties || {};
    const estab = p.ESTAB;
    const school = normText(p.School);
    const catchment = p.Catchment;

    if (!estab || !school || !catchment) continue;

    const tag = priorityTagFromCatchmentLabel(catchment);
    if (!tag) continue; // strict: only A/B

    rows.push({
      geography_type: GEOGRAPHY_TYPE,
      member_code: `${estab}_${tag}`,
      name: school,
      geom_geojson: f.geometry,
      source: "bucks_arcgis",
      dataset_version: "bucks_priority_areas_2026",
    });
  }

  // De-dupe by (geography_type, member_code) - last write wins
  const m = new Map();
  for (const r of rows) {
    m.set(`${r.geography_type}::${r.member_code}`, r);
  }

  return Array.from(m.values()).sort((a, b) => a.member_code.localeCompare(b.member_code));
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL });

  const rows = buildRows();
  console.log(`Prepared ${rows.length} canonical rows for geography_type='${GEOGRAPHY_TYPE}'`);

  const sql = `
    WITH x AS (
      SELECT *
      FROM jsonb_to_recordset($1::jsonb)
      AS x(
        geography_type text,
        member_code text,
        name text,
        geom_geojson jsonb,
        source text,
        dataset_version text
      )
    )
    INSERT INTO canonical_geometries (
      geography_type,
      member_code,
      name,
      geom,
      source,
      dataset_version,
      updated_at
    )
    SELECT
      x.geography_type,
      x.member_code,
      x.name,
      ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(x.geom_geojson::text), ${SRID})) AS geom,
      x.source,
      x.dataset_version,
      now()
    FROM x
    ON CONFLICT (geography_type, member_code)
    DO UPDATE SET
      name = EXCLUDED.name,
      geom = EXCLUDED.geom,
      source = EXCLUDED.source,
      dataset_version = EXCLUDED.dataset_version,
      updated_at = now()
    ;
  `;

  try {
    await pool.query("BEGIN");
    await pool.query(sql, [JSON.stringify(rows)]);
    await pool.query("COMMIT");
    console.log("✅ canonical_geometries upsert complete.");
  } catch (e) {
    await pool.query("ROLLBACK");
    console.error("❌ Failed to load canonical geometries:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
