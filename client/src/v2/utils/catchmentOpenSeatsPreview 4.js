/**
 * Shared logic for "Open seats" in the 11+ Catchment drawer header (pill preview).
 */

export function getOpenStreamDefinitions(defs) {
  if (!Array.isArray(defs)) return [];
  return defs.filter((d) => {
    const gt = String(d?.geography_type || "").toLowerCase().trim();
    const ck = String(d?.catchment_key || "").toLowerCase().trim();
    return gt === "open" || ck === "open";
  });
}

export function formatOpenSeatsFromDefs(openDefs) {
  if (!openDefs.length) return null;
  if (openDefs.length === 1) {
    const d = openDefs[0];
    const disp = d.catchment_alloc_seats_display?.trim();
    if (disp) return disp;
    if (d.catchment_alloc_seats != null && d.catchment_alloc_seats !== "") {
      return String(d.catchment_alloc_seats);
    }
    return null;
  }
  let sum = 0;
  let numericCount = 0;
  for (const d of openDefs) {
    const n = Number(d.catchment_alloc_seats);
    if (Number.isFinite(n)) {
      sum += n;
      numericCount += 1;
    }
  }
  if (numericCount === openDefs.length) return String(sum);
  return (
    openDefs
      .map((d) => formatOpenSeatsFromDefs([d]))
      .filter(Boolean)
      .join(" · ") || null
  );
}

function sortedCatchmentYears(payload) {
  const defs = payload?.definitions ?? [];
  const policies = payload?.admissionsPolicies ?? [];
  const set = new Set();
  defs.forEach((d) => {
    if (d.catchment_year != null) set.add(d.catchment_year);
  });
  policies.forEach((p) => {
    if (p.entry_year != null) set.add(p.entry_year);
  });
  return Array.from(set).sort((a, b) => (b || 0) - (a || 0));
}

/**
 * Sum integers found in a display string for tier colouring.
 * Splits on · / • ; strips commas and non-digits per segment (handles "~2,400", "180 · 210").
 * @returns {number|null}
 */
export function parseOpenSeatsNumericFromDisplay(valueStr) {
  if (valueStr == null) return null;
  const s = String(valueStr).trim();
  if (!s) return null;
  const parts = s.split(/[·•]+/).map((p) => p.trim()).filter(Boolean);
  const segments = parts.length ? parts : [s];
  let total = 0;
  let found = false;
  for (const seg of segments) {
    const digits = seg.replace(/[^\d]/g, "");
    if (digits) {
      total += Number(digits);
      found = true;
    }
  }
  return found ? total : null;
}

/** Tier for header chip CSS: green &gt; 75, amber 21–75, red 0–20, neutral if not numeric. */
export function getOpenSeatsChipTier(numeric) {
  if (numeric == null || !Number.isFinite(numeric)) return "neutral";
  if (numeric > 75) return "green";
  if (numeric > 20) return "amber";
  return "red";
}

function computeOpenSeatsDisplayValue(payload, school) {
  if (!payload) return null;

  const years = sortedCatchmentYears(payload);
  const effectiveYear = years[0] ?? null;

  const defsAll = payload.definitions ?? [];
  const policies = payload.admissionsPolicies ?? [];

  const definitionsForYear =
    effectiveYear != null
      ? defsAll
          .filter((d) => d.catchment_year === effectiveYear)
          .sort((a, b) => (a.catchment_priority ?? 99) - (b.catchment_priority ?? 99))
      : [];

  const policyForYear =
    effectiveYear != null ? policies.find((p) => p.entry_year === effectiveYear) ?? null : null;

  const payloadSchool = payload.school || {};
  const schoolRow = school || {};
  const cat = String(
    payloadSchool.catchment_category || schoolRow.catchment_category || ""
  ).toLowerCase();

  const openDefs = getOpenStreamDefinitions(definitionsForYear);

  if (cat === "open") {
    if (policyForYear?.total_intake != null) {
      return String(policyForYear.total_intake);
    }
    if (openDefs.length) {
      return formatOpenSeatsFromDefs(openDefs);
    }
  } else if (openDefs.length > 0) {
    return formatOpenSeatsFromDefs(openDefs);
  }

  return null;
}

/**
 * @returns {{ label: string, tier: 'green' | 'amber' | 'red' | 'neutral' } | null} null only if !payload
 */
export function getOpenSeatsHeaderChipInfo(payload, school) {
  if (!payload) return null;

  const value = computeOpenSeatsDisplayValue(payload, school);
  const valueTrimmed = value != null && String(value).trim() !== "" ? String(value).trim() : "";
  const label = valueTrimmed ? `Open seats - ${valueTrimmed}` : "Open seats - 0";

  let tier;
  if (!valueTrimmed) {
    tier = "red";
  } else {
    const numeric = parseOpenSeatsNumericFromDisplay(valueTrimmed);
    tier = numeric == null ? "neutral" : getOpenSeatsChipTier(numeric);
  }

  return { label, tier };
}

/**
 * Label for the collapsed Catchment section chip, e.g. "Open seats - 100".
 * @deprecated Prefer getOpenSeatsHeaderChipInfo for styling.
 */
export function getOpenSeatsHeaderChipLabel(payload, school) {
  const info = getOpenSeatsHeaderChipInfo(payload, school);
  return info?.label ?? null;
}
