// server/src/routes/user.js

const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * GET /api/user/home
 */
router.get("/home", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT home_postcode, home_lat, home_lon
      FROM user_profile
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      return res.json({
        home_postcode: null,
        home_lat: null,
        home_lon: null,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error loading home:", err);
    res.status(500).json({ error: "Failed to load home" });
  }
});

/**
 * POST /api/user/home
 */
router.post("/home", async (req, res) => {
  const { home_postcode, home_lat, home_lon } = req.body;

  try {
    await pool.query("DELETE FROM user_profile");

    await pool.query(
      `
      INSERT INTO user_profile (home_postcode, home_lat, home_lon)
      VALUES ($1, $2, $3)
      `,
      [home_postcode, home_lat, home_lon]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save home:", err);
    res.status(500).json({ error: "Failed to save home" });
  }
});

module.exports = router;
