// server/src/domains/catchmentV2/rebuild.service.js
const crypto = require("crypto");
const db = require("../../db");

const {
  getDefinitionById,
  getDefinitionsBySchool,
  updateDefinitionMembersAndHash,
  deleteGeometriesForKey,
  insertIndividualRows,
  upsertMergedRow,
  markDefinitionBuilt,
  fetchCanonicalGeoms,
  buildMergedGeometry,
} = require("./rebuild.repo");

function normalizeMember(geographyType, raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  if (geographyType === "postcode_district") return s.toUpperCase().replace(/\s+/g, "");
  if (geographyType === "postcode_sector") return s.toUpperCase().replace(/\s+/g, " ");
  return s.replace(/\s+/g, " ");
}

function normalizeMembers(geographyType, membersArray) {
  return (membersArray || [])
    .map((m) => normalizeMember(geographyType, m))
    .filter(Boolean)
    .sort();
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function computeMembersHash(def, normalizedMembers) {
  const csv = normalizedMembers.join(",");
  const base = `${def.catchment_year}|${def.geography_type}|${def.catchment_key}|${csv}`;
  return sha256Hex(base);
}

function toFeatureCollectionFromGeometry(geometry, properties = {}) {
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties, geometry }],
  };
}

async function rebuildCatchmentDefinition(definitionId) {
  const def = await getDefinitionById(definitionId);
  if (!def) throw new Error(`catchment_definition not found: ${definitionId}`);

  // Radius: no cached geojson
  if (def.geography_type === "radius") {
    await db.query("BEGIN");
    try {
      await deleteGeometriesForKey(def.school_id, def.catchment_key);
      await markDefinitionBuilt(definitionId);
      await db.query("COMMIT");
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    }

    return {
      ok: true,
      definition_id: def.id,
      school_id: def.school_id,
      catchment_key: def.catchment_key,
      geography_type: def.geography_type,
      note: "radius type: no cached geojson required",
    };
  }

  // Ensure membersArray is a plain JS array
  const membersArray = Array.isArray(def.members) ? def.members : (def.members || []);
  const normalizedMembers = normalizeMembers(def.geography_type, membersArray);
  const membersHash = computeMembersHash(def, normalizedMembers);

  // ✅ FIX: persist members as JSONB properly (repo stringifies + casts)
  await updateDefinitionMembersAndHash(def.id, normalizedMembers, membersHash);

  // Lookup canonical polygons
  const geomMap = await fetchCanonicalGeoms(def.geography_type, normalizedMembers);

  const missing_members = [];
  const individualRows = [];

  for (const code of normalizedMembers) {
    const geometry = geomMap.get(code);
    if (!geometry) {
      missing_members.push(code);
      continue;
    }

    individualRows.push({
      member_code: code,
      geojson_fc: toFeatureCollectionFromGeometry(geometry, { member_code: code }),
    });
  }

  const foundMemberCodes = individualRows.map((r) => r.member_code);

  // Merge only what we actually found
  const mergedGeometry =
    foundMemberCodes.length > 0
      ? await buildMergedGeometry(def.geography_type, foundMemberCodes, {
          // Optional per-definition overrides via definition.style.cleanup
          ...(def.style?.cleanup || {}),
        })
      : null;

  const mergedFc = mergedGeometry
    ? toFeatureCollectionFromGeometry(mergedGeometry, { catchment_key: def.catchment_key })
    : null;

  // Write geometries atomically
  await db.query("BEGIN");
  try {
    await deleteGeometriesForKey(def.school_id, def.catchment_key);

    if (individualRows.length > 0) {
      await insertIndividualRows({
        schoolId: def.school_id,
        schoolName: def.school_name,
        catchmentKey: def.catchment_key,
        membersHash,
        rows: individualRows,
      });
    }

    if (mergedFc) {
      await upsertMergedRow({
        schoolId: def.school_id,
        schoolName: def.school_name,
        catchmentKey: def.catchment_key,
        membersHash,
        geojsonFc: mergedFc,
      });
    }

    await markDefinitionBuilt(definitionId);

    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }

  return {
    ok: true,
    definition_id: def.id,
    school_id: def.school_id,
    catchment_key: def.catchment_key,
    geography_type: def.geography_type,
    members_hash: membersHash,
    missing_members,
    inserted: {
      individuals: individualRows.length,
      merged: mergedFc ? 1 : 0,
    },
  };
}
async function rebuildSchoolCatchments(schoolId, opts) {
  const safeOpts = opts && typeof opts === "object" ? opts : {};

  const defs = await getDefinitionsBySchool(schoolId);
  const results = [];

  for (const def of defs) {
    // Optionally rebuild only one key
    if (safeOpts.catchmentKey && def.catchment_key !== safeOpts.catchmentKey) continue;
    results.push(await rebuildCatchmentDefinition(def.id));
  }

  return {
    ok: true,
    school_id: schoolId,
    rebuilt: results.length,
    results,
  };
}

module.exports = { rebuildCatchmentDefinition, rebuildSchoolCatchments };
