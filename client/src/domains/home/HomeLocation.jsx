import React from "react";
import HomePostcodeInput from "../../components/HomePostcodeInput";

/**
 * HomeLocation
 * ------------
 * Render-only UI wrapper for home location input.
 *
 * Responsibilities:
 * - Render postcode input
 * - Display error (if any)
 * - Delegate submit handling upward
 *
 * IMPORTANT:
 * - No fetch
 * - No state
 * - No map interaction
 */
export default function HomeLocation({
  defaultPostcode,
  onSubmit,
  error,
}) {
  return (
    <div>
      <HomePostcodeInput
        defaultPostcode={defaultPostcode}
        onSubmit={onSubmit}
        errorMessage={error}
      />
    </div>
  );
}
