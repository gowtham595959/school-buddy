// server/src/routes/catchment/geometry.js

const express = require('express');
const router = express.Router();

// IMPORTANT:
// All catchment logic now lives in domains/catchment.
// This route must remain a thin HTTP wrapper only.
const catchmentService = require('../../domains/catchment/catchment.service');

router.get('/:schoolId', async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId)) {
      return res.status(400).json({ error: 'Invalid schoolId' });
    }

    const data = await catchmentService.getCatchmentForSchool(schoolId);
    return res.json(data);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Internal server error',
    });
  }
});

module.exports = router;
