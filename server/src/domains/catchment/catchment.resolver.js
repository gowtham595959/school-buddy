// server/src/domains/catchment/catchment.resolver.js

/**
 * Catchment Eligibility Resolver
 * ------------------------------
 * Thin orchestration layer between routes/controllers
 * and the eligibility service.
 *
 * Step 6A:
 * - Stub only
 * - Not wired to any route
 */

const eligibilityService = require('./catchment.eligibility.service');

module.exports = {
  eligibilityService,
};
