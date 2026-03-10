export async function fetchCatchmentsV2BySchoolId(schoolId) {
  const res = await fetch(`/api/catchments-v2/${schoolId}`, {
  cache: "no-store",
  headers: { "Cache-Control": "no-cache" },
});

  if (!res.ok) throw new Error(`Failed to fetch catchments-v2 for school ${schoolId}`);
  return res.json();
}
