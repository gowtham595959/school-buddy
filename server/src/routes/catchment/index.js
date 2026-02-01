// server/src/routes/catchment/index.js

const express = require('express');
const router = express.Router();

// Only mount eligibility routes here
const eligibilityRoute = require('./eligibility.route');

// Mount under /api/catchment
router.use('/', eligibilityRoute);

module.exports = router;
