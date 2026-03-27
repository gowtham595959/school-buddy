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
      display_name,
      lat,
      lon,
      radius_km,
      show_radius,
      show_polygon,
      has_catchment,
      catchment_category,
      icon_url,
      marker_style_key,
      website,
      phone,
      email,
      address,
      local_authority,
      council_name,
      school_type,
      gender_type,
      phase,
      age_range,
      boarding_type,
      religious_affiliation,
      selectivity_type,
      school_code,
      top_school,
      fees,
      fees_notes,
      has_results_gcse,
      has_results_alevel
    FROM schools
    ORDER BY name
  `);

  return result.rows;
}

module.exports = {
  fetchAllSchools,
};
