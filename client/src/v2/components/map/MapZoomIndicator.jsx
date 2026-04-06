import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

function formatZoom(z) {
  if (!Number.isFinite(z)) return "—";
  const rounded = Math.round(z * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
}

/** Black numeric zoom readout; updates on any zoom change (+/−, wheel, programmatic). */
export default function MapZoomIndicator() {
  const map = useMap();
  const [level, setLevel] = useState(() => map.getZoom());

  useEffect(() => {
    const update = () => setLevel(map.getZoom());
    update();
    map.on("zoom", update);
    map.on("zoomend", update);
    return () => {
      map.off("zoom", update);
      map.off("zoomend", update);
    };
  }, [map]);

  return (
    <div className="v2-map-zoom-readout" aria-hidden>
      {formatZoom(level)}
    </div>
  );
}
