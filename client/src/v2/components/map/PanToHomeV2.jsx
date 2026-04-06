import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { nudgeMapAfterProgrammaticMove } from "./phoneMapOpticalNudge";

const PHONE_MAX_WIDTH = "(max-width: 767px)";

export default function PanToHomeV2({ position }) {
  const map = useMap();
  const isPhone = useMediaQuery(PHONE_MAX_WIDTH);

  useEffect(() => {
    if (!map || !Array.isArray(position) || position.length !== 2) return;

    const [lat, lon] = position;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (isPhone) {
      map.once("moveend", () => nudgeMapAfterProgrammaticMove(map));
    }
    // smooth pan; keep zoom as-is
    map.flyTo([lat, lon], map.getZoom(), { duration: 0.6 });
  }, [map, position, isPhone]);

  return null;
}
