// server/src/domains/schools/schools.service.js

const pool = require("../../db");

/**
 * fetchAllSchools
 * - DB-driven
 * - No business logic
 * - Used by map + eligibility layers
 */
async function fetchAllSchools() {
  const result = await pool.query(`
    SELECT
      id,
      name,
      lat,
      lon,
      radius_km,
      show_radius,
      show_polygon
    FROM schools
    ORDER BY name
  `);

  return result.rows;
}

module.exports = {
  fetchAllSchools,
};
