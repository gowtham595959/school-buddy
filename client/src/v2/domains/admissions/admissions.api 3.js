export async function fetchAdmissionsPoliciesBySchoolId(schoolId) {
  const res = await fetch(`/api/admissions/school/${schoolId}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Failed to fetch admissions policies for school ${schoolId}`);
  return res.json();
}
