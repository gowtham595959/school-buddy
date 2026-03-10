// client/src/domains/schools/schools.api.js

/**
 * Schools Domain API
 * ------------------
 * Canonical source for fetching school data.
 *
 * IMPORTANT:
 * - DB is the source of truth
 * - XLS uploads must work without frontend changes
 */

export async function fetchSchools() {
  const res = await fetch("/api/schools");

  if (!res.ok) {
    throw new Error("Failed to fetch schools");
  }

  return res.json();
}
