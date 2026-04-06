// client/src/v2/components/map/SchoolMarkersV2Layer.jsx
import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

const DEFAULT_ICON_URL = "/icons/School_red.png";

/**
 * Dotted ring under the focused pin. DivIcon + CSS animates reliably; SVG CircleMarker
 * often ignores or fights Leaflet’s SVG transforms.
 */
const HIGHLIGHT_DIV_ICON = L.divIcon({
  className: "v2-school-highlight-leaflet",
  html: '<div class="v2-school-highlight-disk" aria-hidden="true"></div>',
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

// small cache so we don’t recreate Leaflet icons every render
const iconCache = new Map();
function getIcon(url) {
  const iconUrl = url || DEFAULT_ICON_URL;
  if (iconCache.has(iconUrl)) return iconCache.get(iconUrl);

  const icon = L.icon({
    iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  iconCache.set(iconUrl, icon);
  return icon;
}

export default function SchoolMarkersV2Layer({
  schools,
  highlightSchoolId = null,
  onSchoolMarkerClick,
}) {
  const markers = useMemo(() => {
    if (!Array.isArray(schools)) return [];

    return schools
      .map((s) => {
        const lat = Number(s.lat);
        const lon = Number(s.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        return {
          id: s.id,
          name: s.name,
          pos: [lat, lon],
          iconUrl: s.icon_url || null,
        };
      })
      .filter(Boolean);
  }, [schools]);

  if (markers.length === 0) return null;

  return (
    <>
      {markers.map((m) => {
        const isHighlight =
          highlightSchoolId != null && m.id === highlightSchoolId;

        return (
          <React.Fragment key={`school:${m.id}`}>
            {isHighlight ? (
              <Marker
                position={m.pos}
                icon={HIGHLIGHT_DIV_ICON}
                interactive={false}
                zIndexOffset={400}
              />
            ) : null}
            <Marker
              position={m.pos}
              icon={getIcon(m.iconUrl)}
              zIndexOffset={isHighlight ? 650 : 0}
              eventHandlers={
                onSchoolMarkerClick
                  ? {
                      click(e) {
                        L.DomEvent.stopPropagation(e);
                        onSchoolMarkerClick(m.id);
                      },
                    }
                  : undefined
              }
            >
              <Tooltip
                direction="top"
                offset={[0, -30]}
                opacity={1}
                className="v2-marker-tooltip-school"
              >
                {m.name}
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
