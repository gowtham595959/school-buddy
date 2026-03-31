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

/**
 * LA allocation profile history (e.g. Bucks grammar allocation XLSX), joined to schools for URN/name.
 */
async function listAllocationHistoryBySchoolId(schoolId) {
  const { rows } = await db.query(
    `
    SELECT
      h.id,
      h.school_id,
      h.entry_year,
      h.school_urn,
      h.la_slug,
      h.round_order,
      h.round_code,
      h.round_label,
      h.profile_heading,
      h.line_items,
      h.data_source_url,
      h.statistics_page_url,
      h.updated_at,
      s.name AS school_name,
      s.school_code AS school_urn_live
    FROM admissions_allocation_history h
    JOIN schools s ON s.id = h.school_id
    WHERE h.school_id = $1
    ORDER BY h.entry_year DESC, h.round_order ASC, h.round_code ASC
    `,
    [schoolId]
  );
  return rows;
}

module.exports = {
  listPoliciesBySchoolId,
  listAllocationHistoryBySchoolId,
};
