// server/src/domains/catchmentV2/catchmentV2.repo.js
import db from "../../db.js";

/**
 * Minimal school payload for V2 UI.
 * ✅ Include lat/lon so radius catchments can render as circles in V2.
 */
export async function getSchoolById(schoolId) {
  const { rows } = await db.query(
    `
    SELECT id, name, has_catchment, catchment_category, lat, lon
    FROM schools
    WHERE id = $1
    `,
    [schoolId]
  );
  return rows[0] || null;
}

/**
 * Active V2 definitions for a school (source of truth for styling + members).
 */
export async function getActiveDefinitions(schoolId) {
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

/**
 * IMPORTANT FIX:
 * The geometry cache is keyed by catchment_geometries.built_from_members_hash.
 * We must read that column (NOT members_hash, NOT anything from definitions).
 */
export async function getAnyGeometryHashForKey(schoolId, catchmentKey) {
  const { rows } = await db.query(
    `
    SELECT built_from_members_hash
    FROM catchment_geometries
    WHERE school_id = $1
      AND catchment_key = $2
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [schoolId, catchmentKey]
  );
  return rows[0] || null;
}

/**
 * Fetch all cached geometries for a specific build hash
 * (individual + merged rows). This is what the map layer renders.
 */
export async function getGeometriesByHash(schoolId, catchmentKey, builtHash) {
  const { rows } = await db.query(
    `
    SELECT
      school_id,
      school_name,
      catchment_key,
      geometry_kind,
      member_code,
      built_from_members_hash,
      geojson,
      updated_at
    FROM catchment_geometries
    WHERE school_id = $1
      AND catchment_key = $2
      AND built_from_members_hash = $3
    ORDER BY
      CASE geometry_kind WHEN 'merged' THEN 0 ELSE 1 END,
      member_code NULLS FIRST
    `,
    [schoolId, catchmentKey, builtHash]
  );
  return rows;
}
