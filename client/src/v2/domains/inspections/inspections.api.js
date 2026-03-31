export async function fetchInspectionsBySchoolId(schoolId) {
  const res = await fetch(`/api/schools/${schoolId}/inspections`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Failed to fetch inspections for school ${schoolId}`);
  return res.json();
}
