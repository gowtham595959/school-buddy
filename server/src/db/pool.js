// server/src/db.js
//
// Centralised PostgreSQL connection using pg.Pool.
// This module is imported by route files (e.g. routes/schools.js)
// so that all DB access uses a single shared pool.
//
// It reads DATABASE_URL from server/.env, e.g.:
//   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolmap

const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from server/.env
dotenv.config({
  path: path.join(__dirname, "../.env"), // resolves to server/.env
});

// Connection string to Postgres
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[DB] WARNING: DATABASE_URL not set. Check server/.env if DB fails."
  );
}

// Create a connection pool. This will automatically open connections
// to Postgres as queries are made.
const pool = new Pool({
  connectionString,
  // You can tune max connections if needed, e.g.:
  // max: 10,
});

// If a pooled client errors while idle, log it so it's visible.
pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err);
});

module.exports = pool;
