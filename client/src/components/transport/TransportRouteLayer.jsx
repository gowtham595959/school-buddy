import React, { useState } from "react";
import { Polyline, CircleMarker, Tooltip } from "react-leaflet";
import polyline from "@mapbox/polyline";

// -------------------------------
// Helpers (unchanged)
// -------------------------------
function vehicleEmoji(type) {
  switch (type) {
    case "BUS":
      return "🚌";
    case "TRAIN":
    case "RAIL":
      return "🚆";
    case "SUBWAY":
      return "🚇";
    default:
      return "🚉";
  }
}

function stopFillColor(type) {
  switch (type) {
    case "BUS":
      return "#e53935";
    case "TRAIN":
    case "RAIL":
      return "#1e88e5";
    case "SUBWAY":
      return "#6a1b9a";
    default:
      return "#ffffff";
  }
}

// Matches TransportPanel formatting
function formatDuration(seconds) {
  if (typeof seconds !== "number") return null;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} Min`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} Hr${h > 1 ? "s" : ""}${m > 0 ? ` ${m} Min` : ""}`;
}

function formatMiles(meters) {
  if (typeof meters !== "number") return null;
  const miles = (meters / 1000) * 0.621371;
  return `${miles.toFixed(1)} mi`;
}

export default function TransportRouteLayer({ route }) {
  const [hoveredStepIdx, setHoveredStepIdx] = useState(null);

  if (!route) return null;

  // -------------------------------
  // NON-TRANSIT (DRIVING / WALKING / CYCLING)
  // -------------------------------
  if (route.mode !== "transit" || !Array.isArray(route.steps)) {
    if (!route.polyline) return null;

    const positions = polyline
      .decode(route.polyline)
      .map(([lat, lng]) => [lat, lng]);

    const isDriving = route.mode === "driving";
    const isWalking = route.mode === "walking";
    const isCycling = route.mode === "bicycling";

    // Normalize units for tooltips
    const seconds =
      typeof route.duration_minutes === "number"
        ? route.duration_minutes * 60
        : null;

    const meters =
      typeof route.distance_km === "number"
        ? route.distance_km * 1000
        : null;

    // Style decisions (incremental)
    let color = "#1a73e8"; // default driving blue
    let weight = 6;
    let dashArray = null;

    if (isWalking) {
      weight = 4;
      dashArray = "4,8";
    }

    if (isCycling) {
      weight = 4;
      color = "#6a5acd"; // ✅ purple-blue for cycling
    }

    return (
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          opacity: 0.9,
          dashArray,
        }}
      >
        {/* 🚗 DRIVING tooltip */}
        {isDriving && (
          <Tooltip sticky opacity={0.95}>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div>🚗 Drive</div>
              {(formatDuration(seconds) || formatMiles(meters)) && (
                <div>
                  {formatDuration(seconds)}
                  {formatDuration(seconds) && formatMiles(meters)
                    ? " · "
                    : null}
                  {formatMiles(meters)}
                </div>
              )}
            </div>
          </Tooltip>
        )}

        {/* 🚶 WALKING tooltip */}
        {isWalking && (
          <Tooltip sticky opacity={0.95}>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div>🚶 Walk</div>
              {(formatDuration(seconds) || formatMiles(meters)) && (
                <div>
                  {formatDuration(seconds)}
                  {formatDuration(seconds) && formatMiles(meters)
                    ? " · "
                    : null}
                  {formatMiles(meters)}
                </div>
              )}
            </div>
          </Tooltip>
        )}

        {/* 🚴 CYCLING tooltip */}
        {isCycling && (
          <Tooltip sticky opacity={0.95}>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div>🚴 Cycle</div>
              {(formatDuration(seconds) || formatMiles(meters)) && (
                <div>
                  {formatDuration(seconds)}
                  {formatDuration(seconds) && formatMiles(meters)
                    ? " · "
                    : null}
                  {formatMiles(meters)}
                </div>
              )}
            </div>
          </Tooltip>
        )}
      </Polyline>
    );
  }

  // -------------------------------
  // TRANSIT (steps) — unchanged
  // -------------------------------
  return (
    <>
      {route.steps.map((step, idx) => {
        if (!step.polyline) return null;

        const positions = polyline
          .decode(step.polyline)
          .map(([lat, lng]) => [lat, lng]);

        const isWalking = step.travel_mode === "WALKING";
        const isTransit = step.travel_mode === "TRANSIT";

        let color = "#1a73e8";
        let dashArray = null;
        let weight = 6;

        if (isWalking) {
          dashArray = "4,8";
          weight = 4;
        }

        if (isTransit && step.transit?.line?.color) {
          color = step.transit.line.color;
        }

        if (hoveredStepIdx === idx) {
          weight += 2;
        }

        const elements = [];

        elements.push(
          <Polyline
            key={`line-${idx}`}
            positions={positions}
            eventHandlers={{
              mouseover: () => setHoveredStepIdx(idx),
              mouseout: () => setHoveredStepIdx(null),
            }}
            pathOptions={{
              color,
              weight,
              opacity: 0.9,
              dashArray,
            }}
          >
            {isTransit && step.transit && (
              <Tooltip sticky opacity={0.95}>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  <div>
                    {vehicleEmoji(step.transit.vehicle_type)}{" "}
                    {step.transit.line?.short_name ||
                      step.transit.line?.name ||
                      "Transit"}
                  </div>

                  {(step.transit.departure_stop?.name ||
                    step.transit.arrival_stop?.name ||
                    step.transit.headsign) && (
                    <div>
                      {step.transit.departure_stop?.name || "Start"}
                      {" → "}
                      {step.transit.arrival_stop?.name ||
                        step.transit.headsign ||
                        "End"}
                    </div>
                  )}

                  {formatDuration(step.duration_s) && (
                    <div>{formatDuration(step.duration_s)}</div>
                  )}
                </div>
              </Tooltip>
            )}

            {isWalking && (
              <Tooltip sticky opacity={0.95}>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  <div>🚶 Walk</div>
                  {(formatDuration(step.duration_s) ||
                    formatMiles(step.distance_m)) && (
                    <div>
                      {formatDuration(step.duration_s)}
                      {formatDuration(step.duration_s) &&
                      formatMiles(step.distance_m)
                        ? " · "
                        : null}
                      {formatMiles(step.distance_m)}
                    </div>
                  )}
                </div>
              </Tooltip>
            )}
          </Polyline>
        );

        // Transit stop dots unchanged
        if (isTransit) {
          const from = step.transit?.departure_stop;
          const to = step.transit?.arrival_stop;
          const vehicleType = step.transit?.vehicle_type;

          if (from?.lat && from?.lng) {
            elements.push(
              <CircleMarker
                key={`dot-start-${idx}`}
                center={[from.lat, from.lng]}
                radius={5}
                interactive
                eventHandlers={{
                  mouseover: () => setHoveredStepIdx(idx),
                  mouseout: () => setHoveredStepIdx(null),
                }}
                pathOptions={{
                  color: "#000",
                  weight: 1.5,
                  fillColor: stopFillColor(vehicleType),
                  fillOpacity: 1,
                }}
              >
                {from.name && (
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    {vehicleEmoji(vehicleType)} {from.name}
                  </Tooltip>
                )}
              </CircleMarker>
            );
          }

          if (to?.lat && to?.lng) {
            elements.push(
              <CircleMarker
                key={`dot-end-${idx}`}
                center={[to.lat, to.lng]}
                radius={5}
                interactive
                eventHandlers={{
                  mouseover: () => setHoveredStepIdx(idx),
                  mouseout: () => setHoveredStepIdx(null),
                }}
                pathOptions={{
                  color: "#000",
                  weight: 1.5,
                  fillColor: stopFillColor(vehicleType),
                  fillOpacity: 1,
                }}
              >
                {to.name && (
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    {vehicleEmoji(vehicleType)} {to.name}
                  </Tooltip>
                )}
              </CircleMarker>
            );
          }
        }

        return <React.Fragment key={`step-${idx}`}>{elements}</React.Fragment>;
      })}
    </>
  );
}
