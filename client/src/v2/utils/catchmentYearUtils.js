/**
 * Filter catchment definitions to the latest catchment_year only.
 * Used for map drawing and bounds fitting so we don't show duplicate geometries.
 * If no definitions have catchment_year, returns all definitions (fallback).
 */
export function filterDefinitionsToLatestYear(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) return definitions;
  const years = definitions.map((d) => d.catchment_year).filter(Number.isFinite);
  if (years.length === 0) return definitions;
  const latestYear = Math.max(...years);
  return definitions.filter((d) => d.catchment_year === latestYear);
}
