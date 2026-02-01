// server/src/routes/schools.js

const express = require("express");
const router = express.Router();

const { fetchAllSchools } = require("../domains/schools/schools.service");

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
