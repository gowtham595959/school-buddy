// client/src/v2/domains/home/useHomeLocation.js
import { useCallback, useState } from "react";
import { resolveHomeLocation } from "./home.service";
import { isValidUkPostcode, normalizeUkPostcode } from "./ukPostcode";

// same default home as legacy MapView
const DEFAULT_HOME_POSITION = [51.35139, -0.169696];

export function useHomeLocation(initialPostcode) {
  const [postcode, setPostcode] = useState(initialPostcode);
  const [homePosition, setHomePosition] = useState(DEFAULT_HOME_POSITION);
  const [homeError, setHomeError] = useState(null);

  const submitPostcode = useCallback(async (raw) => {
    const trimmed = normalizeUkPostcode(raw);

    if (!isValidUkPostcode(trimmed)) {
      setHomeError("Enter a valid UK postcode format");
      return;
    }

    try {
      setHomeError(null);
      setPostcode(trimmed);

      const { lat, lon } = await resolveHomeLocation(trimmed);
      setHomePosition([lat, lon]);
    } catch (err) {
      setHomeError(err?.message || "Unable to resolve postcode");
    }
  }, []);

  // ✅ NEW (additive): set home directly from map click (no API / no rewrite)
  const setHomeFromMap = useCallback((lat, lon) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setHomeError(null);
    setHomePosition([lat, lon]);

    // Replace postcode to avoid mixing old routes/address context.
    // Keep it simple: clear input; user can type a postcode again any time.
    setPostcode("");
  }, []);

  return {
    postcode,
    setPostcode,
    homePosition,
    homeError,
    submitPostcode,

    // ✅ additive export
    setHomeFromMap,
  };
}
