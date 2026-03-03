// server/src/domains/catchment/catchment.eligibility.service.js

const pool = require("../../db");

class CatchmentEligibilityService {
  /**
   * Calculate distance between two lat/lon points (km)
   * (Used for legacy radius schools – Step 6B)
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
   * V2 eligibility via catchment_definitions + canonical_geometries.
   *
   * IMPORTANT:
   * - This does NOT affect drawing (drawing uses catchment_geometries in V2)
   * - This is purely "is this point inside the defined catchment?"
   * - Returns null when no active V2 definitions exist (so caller can fall back to legacy)
   */
  async checkEligibilityViaV2Definitions({ school, userLocation }) {
    const { lat: userLat, lon: userLon } = userLocation;

    // Load active V2 definitions for this school
    const defsResult = await pool.query(
      `
      SELECT
        id,
        school_id,
        catchment_priority,
        catchment_key,
        catchment_active,
        geography_type,
        radius,
        radius_unit,
        members
      FROM catchment_definitions
      WHERE school_id = $1
        AND catchment_active = true
      ORDER BY catchment_priority ASC, catchment_key ASC
      `,
      [school.id]
    );

    const defs = defsResult.rows || [];
    if (defs.length === 0) return null; // <-- key: allow legacy fallback when V2 not present

    // Evaluate in priority order; first match wins (deterministic)
    for (const def of defs) {
      const key = def.catchment_key || def.geography_type || "v2";

      // 1) Radius definition
      if (def.geography_type === "radius") {
        if (def.radius == null) continue;

        // Normalize radius to KM for calculation.
        // Supported: "km", "m". Unknown -> treat as km (safe fallback).
        const unit = String(def.radius_unit || "km").toLowerCase();
        const r = Number(def.radius);

        if (!Number.isFinite(r)) continue;

        const radiusKm = unit === "m" ? r / 1000 : r;

        if (
          typeof school.lat === "number" &&
          typeof school.lon === "number" &&
          Number.isFinite(radiusKm)
        ) {
          const distanceKm = this.calculateDistanceKm(
            userLat,
            userLon,
            Number(school.lat),
            Number(school.lon)
          );

          if (distanceKm <= radiusKm) {
            return {
              school_id: school.id,
              in_catchment: true,
              matched_by: key,
              distance_km: Number(distanceKm.toFixed(2)),
            };
          }
        }

        continue;
      }

      // 2) Polygon/member-based definition
      // members is JSONB; node-postgres may return as array already
      const membersRaw = def.members;
      const members = Array.isArray(membersRaw)
        ? membersRaw
        : membersRaw && typeof membersRaw === "object"
          ? membersRaw
          : [];

      if (!Array.isArray(members) || members.length === 0) continue;

      // Convert user location to geometry point (SRID 4326)
      // We avoid ST_GeomFromText(WKT) for the point and use ST_MakePoint directly (simpler).
      const hit = await pool.query(
        `
        SELECT 1
        FROM canonical_geometries cg
        WHERE cg.geography_type = $1
          AND cg.member_code = ANY($2)
          AND ST_Contains(
            cg.geom,
            ST_SetSRID(ST_MakePoint($3, $4), 4326)
          )
        LIMIT 1
        `,
        [def.geography_type, members, userLon, userLat]
      );

      if (hit.rows && hit.rows.length > 0) {
        return {
          school_id: school.id,
          in_catchment: true,
          matched_by: key,
          distance_km: null,
        };
      }
    }

    // No definition matched
    return {
      school_id: school.id,
      in_catchment: false,
      matched_by: null,
      distance_km: null,
    };
  }

  /**
   * Check eligibility for ONE school
   * Includes:
   * - Step 6B: legacy radius logic
   * - Step 6C: legacy polygon logic (inner → outer)
   *
   * ✅ NEW (non-breaking):
   * - If V2 definitions exist, use them as source of truth for eligibility.
   * - Otherwise fall back to legacy catchments table.
   */
  async checkEligibilityForSchool({ schoolId, userLocation }) {
    const { lat: userLat, lon: userLon } = userLocation;

    if (typeof userLat !== "number" || typeof userLon !== "number") {
      throw new Error("Invalid user location");
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
      throw new Error("School not found");
    }

    /**
     * LEVEL 1 — No catchment = whole UK
     */
    if (!school.has_catchment) {
      return {
        school_id: schoolId,
        in_catchment: true,
        matched_by: "all_uk",
        distance_km: null,
      };
    }

    /**
     * ✅ V2 eligibility (if definitions exist)
     * This fixes schools like Gravesend which do not exist in legacy catchments table.
     */
    const v2Result = await this.checkEligibilityViaV2Definitions({
      school,
      userLocation,
    });

    // If V2 exists for this school, we trust it and return it directly.
    if (v2Result !== null) {
      return v2Result;
    }

    /**
     * 2️⃣ STEP 6B — Legacy Radius eligibility
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
          matched_by: "radius",
          distance_km: Number(distanceKm.toFixed(2)),
        };
      }
    }

    /**
     * 3️⃣ STEP 6C — Legacy Polygon eligibility
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
          matched_by: "individual",
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
          matched_by: "outer",
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
   * Bulk eligibility (used by /api/catchment/eligibility)
   */
  async checkEligibilityForSchools({ schoolIds, userLocation }) {
    const results = [];

    for (const schoolId of schoolIds) {
      results.push(await this.checkEligibilityForSchool({ schoolId, userLocation }));
    }

    return results;
  }
}

module.exports = new CatchmentEligibilityService();
