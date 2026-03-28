const pool = require("../../db");

/**
 * DfE 16–18 A level cohort row per school (school_ks5_results). URN match like GCSE.
 */
async function fetchKs5ResultsForSchoolId(schoolId) {
  const id = Number(schoolId);
  if (!Number.isInteger(id) || id < 1) {
    const e = new Error("Invalid schoolId");
    e.status = 400;
    throw e;
  }

  const result = await pool.query(
    `SELECT
        k.school_id,
        k.school_urn,
        k.cohort_end_year AS year_tab,
        k.academic_year_label,
        k.school_name,
        k.la_name,
        k.version,
        k.end1618_student_count,
        k.aps_per_entry,
        k.aps_per_entry_grade,
        k.aps_per_entry_student_count,
        k.retained_percent,
        k.retained_assessed_percent,
        k.retained_student_count,
        k.value_added,
        k.value_added_upper_ci,
        k.value_added_lower_ci,
        k.progress_banding,
        k.best_three_alevels_aps,
        k.best_three_alevels_grade,
        k.best_three_alevels_student_count,
        k.aab_percent,
        k.aab_student_count,
        k.alevel_exam_entries_denominator,
        k.alevel_entries_pct_grade_astar,
        k.alevel_entries_pct_grade_astar_a,
        k.alevel_entries_pct_grade_astar_a_b,
        k.data_source_url
     FROM school_ks5_results k
     WHERE k.school_id = $1
        OR (
          k.school_id IS NULL
          AND EXISTS (
            SELECT 1 FROM schools s
            WHERE s.id = $1
              AND s.school_code IS NOT NULL
              AND TRIM(s.school_code) = TRIM(k.school_urn)
          )
        )
     ORDER BY k.cohort_end_year DESC`,
    [id]
  );

  return result.rows;
}

module.exports = {
  fetchKs5ResultsForSchoolId,
};
