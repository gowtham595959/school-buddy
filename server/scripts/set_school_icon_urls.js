#!/usr/bin/env node

import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

// Resolve path to server/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

// Load .env explicitly
dotenv.config({ path: envPath });

const DEFAULT_ICON_URL = "/icons/School_build.png";

const MAP = {
  boys_state: "/icons/school_black.png",
  girls_state: "/icons/School_red.png",
  mixed_state: "/icons/School_build.png",
};

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("DATABASE_URL not found.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const { rows } = await pool.query(`
      SELECT id, name, marker_style_key, icon_url
      FROM schools
      ORDER BY id
    `);

    let updated = 0;

    for (const row of rows) {
      const desiredIcon =
        MAP[row.marker_style_key] || DEFAULT_ICON_URL;

      if (row.icon_url === desiredIcon) continue;

      await pool.query(
        `UPDATE schools
         SET icon_url = $2
         WHERE id = $1`,
        [row.id, desiredIcon]
      );

      console.log(`Updated: ${row.name} -> ${desiredIcon}`);
      updated++;
    }

    console.log(`\nDone. Updated ${updated} rows.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
