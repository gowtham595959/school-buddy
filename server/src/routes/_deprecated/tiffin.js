const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/schools/:id/catchments
 * Returns all catchment polygons for a school
 */
router.get("/:id/catchments", async (req, res) => {
  const { id } = req.params;

  console.log("======= FETCHING CATCHMENTS FROM DB =======");

  try {
    const result = await pool.query(
      `
      SELECT 
        type,
        boundary_geojson
      FROM catchments
      WHERE school_id = $1
      ORDER BY type;
      `,
      [id]
    );

    return res.json({
      school_id: id,
      catchments: result.rows,
    });

  } catch (err) {
    console.error("❌ Error fetching catchments:", err);
    return res.status(500).json({ error: "Failed to fetch catchments" });
  }
});

module.exports = router;
