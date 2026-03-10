/**
 * Catchment Types
 * ----------------
 * Canonical enums for catchment logic.
 *
 * IMPORTANT RULE:
 * - Values here are the SOURCE OF TRUTH
 * - DB values MUST match these exactly
 * - Frontend relies on backend-normalised values only
 */

/**
 * Catchment layer types (WHAT the area represents)
 */
const CATCHMENT_LAYER_TYPES = {
  OUTER: 'outer',

  /**
   * Individual postcode-based sub-catchments
   * (historically mislabelled as "inner")
   */
  INDIVIDUAL: 'individual',

  /**
   * RESERVED for future ward-based catchments
   * (do NOT use yet)
   */
  INNER: 'inner',

  /**
   * Radius-based catchment
   */
  RADIUS: 'radius',
};

/**
 * Geometry modes (HOW the area is defined)
 */
const GEOMETRY_MODES = {
  /**
   * Polygon made of postcode boundaries
   */
  POLYGON_POSTCODE: 'polygon_postcode',

  /**
   * Polygon made of electoral wards
   * (future)
   */
  POLYGON_WARD: 'polygon_ward',

  /**
   * Radius / circle geometry
   *
   * IMPORTANT:
   * - Must match DB `geometry_mode`
   * - Used by eligibility + styling resolvers
   */
  RADIUS: 'circle',
};

/**
 * High-level catchment structure classification
 * (derived, not stored)
 */
const CATCHMENT_STRUCTURES = {
  NONE: 'none',
  RADIUS_ONLY: 'radius_only',
  OUTER_ONLY: 'outer_only',
  OUTER_PLUS_INDIVIDUAL: 'outer_plus_individual',
};

module.exports = {
  CATCHMENT_LAYER_TYPES,
  GEOMETRY_MODES,
  CATCHMENT_STRUCTURES,
};
