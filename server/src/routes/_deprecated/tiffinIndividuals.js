const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/individuals", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        postcode,
        ST_Y(geom) AS lat,
        ST_X(geom) AS lon
      FROM tiffin_individuals
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error loading tiffin individuals:", err);
    res.status(500).json({ error: "Failed to load individual points" });
  }
});

module.exports = router;
