// server/src/db.js

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Immediately attempt a connection
pool.connect()
  .then(() => console.log("✅ Connected to DB..."))
  .catch(err => console.error("❌ DB connection error:", err));

module.exports = pool;
