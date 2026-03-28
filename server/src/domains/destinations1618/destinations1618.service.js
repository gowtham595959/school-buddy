const pool = require("../../db");

/**
 * DfE 16–18 destination measures (school_1618_destinations). URN match like GCSE/KS5.
 */
async function fetchDestinations1618ForSchoolId(schoolId) {
  const id = Number(schoolId);
  if (!Number.isInteger(id) || id < 1) {
    const e = new Error("Invalid schoolId");
    e.status = 400;
    throw e;
  }

  const result = await pool.query(
    `SELECT
        d.school_id,
        d.school_urn,
        d.cohort_end_year AS year_tab,
        d.academic_year_label,
        d.time_period,
        d.school_name,
        d.la_name,
        d.version,
        d.qualification_breakdown,
        d.leavers_student_count,
        d.pct_overall,
        d.pct_education,
        d.pct_he,
        d.pct_fe,
        d.pct_other_education,
        d.pct_apprenticeship,
        d.pct_employment,
        d.pct_not_sustained,
        d.pct_unknown,
        d.data_source_url
     FROM school_1618_destinations d
     WHERE d.school_id = $1
        OR (
          d.school_id IS NULL
          AND EXISTS (
            SELECT 1 FROM schools s
            WHERE s.id = $1
              AND s.school_code IS NOT NULL
              AND TRIM(s.school_code) = TRIM(d.school_urn)
          )
        )
     ORDER BY d.cohort_end_year DESC`,
    [id]
  );

  return result.rows;
}

module.exports = {
  fetchDestinations1618ForSchoolId,
};
