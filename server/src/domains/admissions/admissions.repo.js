// server/src/domains/admissions/admissions.repo.js
const db = require("../../db");

/**
 * Full admissions_policies rows for a school (exam panel + catchment intake fields).
 */
async function listPoliciesBySchoolId(schoolId) {
  const { rows } = await db.query(
    `
    SELECT *
    FROM admissions_policies
    WHERE school_id = $1
    ORDER BY entry_year DESC NULLS LAST
    `,
    [schoolId]
  );
  return rows;
}

module.exports = {
  listPoliciesBySchoolId,
};
