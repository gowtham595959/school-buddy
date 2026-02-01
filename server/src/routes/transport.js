const express = require("express");
const pool = require("../db");

const router = express.Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAX_OPTIONS_PER_MODE = 3;

// 🔍 DEBUG FLAG — turn off after verification
const DEBUG_GOOGLE_RESPONSE = true;

/**
 * Get next Monday at 07:00 AM (epoch seconds)
 */
function getNextMonday7AM() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const daysUntilMonday = (8 - day) % 7 || 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(7, 0, 0, 0);

  return Math.floor(monday.getTime() / 1000);
}

const metersToKm = (m) => Math.round((m / 1000) * 10) / 10;
const secondsToMinutes = (s) => Math.round(s / 60);

router.post("/", async (req, res) => {
  const { home_lat, home_lon, school_id } = req.body;

  if (
    typeof home_lat !== "number" ||
    typeof home_lon !== "number" ||
    typeof school_id !== "number"
  ) {
    return res.status(400).json({
      error: "home_lat, home_lon and school_id are required",
    });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error("❌ GOOGLE_MAPS_API_KEY is missing");
    return res.status(500).json({
      error: "Google Maps API key not configured",
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, lat, lon FROM schools WHERE id = $1`,
      [school_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }

    const school = rows[0];
    const departureTime = getNextMonday7AM();

    const modes = [
      { key: "driving", google: "driving" },
      { key: "transit", google: "transit" },
      { key: "walking", google: "walking" },
      { key: "bicycling", google: "bicycling" },
    ];

    const routes = [];

    for (const mode of modes) {
      const url = new URL("https://maps.googleapis.com/maps/api/directions/json");

      url.searchParams.set("origin", `${home_lat},${home_lon}`);
      url.searchParams.set("destination", `${school.lat},${school.lon}`);
      url.searchParams.set("mode", mode.google);
      url.searchParams.set("departure_time", departureTime);
      url.searchParams.set("alternatives", "true");
      url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();

      console.log(`🚌 Google Directions [${mode.key}] status:`, data.status);

      if (DEBUG_GOOGLE_RESPONSE && mode.key === "transit") {
        console.log(
          "🔍 FULL GOOGLE DIRECTIONS RESPONSE (TRANSIT):",
          JSON.stringify(data, null, 2)
        );
      }

      if (data.status !== "OK") continue;

      const options = data.routes
        .slice(0, MAX_OPTIONS_PER_MODE)
        .map((route, idx) => {
          const leg = route?.legs?.[0];
          if (!leg) return null;

          const steps = (leg.steps || []).map((step) => {
            const details = step.transit_details;
            const line = details?.line;
            const agency = line?.agencies?.[0];

            return {
              travel_mode: step.travel_mode,
              distance_m: step.distance?.value ?? null,
              duration_s: step.duration?.value ?? null,
              polyline: step.polyline?.points ?? null,

              // ✅ TRANSIT ENRICHMENT (additive, non-breaking)
              transit: details
                ? {
                    vehicle_type: line?.vehicle?.type ?? null,

                    line: {
                      short_name: line?.short_name ?? null,
                      name: line?.name ?? null,
                      color: line?.color ?? null,
                      text_color: line?.text_color ?? null,
                    },

                    agency: agency
                      ? {
                          name: agency.name ?? null,
                          url: agency.url ?? null,
                        }
                      : null,

                    headsign: details.headsign ?? null,
                    num_stops: details.num_stops ?? null,

                    departure_stop: {
                      name: details.departure_stop?.name ?? null,
                      lat: details.departure_stop?.location?.lat ?? null,
                      lng: details.departure_stop?.location?.lng ?? null,
                    },

                    arrival_stop: {
                      name: details.arrival_stop?.name ?? null,
                      lat: details.arrival_stop?.location?.lat ?? null,
                      lng: details.arrival_stop?.location?.lng ?? null,
                    },
                  }
                : null,
            };
          });

          return {
            option_index: idx,
            duration_minutes: secondsToMinutes(leg.duration.value),
            distance_km: metersToKm(leg.distance.value),
            polyline: route.overview_polyline?.points || null,
            steps,
          };
        })
        .filter(Boolean);

      if (options.length === 0) continue;

      const primary = options[0];

      routes.push({
        mode: mode.key,
        duration_minutes: primary.duration_minutes,
        distance_km: primary.distance_km,
        polyline: primary.polyline,
        options,
      });
    }

    res.json({
      school_id: school.id,
      school_name: school.name,
      departure_time: "Monday 07:00",
      routes,
    });
  } catch (err) {
    console.error("❌ Transport route failed:", err);
    res.status(500).json({
      error: "Transport route calculation failed",
    });
  }
});

module.exports = router;
