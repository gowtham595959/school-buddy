// client/src/v2/components/map/SetHomeOnMapClickV2.jsx
import React, { useState } from "react";
import { Popup, useMap, useMapEvents } from "react-leaflet";

export default function SetHomeOnMapClickV2({ onSetHome }) {
  const map = useMap();
  const [clicked, setClicked] = useState(null);

  useMapEvents({
    click(e) {
      // ✅ Ignore clicks that happen inside the popup itself
      const target = e?.originalEvent?.target;
      if (target && typeof target.closest === "function") {
        if (target.closest(".leaflet-popup")) return;
      }

      if (!e?.latlng) return;
      setClicked({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!clicked) return null;

  return (
    <Popup
      position={[clicked.lat, clicked.lng]}
      closeButton={true}
      autoClose={true}
      closeOnClick={false}
      eventHandlers={{
        remove: () => setClicked(null),
      }}
    >
      <div style={{ minWidth: 140 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
          Set home here?
        </div>

        <button
          type="button"
          style={{
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #d0d0d0",
            background: "#fff",
            fontWeight: 600,
            fontSize: 13,
            width: "100%",
          }}
          onClick={(ev) => {
            // ✅ Prevent the map click handler from firing
            ev.preventDefault();
            ev.stopPropagation();

            onSetHome?.(clicked.lat, clicked.lng);

            // ✅ Close popup immediately + unmount it
            map.closePopup();
            setClicked(null);
          }}
        >
          Set as Home
        </button>
      </div>
    </Popup>
  );
}
