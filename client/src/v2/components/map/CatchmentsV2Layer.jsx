// client/src/v2/components/map/CatchmentsV2Layer.jsx

import React, { useEffect, useState } from "react";
import { GeoJSON, Marker, useMap, useMapEvents, Circle, Tooltip } from "react-leaflet";
import L from "leaflet";
import { mergedStyle, individualStyle } from "../../utils/leafletStyle";

import pointOnFeature from "@turf/point-on-feature";
import area from "@turf/area";
import polylabel from "@mapbox/polylabel";

function safeFeatures(fc) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return [];
  return fc.features.filter(Boolean);
}

function schoolColorFromId(schoolId) {
  const palette = [
    "#C62828", // strong red
    "#AD1457", // dark pink
    "#6A1B9A", // deep purple
    "#283593", // strong indigo blue
    "#1565C0", // strong blue
    "#2E7D32", // strong green
    "#EF6C00", // dark orange
    "#00838F", // deep teal (controlled, not pastel)
    "#4527A0", // violet
  ];

  const s = String(schoolId ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }

  return palette[h % palette.length];
}



function normalizeName(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getLargestPolygonPart(feature) {
  try {
    const geom = feature?.geometry;
    if (!geom) return null;

    if (geom.type === "Polygon") return geom;

    if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
      // pick the multipolygon part with largest area using turf on a Feature wrapper
      let best = null;
      let bestA = 0;

      for (const polyCoords of geom.coordinates) {
        const f = {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: polyCoords },
        };
        const a = area(f);
        if (a > bestA) {
          bestA = a;
          best = f.geometry;
        }
      }

      return best;
    }
  } catch {
    // ignore
  }
  return null;
}

// ✅ Minimal fix: for postcode FeatureCollections, pick the largest feature (not features[0])
function getLabelLatLng(fcOrFeature, isPostcode) {
  try {
    let f = null;

    if (fcOrFeature?.type === "FeatureCollection") {
      const feats = Array.isArray(fcOrFeature.features) ? fcOrFeature.features : [];
      if (feats.length === 0) return null;

      if (isPostcode) {
        let best = null;
        let bestArea = 0;

        for (const feat of feats) {
          const t = feat?.geometry?.type;
          if (t !== "Polygon" && t !== "MultiPolygon") continue;

          const a = area(feat);
          if (a > bestArea) {
            bestArea = a;
            best = feat;
          }
        }

        f = best || feats[0];
      } else {
        f = feats[0];
      }
    } else {
      f = fcOrFeature;
    }

    if (!f) return null;

    if (isPostcode) {
      const bestPoly = getLargestPolygonPart(f);
      if (bestPoly) {
        // ✅ FIX: polylabel expects polygon coordinates, not a GeoJSON geometry object
        const coords = bestPoly?.coordinates;
        if (Array.isArray(coords)) {
          const [lng, lat] = polylabel(coords, 1.0);
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return L.latLng(lat, lng);
          }
        }
      }
    }

    const p = pointOnFeature(f);
    const c = p?.geometry?.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      const [lng, lat] = c;
      return L.latLng(lat, lng);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function jitterLatLng(latlng, code) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const dx = (h % 11 - 5) * 0.00018;
  const dy = ((((h / 11) | 0) % 11) - 5) * 0.00018;
  return L.latLng(latlng.lat + dy, latlng.lng + dx);
}

function makeDivIcon(text, zoom, isPostcode) {
  const z = zoom ?? 0;
  const compact = z <= 12;

  const W = compact ? (isPostcode ? 70 : 110) : isPostcode ? 140 : 160;
  const H = compact ? 20 : 24;

  const cls = compact
    ? "v2-geo-label-text v2-geo-label-text--small"
    : "v2-geo-label-text";

  // define shift BEFORE using it
  let shiftRightPx = 0;

  if (compact) {
    shiftRightPx = 12; // increase to 16 if you want more shift
  }

  return L.divIcon({
    className: "v2-geo-label-marker",
    html: `<div class="${cls}">${text}</div>`,
    iconSize: [W, H],
    iconAnchor: [
      Math.floor(W / 2) - 9 - shiftRightPx,
      Math.floor(H / 2),
    ],
  });
}


function cleanPostcodeIndividualGeojson(fc) {
  try {
    if (
      !fc ||
      fc.type !== "FeatureCollection" ||
      !Array.isArray(fc.features) ||
      fc.features.length === 0
    ) {
      return fc;
    }

    // Find the largest feature area
    let maxA = 0;
    for (const feat of fc.features) {
      if (!feat?.geometry) continue;
      const t = feat.geometry.type;
      if (t !== "Polygon" && t !== "MultiPolygon") continue;

      const a = area(feat);
      if (a > maxA) maxA = a;
    }

    if (!maxA) return fc;

    // Keep features at least 1% of largest
    const MIN_FEATURE_RATIO = 0.01;
    const minKeepArea = maxA * MIN_FEATURE_RATIO;

    const keptFeatures = fc.features
      .filter((feat) => {
        if (!feat?.geometry) return false;
        const t = feat.geometry.type;
        if (t !== "Polygon" && t !== "MultiPolygon") return false;

        return area(feat) >= minKeepArea;
      })
      .map((feat) => {
        // If MultiPolygon, also drop tiny internal parts
        if (feat.geometry?.type !== "MultiPolygon") return feat;

        const parts = Array.isArray(feat.geometry.coordinates)
          ? feat.geometry.coordinates
          : [];

        if (parts.length <= 1) return feat;

        let maxPart = 0;

        const partAreas = parts.map((polyCoords) => {
          const f = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: polyCoords,
            },
          };

          const a = area(f);
          if (a > maxPart) maxPart = a;
          return a;
        });

        if (!maxPart) return feat;

        const MIN_PART_RATIO = 0.01;
        const minPartKeep = maxPart * MIN_PART_RATIO;

        const newCoords = parts.filter(
          (_, idx) => partAreas[idx] >= minPartKeep
        );

        if (newCoords.length === 0) return feat;

        return {
          ...feat,
          geometry: {
            ...feat.geometry,
            coordinates: newCoords,
          },
        };
      });

    if (keptFeatures.length === 0) return fc;

    return {
      ...fc,
      features: keptFeatures,
    };
  } catch {
    return fc;
  }
}


function radiusToMeters(radius, unit) {
  const r = Number(radius);
  if (!Number.isFinite(r) || r <= 0) return null;

  const u = String(unit || "").toLowerCase().trim();
  if (
    u === "km" ||
    u === "kilometer" ||
    u === "kilometre" ||
    u === "kilometers" ||
    u === "kilometres"
  ) {
    return r * 1000;
  }
  if (u === "m" || u === "meter" || u === "metre" || u === "meters" || u === "metres") {
    return r;
  }
  if (u === "mi" || u === "mile" || u === "miles") {
    return r * 1609.344;
  }

  // default: assume km (safe fallback)
  return r * 1000;
}

export default function CatchmentsV2Layer({ schoolId, school, schoolName, definitions, geometriesByKey }) {
  const [zoom, setZoom] = useState(null);

  // ✅ Non-breaking fix: ensure zoom is initialized even if layer mounts after map 'load'
  const map = useMap();
  useEffect(() => {
    setZoom(map.getZoom());
  }, [map]);

  // Keep zoom updates on interaction
  useMapEvents({
    zoomend(e) {
      setZoom(e.target.getZoom());
    },
  });

  if (!school?.has_catchment) return null;
  if (!definitions?.length) return null;


  const LABEL_ZOOM_MIN = 12;
  const showLabels = (zoom ?? 0) >= LABEL_ZOOM_MIN;

  const schoolColor = schoolColorFromId(schoolId);

  const schoolLat = school?.lat != null ? Number(school.lat) : null;
  const schoolLon = school?.lon != null ? Number(school.lon) : null;
  const schoolCenter = Number.isFinite(schoolLat) && Number.isFinite(schoolLon) ? [schoolLat, schoolLon] : null;

  return (
    <>
      {definitions.map((def) => {
        const defWithColor = { ...def, _schoolColor: schoolColor };
        const geographyType = String(defWithColor.geography_type || "").toLowerCase();

        // Radius catchment rendering (V2)
        if (geographyType === "radius") {
          const meters = radiusToMeters(defWithColor.radius, defWithColor.radius_unit);

          if (!schoolCenter || !meters) {
            return null;
          }

          return (
            <Circle
              key={`${schoolId}:${defWithColor.catchment_key}:radius`}
              center={schoolCenter}
              radius={meters}
              pathOptions={{
                color: schoolColor,
                opacity: 1,
                weight: 2,
                fillOpacity: 0,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                {schoolName} ({Number(defWithColor.radius).toFixed(2)}{" "}
                {String(defWithColor.radius_unit || "km")})
              </Tooltip>
            </Circle>
          );
        }

        const key = defWithColor.catchment_key;
        const bucket = geometriesByKey?.[key]?.geometries || [];

        const mergedRow = bucket.find((g) => g.geometry_kind === "merged");
        const merged = mergedRow?.geojson || null;

        const individuals = bucket.filter((g) => g.geometry_kind === "individual");

        const nameByCode = new Map();
        const md = Array.isArray(defWithColor.members_display) ? defWithColor.members_display : [];
        for (const item of md) {
          if (!item) continue;
          const code = item.code ?? item.member_code;
          const name = item.name ?? item.display_name;
          if (code && name) nameByCode.set(String(code), String(name));
        }

        const isPostcode =
          geographyType === "postcode" ||
          geographyType === "postcode_district" ||
          geographyType === "postcode_sector";

        const labelPoints = showLabels
          ? individuals
              .map((g) => {
                const code = String(g.member_code ?? "");
                if (!code) return null;

                const label = nameByCode.get(code) || code;

                const center = getLabelLatLng(g.geojson, isPostcode);
                if (!center) return null;

                return {
                  code,
                  label,
                  latlng: isPostcode ? center : jitterLatLng(center, code),
                };
              })
              .filter(Boolean)
          : [];

        return (
          <React.Fragment key={`${schoolId}:${key}`}>
            {individuals.map((g) => (
              <GeoJSON
                key={`i:${schoolId}:${key}:${g.member_code}`}
                data={isPostcode ? cleanPostcodeIndividualGeojson(g.geojson) : g.geojson}
                style={() => individualStyle(defWithColor)}
              />
            ))}

            {labelPoints.map((p) => (
              <Marker
                key={`lbl:${schoolId}:${key}:${p.code}`}
                position={p.latlng}
                icon={makeDivIcon(p.label, zoom, isPostcode)}
                interactive={false}
              />
            ))}

            {merged && safeFeatures(merged).length > 0 && (
              <GeoJSON
                key={`m:${schoolId}:${key}`}
                data={merged}
                style={() => mergedStyle(defWithColor)}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
