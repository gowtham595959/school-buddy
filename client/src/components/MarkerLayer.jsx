import React from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

// Public file URLs (no import needed)
const iconBlue = "/icons/School_build.png";
const iconRed = "/icons/School_red.png";
const iconBlack = "/icons/school_black.png";

const schoolIcons = {
  tiffin: L.icon({ iconUrl: iconBlue, iconSize: [38, 38], iconAnchor: [19, 38] }),
  nonsuch: L.icon({ iconUrl: iconRed, iconSize: [38, 38], iconAnchor: [19, 38] }),
  wallington: L.icon({ iconUrl: iconBlack, iconSize: [38, 38], iconAnchor: [19, 38] }),
};

export default function MarkerLayer({ schools }) {
  return (
    <>
      {schools.map((s) => {
        let icon;

        if (s.name.includes("Tiffin")) icon = schoolIcons.tiffin;
        else if (s.name.includes("Nonsuch")) icon = schoolIcons.nonsuch;
        else icon = schoolIcons.wallington;

        return (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={icon}>
            <Tooltip>{s.name}</Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
