// server/src/domains/schoolSubjects/schoolSubjects.service.js
const pool = require("../../db");

/**
 * KS4 and 16–18 subject entry lines (DfE-style). A level block first, then GCSE;
 * within each block, highest entry counts first.
 */
async function fetchSchoolSubjectsForSchoolId(schoolId) {
  const sid = Number(schoolId);
  if (Number.isNaN(sid)) {
    const err = new Error("Invalid schoolId");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      school_id,
      school_name,
      school_urn,
      sort_order,
      level,
      subject_name,
      qualification,
      entries,
      notes,
      data_source_url,
      source_tier,
      source_urls
    FROM school_subjects
    WHERE school_id = $1
    ORDER BY CASE WHEN level = 'alevel' THEN 0 ELSE 1 END,
             entries DESC NULLS LAST,
             subject_name ASC NULLS LAST,
             id ASC
    `,
    [sid]
  );

  return rows;
}

module.exports = {
  fetchSchoolSubjectsForSchoolId,
};
