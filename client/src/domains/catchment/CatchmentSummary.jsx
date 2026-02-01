// client/src/domains/catchment/CatchmentSummary.jsx

import HomeCatchmentButton from "../../components/HomeCatchmentButton";
import CatchmentResultsList from "../../components/CatchmentResultsList";

/**
 * CatchmentSummary (Domain)
 *
 * Sidebar UI for catchment eligibility.
 * - Home catchment check button
 * - Error display
 * - Results list
 *
 * Pure UI composition:
 * - no data fetching
 * - no business logic
 */
export default function CatchmentSummary({
  homeLocation,
  onResults,
  error,
  setError,
  results,
}) {
  return (
    <>
      <HomeCatchmentButton
        homeLocation={homeLocation}
        onResults={onResults}
        setError={setError}
      />

      {error && (
        <div style={{ marginTop: 8, color: "red", fontSize: 12 }}>
          {error}
        </div>
      )}

      <CatchmentResultsList results={results} />
    </>
  );
}
