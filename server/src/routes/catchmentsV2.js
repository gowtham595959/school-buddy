const express = require("express");
const router = express.Router();
const repo = require("../domains/catchmentV2/catchmentV2.repo");
const { rebuildSchoolCatchments } = require("../domains/catchmentV2/rebuild.service");

/**
 * GET /api/catchments-v2/:schoolId
 * Pure read:
 * - Fetch school
 * - Fetch active definitions
 * - For each definition, pick a geometry hash (any row for that key)
 * - Fetch all geometries for that hash (individual + merged)
 * - Return grouped payload for frontend
 */
router.get("/:schoolId", async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    if (Number.isNaN(schoolId)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }

    const school = await repo.getSchoolById(schoolId);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const [definitions, admissionsPolicies] = await Promise.all([
      repo.getActiveDefinitions(schoolId),
      repo.getAdmissionsPolicies(schoolId),
    ]);

    // Build geometries keyed by catchment_key
    const geometriesByKey = {};

    for (const def of definitions) {
      const catchmentKey = def.catchment_key;

      // Find any cached geometry hash for this key (should match definition members_hash if built)
      const hashRow = await repo.getAnyGeometryHashForKey(schoolId, catchmentKey);

      if (!hashRow || !hashRow.built_from_members_hash) {
        geometriesByKey[catchmentKey] = {
          built_from_members_hash: null,
          geometries: [],
        };
        continue;
      }

      const builtHash = hashRow.built_from_members_hash;

      const geoms = await repo.getGeometriesByHash(schoolId, catchmentKey, builtHash);

      geometriesByKey[catchmentKey] = {
        built_from_members_hash: builtHash,
        geometries: geoms || [],
      };
    }

   // Flatten for frontend compatibility (many map layers expect a single list)
const geometries = Object.values(geometriesByKey)
  .flatMap((x) => (x && Array.isArray(x.geometries) ? x.geometries : []));

return res.json({
  ok: true,
  school,
  definitions,
  admissionsPolicies,

  // ✅ existing structured form (keep)
  geometriesByKey,

  // ✅ compatibility layer (add)
  geometries,
});

  } catch (err) {
    console.error("❌ /api/catchments-v2/:schoolId error:", err);
    return res.status(500).json({ error: "Failed to fetch catchments" });
  }
});

/**
 * POST /api/catchments-v2/:schoolId/rebuild
 */
router.post("/:schoolId/rebuild", async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    if (Number.isNaN(schoolId)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }

    // Always pass a safe object (never null)
    const opts = req.body && typeof req.body === "object" ? req.body : {};

    // Optional: allow ?catchment_key=pa1
    if (req.query.catchment_key) {
      opts.catchmentKey = String(req.query.catchment_key);
    }

    const result = await rebuildSchoolCatchments(schoolId, opts);
    return res.json(result);
  } catch (err) {
    console.error("❌ /api/catchments-v2/:schoolId/rebuild error:", err);
    return res.status(500).json({ error: "Rebuild failed" });
  }
});

module.exports = router;
