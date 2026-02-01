// server/src/domains/catchment/catchment.eligibility.service.js

const pool = require('../../db');

class CatchmentEligibilityService {
  /**
   * Calculate distance between two lat/lon points (km)
   * (Used for radius schools – Step 6B)
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Check eligibility for ONE school
   * Includes:
   * - Step 6B: radius logic
   * - Step 6C: polygon logic (individual → outer)
   */
  async checkEligibilityForSchool({ schoolId, userLocation }) {
    const { lat: userLat, lon: userLon } = userLocation;

    if (typeof userLat !== 'number' || typeof userLon !== 'number') {
      throw new Error('Invalid user location');
    }

    /**
     * 1️⃣ Load school data
     */
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

    const school = schoolResult.rows[0];
    if (!school) {
      throw new Error('School not found');
    }

    /**
     * LEVEL 1 — No catchment = whole UK
     */
    if (!school.has_catchment) {
      return {
        school_id: schoolId,
        in_catchment: true,
        matched_by: 'all_uk',
        distance_km: null,
      };
    }

    /**
     * 2️⃣ STEP 6B — Radius eligibility
     */
    if (school.show_radius && school.radius_km) {
      const distanceKm = this.calculateDistanceKm(
        userLat,
        userLon,
        school.lat,
        school.lon
      );

      if (distanceKm <= Number(school.radius_km)) {
        return {
          school_id: schoolId,
          in_catchment: true,
          matched_by: 'radius',
          distance_km: Number(distanceKm.toFixed(2)),
        };
      }
    }

    /**
     * 3️⃣ STEP 6C — Polygon eligibility
     */
    if (school.show_polygon) {
      // Convert user location to PostGIS point
      const pointWKT = `SRID=4326;POINT(${userLon} ${userLat})`;

      /**
       * 3A — Individual polygons (highest priority)
       */
      const individualResult = await pool.query(
        `
        SELECT id
        FROM catchments
        WHERE school_id = $1
          AND type = 'inner'
          AND (active IS NULL OR active = true)
          AND ST_Contains(boundary_geom, ST_GeomFromText($2))
        LIMIT 1
        `,
        [schoolId, pointWKT]
      );

      if (individualResult.rows.length > 0) {
        return {
          school_id: schoolId,
          in_catchment: true,
          matched_by: 'individual',
          distance_km: null,
        };
      }

      /**
       * 3B — Outer polygon
       */
      const outerResult = await pool.query(
        `
        SELECT id
        FROM catchments
        WHERE school_id = $1
          AND type = 'outer'
          AND (active IS NULL OR active = true)
          AND ST_Contains(boundary_geom, ST_GeomFromText($2))
        LIMIT 1
        `,
        [schoolId, pointWKT]
      );

      if (outerResult.rows.length > 0) {
        return {
          school_id: schoolId,
          in_catchment: true,
          matched_by: 'outer',
          distance_km: null,
        };
      }
    }

    /**
     * 4️⃣ No match → OUT of catchment
     */
    return {
      school_id: schoolId,
      in_catchment: false,
      matched_by: null,
      distance_km: null,
    };
  }

  /**
   * Bulk eligibility (used later)
   */
  async checkEligibilityForSchools({ schoolIds, userLocation }) {
    const results = [];

    for (const schoolId of schoolIds) {
      results.push(
        await this.checkEligibilityForSchool({ schoolId, userLocation })
      );
    }

    return results;
  }
}

module.exports = new CatchmentEligibilityService();
