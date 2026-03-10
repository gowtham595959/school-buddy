// server/src/domains/catchmentV2/rebuild.repo.js
const db = require("../../db");

async function getDefinitionById(definitionId) {
  const { rows } = await db.query(
    `SELECT * FROM catchment_definitions WHERE id = $1`,
    [definitionId]
  );
  return rows[0] || null;
}

async function getDefinitionsBySchool(schoolId) {
  const { rows } = await db.query(
    `
    SELECT *
    FROM catchment_definitions
    WHERE school_id = $1
      AND catchment_active = true
    ORDER BY catchment_priority ASC, catchment_key ASC
    `,
    [schoolId]
  );
  return rows;
}

async function updateDefinitionMembersAndHash(definitionId, normalizedMembers, membersHash) {
  // Store members as JSONB properly
  const membersJson = JSON.stringify(normalizedMembers);

  await db.query(
    `
    UPDATE catchment_definitions
    SET members = $2::jsonb,
        members_hash = $3
    WHERE id = $1
    `,
    [definitionId, membersJson, membersHash]
  );
}

async function markDefinitionBuilt(definitionId) {
  await db.query(
    `
    UPDATE catchment_definitions
    SET geojson_built_at = NOW()
    WHERE id = $1
    `,
    [definitionId]
  );
}

async function deleteGeometriesForKey(schoolId, catchmentKey) {
  await db.query(
    `
    DELETE FROM catchment_geometries
    WHERE school_id = $1
      AND catchment_key = $2
    `,
    [schoolId, catchmentKey]
  );
}

async function insertIndividualRows({
  schoolId,
  schoolName,
  catchmentKey,
  membersHash,
  rows, // [{ member_code, geojson_fc }]
}) {
  for (const r of rows) {
    await db.query(
      `
      INSERT INTO catchment_geometries (
        school_id, school_name, catchment_key,
        geometry_kind, member_code, built_from_members_hash,
        geojson, updated_at
      )
      VALUES ($1,$2,$3,'individual',$4,$5,$6,NOW())
      `,
      [schoolId, schoolName, catchmentKey, r.member_code, membersHash, r.geojson_fc]
    );
  }
}

async function upsertMergedRow({
  schoolId,
  schoolName,
  catchmentKey,
  membersHash,
  geojsonFc,
}) {
  await db.query(
    `
    INSERT INTO catchment_geometries (
      school_id, school_name, catchment_key,
      geometry_kind, member_code, built_from_members_hash,
      geojson, updated_at
    )
    VALUES ($1,$2,$3,'merged',NULL,$4,$5,NOW())
    ON CONFLICT (school_id, catchment_key, geometry_kind, member_code, built_from_members_hash)
    DO UPDATE SET geojson = EXCLUDED.geojson, updated_at = NOW()
    `,
    [schoolId, schoolName, catchmentKey, membersHash, geojsonFc]
  );
}

/**
 * Neutral lookup from canonical_geometries.
 * Returns member_code -> GeoJSON geometry (Polygon/MultiPolygon)
 */
async function fetchCanonicalGeoms(geographyType, memberCodes) {
  const { rows } = await db.query(
    `
    SELECT member_code,
           ST_AsGeoJSON(geom)::jsonb AS geometry
    FROM canonical_geometries
    WHERE geography_type = $1
      AND member_code = ANY($2)
    `,
    [geographyType, memberCodes]
  );

  const map = new Map();
  for (const r of rows) map.set(r.member_code, r.geometry);
  return map;
}

/**
 * Build merged/dissolved geometry using PostGIS, with a safe "blip cleanup" pass.
 *
 * - Always keeps the largest polygon part
 * - Drops tiny disconnected parts ("dots") by area using meters² (geography cast)
 * - Uses both absolute + relative thresholds to work across all geography types
 * - Includes a safety fallback if too much area would be lost
 */
async function buildMergedGeometry(geographyType, memberCodes, opts = {}) {
  const minPartAreaM2 = Number(opts.minPartAreaM2 ?? process.env.CATCHMENT_MIN_PART_AREA_M2 ?? 10000);
  const minPartRel = Number(opts.minPartRel ?? process.env.CATCHMENT_MIN_PART_REL ?? 0.002);
  const minKeepAreaRatio = Number(opts.minKeepAreaRatio ?? process.env.CATCHMENT_MIN_KEEP_AREA_RATIO ?? 0.98);
  const precision = Number(opts.geojsonPrecision ?? process.env.CATCHMENT_GEOJSON_PRECISION ?? 6);

  // Defensive clamps (avoid weird config values)
  const safeMinPartAreaM2 = Number.isFinite(minPartAreaM2) && minPartAreaM2 >= 0 ? minPartAreaM2 : 10000;
  const safeMinPartRel = Number.isFinite(minPartRel) && minPartRel >= 0 ? minPartRel : 0.002;
  const safeMinKeepAreaRatio =
    Number.isFinite(minKeepAreaRatio) && minKeepAreaRatio > 0 && minKeepAreaRatio <= 1 ? minKeepAreaRatio : 0.98;
  const safePrecision = Number.isFinite(precision) && precision >= 0 && precision <= 10 ? precision : 6;

  const { rows } = await db.query(
    `
    WITH merged AS (
      SELECT
        ST_UnaryUnion(ST_Collect(ST_MakeValid(geom))) AS g
      FROM canonical_geometries
      WHERE geography_type = $1
        AND member_code = ANY($2)
    ),
    parts AS (
      SELECT (ST_Dump(g)).geom AS part
      FROM merged
      WHERE g IS NOT NULL
    ),
    stats AS (
      SELECT
        COALESCE(SUM(ST_Area(part::geography)), 0) AS total_area_m2,
        COALESCE(MAX(ST_Area(part::geography)), 0) AS max_part_area_m2,
        COUNT(*)::int AS parts_count
      FROM parts
    ),
    kept AS (
      SELECT p.part
      FROM parts p
      CROSS JOIN stats s
      WHERE
        -- Always keep the largest part
        ST_Area(p.part::geography) = s.max_part_area_m2
        OR
        -- Keep parts above the dynamic threshold (absolute OR relative)
        ST_Area(p.part::geography) >= GREATEST($3::double precision, s.total_area_m2 * $4::double precision)
    ),
    clean AS (
      SELECT ST_SimplifyPreserveTopology(
         ST_UnaryUnion(ST_Collect(part)),
         0.00005
       ) AS g_clean

      FROM kept
    )
    SELECT
      ST_AsGeoJSON((SELECT g FROM merged), $5)::jsonb AS original_geometry,
      ST_AsGeoJSON((SELECT g_clean FROM clean), $5)::jsonb AS cleaned_geometry,
      (SELECT total_area_m2 FROM stats) AS total_area_m2,
      (SELECT parts_count FROM stats) AS parts_count,
      (SELECT COUNT(*)::int FROM kept) AS kept_parts_count,
      ST_Area(((SELECT g_clean FROM clean))::geography) AS cleaned_area_m2
    ;
    `,
    [geographyType, memberCodes, safeMinPartAreaM2, safeMinPartRel, safePrecision]
  );

  const r = rows[0];
  if (!r) return null;

  const original = r.original_geometry || null;
  const cleaned = r.cleaned_geometry || null;

  // If anything went wrong producing cleaned geom, fall back to original.
  if (!cleaned) return original;

  const totalArea = Number(r.total_area_m2 ?? 0);
  const cleanedArea = Number(r.cleaned_area_m2 ?? 0);
  const ratio = totalArea > 0 ? cleanedArea / totalArea : 1;

  // Safety: if we would drop "too much" area, keep the original union instead.
  if (ratio < safeMinKeepAreaRatio) {
    return original;
  }

  return cleaned;
}

module.exports = {
  getDefinitionById,
  getDefinitionsBySchool,
  updateDefinitionMembersAndHash,
  markDefinitionBuilt,
  deleteGeometriesForKey,
  insertIndividualRows,
  upsertMergedRow,
  fetchCanonicalGeoms,
  buildMergedGeometry,
};
