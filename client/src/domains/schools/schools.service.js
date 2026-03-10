// client/src/domains/schools/schools.service.js

import { fetchSchools } from "./schools.api";

/**
 * Schools Service
 * ---------------
 * Thin orchestration layer.
 * Kept intentionally minimal.
 */

export async function loadSchools() {
  return fetchSchools();
}
