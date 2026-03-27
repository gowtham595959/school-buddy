const pool = require("../../db");

/**
 * GCSE headline metrics (DfE KS4) for a school: prefer school_gcse_results.school_id,
 * fall back to URN match if school_id not set.
 */
async function fetchGcseResultsForSchoolId(schoolId) {
  const id = Number(schoolId);
  if (!Number.isInteger(id) || id < 1) {
    const e = new Error("Invalid schoolId");
    e.status = 400;
    throw e;
  }

  const result = await pool.query(
    `SELECT
        g.school_id,
        g.school_urn,
        g.cohort_end_year AS year_tab,
        g.academic_year_label,
        g.school_name,
        g.la_name,
        g.version,
        g.pupil_count,
        g.attainment8_average,
        g.progress8_average,
        g.progress8_lower_95_ci,
        g.progress8_upper_95_ci,
        g.engmath_95_percent,
        g.engmath_94_percent,
        g.engmath_7_plus_percent,
        g.gcse_91_percent,
        g.ebacc_entering_percent,
        g.ebacc_aps_average,
        g.gcse_five_engmath_percent,
        g.gcse_exam_entries_denominator,
        g.gcse_entries_pct_grade_9,
        g.gcse_entries_pct_grade_8_9,
        g.gcse_entries_pct_grade_7_9,
        g.gcse_entries_pct_grade_6_9,
        g.data_source_url
     FROM school_gcse_results g
     WHERE g.school_id = $1
        OR (
          g.school_id IS NULL
          AND EXISTS (
            SELECT 1 FROM schools s
            WHERE s.id = $1
              AND s.school_code IS NOT NULL
              AND TRIM(s.school_code) = TRIM(g.school_urn)
          )
        )
     ORDER BY g.cohort_end_year DESC`,
    [id]
  );

  return result.rows;
}

module.exports = {
  fetchGcseResultsForSchoolId,
};
