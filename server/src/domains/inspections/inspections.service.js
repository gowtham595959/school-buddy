// server/src/domains/inspections/inspections.service.js
const pool = require("../../db");

async function fetchInspectionsForSchoolId(schoolId) {
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
      inspection_date,
      inspection_body,
      overall_grade,
      report_url,
      establishment_url
    FROM inspections
    WHERE school_id = $1
    ORDER BY inspection_date DESC NULLS LAST, id DESC
    `,
    [sid]
  );
  return rows;
}

module.exports = {
  fetchInspectionsForSchoolId,
};
