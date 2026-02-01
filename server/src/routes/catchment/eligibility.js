// server/src/routes/catchment/eligibility.js

const express = require("express");
const pool = require("../../db"); // ✅ FIXED PATH (was ../db before)
const router = express.Router();

/**
 * POST /api/catchment-check
 *
 * Body:
 * {
 *   home_lat: number,
 *   home_lon: number
 * }
 *
 * Returns factual spatial results only.
 */
router.post("/", async (req, res) => {
  const { home_lat, home_lon } = req.body;

  if (typeof home_lat !== "number" || typeof home_lon !== "number") {
    return res.status(400).json({
      error: "home_lat and home_lon must be numbers",
    });
  }

  try {
    // Home point as geography-safe WKT
    const homePoint = `SRID=4326;POINT(${home_lon} ${home_lat})`;

    // -------------------------------
    // 1️⃣ Radius-based schools
    // -------------------------------
    const radiusQuery = `
      SELECT
        s.id AS school_id,
        s.name,
        'radius' AS catchment_type,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326)::geography,
          ST_GeogFromText($1)
        ) / 1000 AS distance_km,
        ST_DWithin(
          ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326)::geography,
          ST_GeogFromText($1),
          s.radius_km * 1000
        ) AS inside_catchment
      FROM schools s
      WHERE s.catchment_type = 'radius'
        AND s.radius_km IS NOT NULL;
    `;

    // -------------------------------
    // 2️⃣ Polygon-based schools (aggregated)
    // -------------------------------
    const polygonQuery = `
      SELECT
        s.id AS school_id,
        s.name,
        'polygon' AS catchment_type,
        BOOL_OR(
          ST_Contains(
            c.boundary_geom,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)
          )
        ) AS inside_catchment
      FROM schools s
      JOIN catchments c
        ON c.school_id = s.id
      WHERE s.catchment_type = 'polygon'
        AND c.active = true
      GROUP BY s.id, s.name;
    `;

    const [radiusResult, polygonResult] = await Promise.all([
      pool.query(radiusQuery, [homePoint]),
      pool.query(polygonQuery, [home_lat, home_lon]),
    ]);

    res.json({
      home: {
        lat: home_lat,
        lon: home_lon,
      },
      results: [...radiusResult.rows, ...polygonResult.rows],
    });
  } catch (err) {
    console.error("❌ Catchment check failed:", err);
    res.status(500).json({
      error: "Catchment check failed",
    });
  }
});

module.exports = router;
