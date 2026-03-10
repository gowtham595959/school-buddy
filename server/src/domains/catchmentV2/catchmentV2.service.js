// server/src/domains/catchmentV2/catchmentV2.service.js
const {
  getSchoolById,
  getActiveDefinitions,
  getGeometriesByHash,
  getAnyGeometryHashForKey,
} = require("./catchmentV2.repo");

const { GEOMETRY_KIND, GEOMETRY_STATUS } = require("./catchmentV2.types");

function safeJson(value, fallback) {
  if (value == null) return fallback;
  return value;
}

/**
 * Core read-only service:
 * - never rebuilds geometry
 * - returns definitions ordered by priority
 * - attaches cached geometry if present
 * - geometry_status:
 *    - ready  => geometry exists for current members_hash
 *    - stale  => geometry exists for this key, but for a different hash
 *    - missing=> no geometry exists at all for this key
 */
async function getCatchmentsV2ForSchool(schoolId) {
  const school = await getSchoolById(schoolId);
  if (!school) {
    return {
      school: null,
      definitions: [],
      message: `School not found: ${schoolId}`,
    };
  }

  const hasCatchment = !!school.has_catchment;
  const category = school.catchment_category || null;

  // If no catchments or "open", return empty designated layers
  if (!hasCatchment || category === "open") {
    return {
      school,
      definitions: [],
      note: "No designated catchments for this school (has_catchment=false or category=open).",
    };
  }

  const definitions = await getActiveDefinitions(schoolId);

  const enriched = [];
  for (const d of definitions) {
    const def = {
      id: d.id,
      school_id: d.school_id,
      school_name: d.school_name,
      catchment_priority: d.catchment_priority,
      catchment_key: d.catchment_key,
      catchment_year: d.catchment_year,
      catchment_alloc_seats: d.catchment_alloc_seats,
      catchment_active: d.catchment_active,
      geography_type: d.geography_type,
      radius: d.radius,
      radius_unit: d.radius_unit,
      members: safeJson(d.members, []),
      members_hash: d.members_hash || null,
      geojson_built_at: d.geojson_built_at || null,
      style: safeJson(d.style, {}),
      updated_at: d.updated_at || null,

      geometry_status: null,
      geometries: {
        merged: null,
        individuals: [],
      },
    };

    // Radius is drawn dynamically (circle) and has no cached geojson
    if (def.geography_type === "radius") {
      // We treat radius as "ready" as long as radius+unit exist.
      def.geometry_status =
        def.radius != null && def.radius_unit ? GEOMETRY_STATUS.READY : GEOMETRY_STATUS.MISSING;
      enriched.push(def);
      continue;
    }

    // Non-radius: need members_hash to lookup cached geometries
    if (!def.members_hash) {
      def.geometry_status = GEOMETRY_STATUS.MISSING;
      enriched.push(def);
      continue;
    }

    const rows = await getGeometriesByHash(schoolId, def.catchment_key, def.members_hash);

    const mergedRow = rows.find((r) => r.geometry_kind === GEOMETRY_KIND.MERGED);
    const individualRows = rows.filter((r) => r.geometry_kind === GEOMETRY_KIND.INDIVIDUAL);

    // No geometry for current hash => missing or stale
    if (!mergedRow && individualRows.length === 0) {
      const anyHash = await getAnyGeometryHashForKey(schoolId, def.catchment_key);
      def.geometry_status = anyHash ? GEOMETRY_STATUS.STALE : GEOMETRY_STATUS.MISSING;
      enriched.push(def);
      continue;
    }

    // Geometry exists for current hash => ready
    def.geometry_status = GEOMETRY_STATUS.READY;

    def.geometries.merged = mergedRow
      ? {
          geometry_kind: mergedRow.geometry_kind,
          built_from_members_hash: mergedRow.built_from_members_hash,
          geojson: mergedRow.geojson,
          updated_at: mergedRow.updated_at,
        }
      : null;

    def.geometries.individuals = individualRows.map((r) => ({
      geometry_kind: r.geometry_kind,
      member_code: r.member_code,
      built_from_members_hash: r.built_from_members_hash,
      geojson: r.geojson,
      updated_at: r.updated_at,
    }));

    enriched.push(def);
  }

  return {
    school,
    definitions: enriched,
  };
}

module.exports = { getCatchmentsV2ForSchool };
