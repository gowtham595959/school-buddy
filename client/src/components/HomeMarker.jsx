import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";

const homeIcon = new L.Icon({
  iconUrl: "/icons/home_Board_opaque.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  tooltipAnchor: [0, -28],
});

/**
 * Pure presentational component
 */
export default function HomeMarker({ position, postcode }) {
  if (!position) return null;

  return (
    <Marker position={position} icon={homeIcon}>
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        <div>
          <strong>Home</strong>
          <br />
          Postcode: {postcode}
        </div>
      </Tooltip>
    </Marker>
  );
}
