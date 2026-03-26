// server/src/routes/admissions.js
const express = require("express");
const router = express.Router();
const admissionsRepo = require("../domains/admissions/admissions.repo");

/**
 * GET /api/admissions/school/:schoolId
 * Full admissions_policies rows (works when has_exams without catchment).
 */
router.get("/school/:schoolId", async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    if (Number.isNaN(schoolId)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }

    const policies = await admissionsRepo.listPoliciesBySchoolId(schoolId);
    return res.json({ ok: true, policies });
  } catch (err) {
    console.error("❌ GET /api/admissions/school/:schoolId error:", err);
    return res.status(500).json({ error: "Failed to fetch admissions policies" });
  }
});

module.exports = router;
