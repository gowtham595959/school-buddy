// client/src/components/HomeCatchmentButton.jsx

import React from "react";
import { fetchCatchmentEligibility } from "../domains/catchment/catchment.api";

export default function HomeCatchmentButton({
  homeLocation,
  onResults,
  setError,
}) {
  const handleClick = async () => {
    setError(null);

    try {
      if (
        !homeLocation ||
        typeof homeLocation.lat !== "number" ||
        typeof homeLocation.lon !== "number"
      ) {
        console.error("❌ Invalid catchment payload", homeLocation);
        setError("Set your home postcode first");
        return;
      }

      // ✅ Backend expects THIS SHAPE for /api/catchment-check
      const data = await fetchCatchmentEligibility({
        home_lat: homeLocation.lat,
        home_lon: homeLocation.lon,
      });

      if (!data || !Array.isArray(data.results)) {
        console.error("❌ Invalid catchment response payload", data);
        setError("Unable to fetch catchment results");
        return;
      }

      const insideCatchment = data.results.filter(
        (r) => r && r.inside_catchment === true
      );

      onResults(insideCatchment);
    } catch (err) {
      console.error("❌ Catchment eligibility failed", err);
      setError("Unable to fetch catchment results");
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        marginTop: 10,
        padding: "8px 10px",
        width: "100%",
        cursor: "pointer",
      }}
    >
      Schools in my home catchment
    </button>
  );
}
