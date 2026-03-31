// server/src/routes/schools.js

const express = require("express");
const router = express.Router();

const { fetchAllSchools } = require("../domains/schools/schools.service");
const { fetchGcseResultsForSchoolId } = require("../domains/gcse/gcse.service");
const { fetchKs5ResultsForSchoolId } = require("../domains/ks5/ks5.service");
const {
  fetchDestinations1618ForSchoolId,
} = require("../domains/destinations1618/destinations1618.service");
const {
  fetchSchoolSubjectsForSchoolId,
} = require("../domains/schoolSubjects/schoolSubjects.service");
const {
  fetchInspectionsForSchoolId,
} = require("../domains/inspections/inspections.service");

/**
 * GET /api/schools/:schoolId/gcse-results
 */
router.get("/:schoolId/gcse-results", async (req, res) => {
  try {
    const rows = await fetchGcseResultsForSchoolId(req.params.schoolId);
    res.json(rows);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("❌ GCSE results:", err.message);
    res.status(status).json({ error: err.message || "Failed to fetch GCSE results" });
  }
});

/**
 * GET /api/schools/:schoolId/ks5-results
 * DfE 16–18 performance — A level exam cohort row.
 */
router.get("/:schoolId/ks5-results", async (req, res) => {
  try {
    const rows = await fetchKs5ResultsForSchoolId(req.params.schoolId);
    res.json(rows);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("❌ KS5 results:", err.message);
    res.status(status).json({ error: err.message || "Failed to fetch KS5 results" });
  }
});

/**
 * GET /api/schools/:schoolId/destinations-1618
 * DfE 16–18 sustained destination measures (Level 3 headline where published).
 */
router.get("/:schoolId/destinations-1618", async (req, res) => {
  try {
    const rows = await fetchDestinations1618ForSchoolId(req.params.schoolId);
    res.json(rows);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("❌ 16–18 destinations:", err.message);
    res.status(status).json({ error: err.message || "Failed to fetch destinations" });
  }
});

/**
 * GET /api/schools/:schoolId/subjects
 * KS4 and 16–18 subject entry rows (DfE-style).
 */
router.get("/:schoolId/subjects", async (req, res) => {
  try {
    const rows = await fetchSchoolSubjectsForSchoolId(req.params.schoolId);
    res.json(rows);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("❌ Subjects:", err.message);
    res.status(status).json({ error: err.message || "Failed to fetch subjects" });
  }
});

/**
 * GET /api/schools/:schoolId/inspections
 */
router.get("/:schoolId/inspections", async (req, res) => {
  try {
    const rows = await fetchInspectionsForSchoolId(req.params.schoolId);
    res.json(rows);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("❌ Inspections:", err.message);
    res.status(status).json({ error: err.message || "Failed to fetch inspections" });
  }
});

/**
 * GET /api/schools
 * HTTP-only wrapper
 */
router.get("/", async (req, res) => {
  try {
    const schools = await fetchAllSchools();
    res.json(schools);
  } catch (err) {
    console.error("❌ Failed to fetch schools:", err.message);
    res.status(500).json({
      error: "Failed to fetch schools",
    });
  }
});

module.exports = router;
