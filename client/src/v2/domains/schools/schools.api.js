export async function fetchSchools() {
  const res = await fetch("/api/schools");
  if (!res.ok) throw new Error("Failed to fetch schools");
  return res.json();
}
