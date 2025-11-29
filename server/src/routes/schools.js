// server/src/routes/schools.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Same list used in Python to load postcodes
const TIFFIN_POSTCODES = [
  "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10","KT12","KT13","KT17","KT19",
  "TW1","TW2","TW3","TW4","TW5","TW7","TW8","TW9","TW10","TW11","TW12","TW13","TW14","TW15","TW16","TW17",
  "SW13","SW14","SW15","SW17","SW18","SW19","SW20",
  "W3","W4","W5","W7","W13","SM4","CR4"
];

// GET /api/schools  -> list all schools
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, lat, lon FROM schools ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schools', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/schools/catchment/:id
router.get('/catchment/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid school id' });
  }

  try {
    // 1) Get school
    const schoolResult = await pool.query(
      'SELECT id, name, lat, lon FROM schools WHERE id = $1',
      [id]
    );
    if (schoolResult.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    const school = schoolResult.rows[0];

    // 2) Special case: Tiffin uses postcode polygons
    if (school.name === 'Tiffin Girls') {
      // individual polygons
      const polyResult = await pool.query(
        `
          SELECT code, ST_AsGeoJSON(geom) AS geojson
          FROM postcodes
          WHERE code = ANY($1::text[])
          ORDER BY code
        `,
        [TIFFIN_POSTCODES]
      );

      // merged catchment
      const mergedResult = await pool.query(
        `
          SELECT ST_AsGeoJSON(ST_Union(geom)) AS geojson
          FROM postcodes
          WHERE code = ANY($1::text[])
        `,
        [TIFFIN_POSTCODES]
      );

      const merged = mergedResult.rows[0]?.geojson || null;

      return res.json({
        type: 'tiffin',
        school,
        merged,
        polygons: polyResult.rows,   // [{ code, geojson }, ...]
      });
    }

    // 3) Radius-based catchment (Nonsuch, Wallington)
    const radiusResult = await pool.query(
      'SELECT radius_m FROM catchments WHERE school_id = $1',
      [id]
    );

    if (radiusResult.rows.length === 0) {
      // no radius defined
      return res.json({
        type: 'none',
        school,
      });
    }

    return res.json({
      type: 'radius',
      school,
      radius_m: radiusResult.rows[0].radius_m,
    });
  } catch (err) {
    console.error('Error fetching catchment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
