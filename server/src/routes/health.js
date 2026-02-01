// server/src/routes/health.js

const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/health
 * - Confirms API is running
 * - Confirms DB connectivity
 * - Non-breaking, additive endpoint
 */
router.get("/", async (req, res) => {
  try {
    // quick DB probe
    await pool.query("SELECT 1 AS ok");

    return res.json({
      ok: true,
      api: "up",
      db: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Health check DB failed:", err.message);
    return res.status(503).json({
      ok: false,
      api: "up",
      db: "down",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
