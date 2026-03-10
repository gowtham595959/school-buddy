// client/src/api.js
// LEGACY shared API helpers
// NOTE: This file is kept intentionally for backward compatibility.
// New feature work should use domain APIs instead (see client/src/domains/*).

const API_BASE = "/api";

export async function fetchSchools() {
  const res = await fetch(`${API_BASE}/schools`);
  return res.json();
}

export async function fetchCatchments(schoolId) {
  const res = await fetch(`${API_BASE}/catchments/${schoolId}`);
  return res.json();
}


