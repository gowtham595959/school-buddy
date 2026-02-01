// gis/update_tiffin_db.js
//
// Optional script to push the Tiffin polygons into PostGIS
// (schools.postcode_geojson / catchment_geojson) for DB-based queries.
//
// For now the frontend reads GeoJSON files directly via /api/schools/catchment/tiffin.
// This script is useful if you later want all geometry in Postgres/PostGIS.
//

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../server/.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ID of Tiffin in the 'schools' table.
// Adjust if your ID is different.
const TIFFIN_ID = 1;

async function main() {
  const boundaryPath = path.join(__dirname, "tiffin_boundary.geojson");
  const individualPath = path.join(__dirname, "tiffin_individual.geojson");

  const boundary = fs.readFileSync(boundaryPath, "utf8");
  const postcodes = fs.readFileSync(individualPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE schools
      SET 
        catchment_geojson = $1::jsonb,
        postcode_geojson  = $2::jsonb
      WHERE id = $3
    `,
      [boundary, postcodes, TIFFIN_ID]
    );

    await client.query("COMMIT");
    console.log("✔ Tiffin polygons written into DB");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to update Tiffin in DB:", err);
  } finally {
    client.release();
  }
}

main().then(() => pool.end());
