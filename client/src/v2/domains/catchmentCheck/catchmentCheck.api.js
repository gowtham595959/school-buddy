// client/src/v2/domains/catchmentCheck/catchmentCheck.api.js
export async function fetchCatchmentCheck(payload) {
  const res = await fetch(`/api/catchment/eligibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Catchment check failed");
  }

  // array of { school_id, in_catchment, matched_by, distance_km }
  return res.json();
}
