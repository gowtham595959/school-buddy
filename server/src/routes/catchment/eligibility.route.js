// server/src/routes/catchment/eligibility.route.js

const express = require('express');
const router = express.Router();

// Import eligibility service DIRECTLY (no folder imports)
const eligibilityService = require('../../domains/catchment/catchment.eligibility.service');

/**
 * POST /api/catchment/eligibility
 *
 * Body:
 * {
 *   school_ids: number[],
 *   user_location: {
 *     lat: number,
 *     lon: number
 *   }
 * }
 */
router.post('/eligibility', async (req, res) => {
  try {
    const { school_ids, user_location } = req.body;

    // Explicit, defensive validation
    if (
      !Array.isArray(school_ids) ||
      !user_location ||
      typeof user_location.lat !== 'number' ||
      typeof user_location.lon !== 'number'
    ) {
      return res.status(400).json({
        error: 'Invalid request payload',
      });
    }

    const results = await eligibilityService.checkEligibilityForSchools({
      schoolIds: school_ids,
      userLocation: user_location,
    });

    return res.json(results);
  } catch (err) {
    console.error('Eligibility route error:', err);

    return res.status(500).json({
      error: 'Failed to evaluate eligibility',
    });
  }
});

module.exports = router;
