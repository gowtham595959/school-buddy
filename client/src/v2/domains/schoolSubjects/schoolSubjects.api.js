export async function fetchSchoolSubjectsBySchoolId(schoolId) {
  const res = await fetch(`/api/schools/${schoolId}/subjects`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Failed to fetch subjects for school ${schoolId}`);
  return res.json();
}
