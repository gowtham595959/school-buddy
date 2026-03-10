// server/src/routes/catchmentCheck.js
// Compatibility wrapper — eligibility routes now live in /routes/catchment/eligibility
// Preserves POST /api/catchment-check with zero behavior change

module.exports = require("./catchment/eligibility");
