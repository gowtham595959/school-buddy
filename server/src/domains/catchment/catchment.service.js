const {
  CATCHMENT_LAYER_TYPES,
  GEOMETRY_MODES,
  CATCHMENT_STRUCTURES,
} = require('./catchment.types');

// ✅ NEW (Row 4-3): style resolver (read-only, safe)
const catchmentStylesService = require('./catchment.styles.service');

// IMPORTANT:
// Use the same DB import that was previously used in routes/catchments.js
const pool = require('../../db');

/**
 * Catchment Service
 * -----------------
 * Single source of truth for ALL catchment logic.
 *
 * Step 5A status:
 * - Legacy logic moved AS-IS
 * - Route delegates here
 * - Semantic fix applied: inner -> individual
 * - Classification metadata added (additive, FE-ignored)
 * - No DB changes
 * - No API breaking changes
 *
 * Step 4-3 status:
 * - Visual styles attached (additive, FE-ignored)
 */
class CatchmentService {
  /**
   * Extract geometry from DB row.
   * Behaviour preserved exactly:
   * - Prefer boundary_geom (via ST_AsGeoJSON)
   * - Fallback to boundary_geojson with recursive extraction
   */
  extractGeometry(row) {
    if (row && row.boundary_geom_geojson) {
      try {
        return JSON.parse(row.boundary_geom_geojson);
      } catch (e) {
        // fall through
      }
    }

    const g = row?.boundary_geojson;
    if (!g) return null;

    const extractRecursive = (obj) => {
      if (!obj) return null;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = extractRecursive(item);
          if (found) return found;
        }
        return null;
      }

      if (obj.type && (obj.coordinates || obj.geometries)) {
        return obj;
      }

      if (obj.type === 'Feature' && obj.geometry) {
        return extractRecursive(obj.geometry);
      }

      if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
        for (const f of obj.features) {
          const found = extractRecursive(f);
          if (found) return found;
        }
        return null;
      }

      if (obj.geometry) return extractRecursive(obj.geometry);
      if (obj.geometries) return extractRecursive(obj.geometries);

      return null;
    };

    return extractRecursive(g);
  }

  /**
   * NORMALISATION RULE
   *
   * Current reality:
   * - 'inner' in existing data actually means postcode-level individual areas
   *
   * Canonical meaning:
   * - 'individual' = postcode-based sub-catchments
   * - 'inner'      = RESERVED for future ward-based catchments
   */
  normaliseLayerType(rawType) {
    if (!rawType) return null;

    // SEMANTIC FIX (rollback = change one line)
    if (rawType === 'inner') {
      return CATCHMENT_LAYER_TYPES.INDIVIDUAL;
    }

    return rawType;
  }

  /**
   * MAIN ENTRY POINT
   * ----------------
   * Returns EXACTLY the same shape the frontend expects today,
   * with ADDITIONAL classification + styling metadata appended.
   */
  async getCatchmentForSchool(schoolId) {
    if (!Number.isInteger(Number(schoolId))) {
      throw new Error('Invalid schoolId');
    }

    // 1️⃣ Load school flags (AS-IS)
    const schoolResult = await pool.query(
      `
      SELECT
        id,
        lat,
        lon,
        radius_km,
        show_radius,
        show_polygon,
        has_catchment
      FROM schools
      WHERE id = $1
      `,
      [schoolId]
    );

    const school = schoolResult.rows?.[0];
    if (!school) {
      const err = new Error('School not found');
      err.statusCode = 404;
      throw err;
    }

    const response = {
      lat: school.lat,
      lon: school.lon,
      radius_km: school.radius_km,
      show_radius: !!school.show_radius,
      show_polygon: !!school.show_polygon,
      polygons: [],
      individual_polygons: [],
    };

    // 2️⃣ Load polygon catchments (AS-IS, with semantic fix)
    if (response.show_polygon) {
      const polygonResult = await pool.query(
        `
        SELECT
          id,
          school_id,
          type,
          year,
          active,
          boundary_geojson,
          ST_AsGeoJSON(boundary_geom) AS boundary_geom_geojson
        FROM catchments
        WHERE school_id = $1
          AND type IN ('inner', 'outer')
          AND (active IS NULL OR active = true)
        `,
        [schoolId]
      );

      response.polygons = polygonResult.rows
        .map((row) => {
          const geom = this.extractGeometry(row);
          if (!geom) return null;

          return {
            id: row.id,
            type: this.normaliseLayerType(row.type),
            year: row.year ?? null,
            geometry: geom,
          };
        })
        .filter(Boolean);
    }

    // 3️⃣ Special-case: individual postcode polygons (Tiffin)
    if (Number(schoolId) === 1) {
      const individualResult = await pool.query(
        `
        SELECT
          postcode_area,
          ST_AsGeoJSON(geom) AS geom_geojson
        FROM postcode_areas_tmp
        `
      );

      response.individual_polygons = individualResult.rows
        .map((row, idx) => {
          if (!row.geom_geojson) return null;

          let geom;
          try {
            geom = JSON.parse(row.geom_geojson);
          } catch (e) {
            return null;
          }

          return {
            id: `postcode_${idx}`,
            type: CATCHMENT_LAYER_TYPES.INDIVIDUAL,
            label: row.postcode_area,
            geometry: geom,
          };
        })
        .filter(Boolean);
    }

    /**
     * ===============================
     * STEP 5A-5 — CLASSIFICATION METADATA
     * ===============================
     * Additive only. Frontend ignores this for now.
     */

    const hasCatchment = !!school.has_catchment;
    const layerSummary = {};

    response.polygons.forEach((p) => {
      layerSummary[p.type] = layerSummary[p.type] || {
        type: p.type,
        geometry_mode: GEOMETRY_MODES.POLYGON_POSTCODE,
        count: 0,
      };
      layerSummary[p.type].count += 1;
    });

    if (response.individual_polygons.length > 0) {
      layerSummary[CATCHMENT_LAYER_TYPES.INDIVIDUAL] =
        layerSummary[CATCHMENT_LAYER_TYPES.INDIVIDUAL] || {
          type: CATCHMENT_LAYER_TYPES.INDIVIDUAL,
          geometry_mode: GEOMETRY_MODES.POLYGON_POSTCODE,
          count: 0,
        };

      layerSummary[CATCHMENT_LAYER_TYPES.INDIVIDUAL].count +=
        response.individual_polygons.length;
    }

    const layers = Object.values(layerSummary);

    const structure = this.determineStructure({
      hasCatchment,
      showRadius: response.show_radius,
      polygonLayers: layers,
    });

    response.catchment_profile = {
      has_catchment: hasCatchment,
      structure,
      layers,
    };

    /**
     * ===============================
     * ROW 4-3 — ATTACH VISUAL STYLES
     * ===============================
     * Additive only.
     * Failure must NEVER break response.
     */

    let styles = {};

    try {
      styles.outer = await catchmentStylesService.getStyle({
        schoolId,
        layerType: CATCHMENT_LAYER_TYPES.OUTER,
        geometryMode: GEOMETRY_MODES.POLYGON_POSTCODE,
      });

      styles.individual = await catchmentStylesService.getStyle({
        schoolId,
        layerType: CATCHMENT_LAYER_TYPES.INDIVIDUAL,
        geometryMode: GEOMETRY_MODES.POLYGON_POSTCODE,
      });

      styles.radius = await catchmentStylesService.getStyle({
        schoolId,
        layerType: CATCHMENT_LAYER_TYPES.RADIUS,
        geometryMode: GEOMETRY_MODES.RADIUS,
      });
    } catch (e) {
      styles = {};
    }

    response.styles = styles;

    return response;
  }

  /**
   * STRUCTURE DETERMINATION (Level 2)
   * --------------------------------
   * Derived, DB-driven, no side effects.
   */
  determineStructure({ hasCatchment, showRadius, polygonLayers }) {
    if (!hasCatchment) {
      return CATCHMENT_STRUCTURES.NONE;
    }

    if (showRadius && (!polygonLayers || polygonLayers.length === 0)) {
      return CATCHMENT_STRUCTURES.RADIUS_ONLY;
    }

    if (polygonLayers && polygonLayers.length > 0) {
      const hasIndividual = polygonLayers.some(
        (l) => l.type === CATCHMENT_LAYER_TYPES.INDIVIDUAL
      );

      return hasIndividual
        ? CATCHMENT_STRUCTURES.OUTER_PLUS_INDIVIDUAL
        : CATCHMENT_STRUCTURES.OUTER_ONLY;
    }

    return CATCHMENT_STRUCTURES.NONE;
  }
}

module.exports = new CatchmentService();
