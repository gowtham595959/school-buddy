// server/src/routes/geocode.js

const express = require("express");
const { geocodePostcode, GeocodeError } = require("../domains/geocode/geocode.service");

const router = express.Router();

/**
 * GET /api/geocode/postcode/:postcode
 * UI-only geocoding
 * - No DB
 * - No persistence
 * - Uses domain service
 */
router.get("/postcode/:postcode", async (req, res) => {
  try {
    const rawPostcode = req.params.postcode;

    const { lat, lon } = await geocodePostcode(rawPostcode);

    res.json({ lat, lon });
  } catch (err) {
    const isKnown = err instanceof GeocodeError;

    if (isKnown) {
      return res.status(err.status).json({
        error: err.message,
        code: err.code,
      });
    }

    console.error("❌ Geocoding failed:", err);
    res.status(500).json({
      error: "Geocoding failed",
      code: "GEOCODE_FAILED",
    });
  }
});

module.exports = router;
