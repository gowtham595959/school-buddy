import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve("server/.env") });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const GEOJSON_PATH = path.resolve(
  "data/geo/bucks/bucks_rgs_swb_priority_areas.geojson"
);

// Helper: pick the first property that exists (case/underscore tolerant)
function pick(props, keys) {
  for (const k of keys) {
    if (props && Object.prototype.hasOwnProperty.call(props, k)) return props[k];
  }
  // fallback: case-insensitive match
  const lowerMap = new Map(
    Object.keys(props || {}).map((k) => [k.toLowerCase(), k])
  );
  for (const k of keys) {
    const real = lowerMap.get(String(k).toLowerCase());
    if (real) return props[real];
  }
  return undefined;
}

function getDfes(props) {
  const v = pick(props, ["ESTAB", "DFES", "estab", "dfes"]);
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function getCatchmentLabel(props) {
  const v = pick(props, ["Catchment", "CATCHMENT", "catchment", "AREA", "Area"]);
  return String(v ?? "").trim();
}

function getSchoolName(props) {
  const v = pick(props, ["School", "NAME", "name"]);
  return String(v ?? "").trim();
}

function deriveMemberCode(props) {
  const dfes = getDfes(props);
  const labelRaw = getCatchmentLabel(props);
  const label = labelRaw.toLowerCase();

  if (dfes === 5404) {
    if (label.includes("priority area a")) return "5404_priority_a";
    if (label.includes("priority area b")) return "5404_priority_b";
  }

  if (dfes === 4505) {
    // sometimes council data says "Priority Admission Area" (or similar)
    if (label.includes("priority admission")) return "4505_priority_admission";
  }

  return null;
}

async function main() {
  const raw = fs.readFileSync(GEOJSON_PATH, "utf8");
  const gj = JSON.parse(raw);

  const features = Array.isArray(gj.features) ? gj.features : [];
  if (features.length === 0) {
    console.log("No features found.");
    return;
  }

  // DEBUG: show what fields exist in the first few features
  const sample = features.slice(0, 3).map((f) => f?.properties || {});
  console.log("DEBUG sample property keys:");
  sample.forEach((p, i) => {
    console.log(`  [${i}] keys=`, Object.keys(p));
    console.log(`      ESTAB/DFES=`, pick(p, ["ESTAB", "DFES"]));
    console.log(`      Catchment=`, pick(p, ["Catchment", "CATCHMENT", "catchment"]));
    console.log(`      School/NAME=`, pick(p, ["School", "NAME"]));
  });

  const rows = [];
  for (const f of features) {
    if (!f?.geometry || !f?.properties) continue;

    const member_code = deriveMemberCode(f.properties);
    if (!member_code) continue;

    rows.push({
      geography_type: "map_bucks_polygon",
      member_code,
      name: getSchoolName(f.properties) || member_code,
      geojson: f.geometry,
      source: "bucks_priority_fix",
      dataset_version: "bucks_rgs_swb_priority_areas.geojson",
    });
  }

  // Dedup by member_code
  const byCode = new Map();
  for (const r of rows) byCode.set(r.member_code, r);
  const finalRows = [...byCode.values()];

  console.log(
    `Prepared ${finalRows.length} canonical rows from ${path.basename(GEOJSON_PATH)}`
  );

  if (finalRows.length === 0) {
    console.log("Nothing to insert. Exiting.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const r of finalRows) {
      await client.query(
        `
        INSERT INTO canonical_geometries (
          geography_type,
          member_code,
          name,
          geom,
          geojson,
          source,
          dataset_version,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)),
          $4::jsonb,
          $5,
          $6,
          now()
        )
        ON CONFLICT (geography_type, member_code)
        DO UPDATE SET
          name = EXCLUDED.name,
          geom = EXCLUDED.geom,
          geojson = EXCLUDED.geojson,
          source = EXCLUDED.source,
          dataset_version = EXCLUDED.dataset_version,
          updated_at = now()
        `,
        [
          r.geography_type,
          r.member_code,
          r.name,
          JSON.stringify(r.geojson),
          r.source,
          r.dataset_version,
        ]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Canonical geometries upserted successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to load canonical geometries:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
