// server/src/routes/catchments.js
// Compatibility wrapper — geometry routes now live in /routes/catchment/geometry
// This preserves the /api/catchments endpoint with zero behavior change.

module.exports = require("./catchment/geometry");
