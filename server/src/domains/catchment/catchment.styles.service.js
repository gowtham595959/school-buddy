// server/src/domains/catchment/catchment.styles.service.js

const db = require("../../db");

/**
 * CatchmentStylesService
 *
 * Read-only service for resolving visual styles
 * for catchment layers.
 *
 * IMPORTANT:
 * - No defaults hard-coded here
 * - No frontend assumptions
 * - Deterministic fallback order
 */
class CatchmentStylesService {
  /**
   * Resolve a style for a given layer.
   *
   * @param {Object} params
   * @param {number|null} params.schoolId
   * @param {string} params.layerType
   * @param {string} params.geometryMode
   * @param {number|null} params.year
   *
   * @returns {Object|null}
   */
  async getStyle({
    schoolId = null,
    layerType,
    geometryMode,
    year = null,
  }) {
    if (!layerType || !geometryMode) {
      throw new Error("layerType and geometryMode are required");
    }

    // 1️⃣ Try school-specific style first
    const specific = await db.query(
      `
      SELECT *
      FROM catchment_styles
      WHERE layer_type = $1
        AND geometry_mode = $2
        AND school_id = $3
        AND ($4::int IS NULL OR year = $4)
      ORDER BY year DESC NULLS LAST
      LIMIT 1
      `,
      [layerType, geometryMode, schoolId, year]
    );

    if (specific.rows.length > 0) {
      return specific.rows[0];
    }

    // 2️⃣ Fallback to default style
    const fallback = await db.query(
      `
      SELECT *
      FROM catchment_styles
      WHERE layer_type = $1
        AND geometry_mode = $2
        AND school_id IS NULL
        AND ($3::int IS NULL OR year = $3)
      ORDER BY year DESC NULLS LAST
      LIMIT 1
      `,
      [layerType, geometryMode, year]
    );

    if (fallback.rows.length > 0) {
      return fallback.rows[0];
    }

    // 3️⃣ No style found (frontend will fallback)
    return null;
  }
}

module.exports = new CatchmentStylesService();
