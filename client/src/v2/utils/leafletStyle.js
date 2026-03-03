function pick(def, key, fallback) {
  return def?.style?.[key] ?? fallback;
}

function priority(def) {
  const p = def?.catchment_priority;
  if (p == null) return null;
  if (typeof p === "number") return p;

  const s = String(p).toUpperCase();
  if (s.startsWith("P")) {
    const n = Number(s.slice(1));
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

function baseSchoolColor(def) {
  return def?._schoolColor || "#64748B";
}

function priorityTuning(def) {
  const p = priority(def);

  if (p === 1) {
    return {
      mergedFillOpacity: 0.3,
      mergedWeight: 3,
      indWeight: 2,
      indStrokeOpacity: 0.9,
      indFillOpacity: 0.02,
    };
  }

  if (p === 2) {
    return {
      mergedFillOpacity: 0.26,
      mergedWeight: 2,
      indWeight: 2,
      indStrokeOpacity: 0.85,
      indFillOpacity: 0.01,
    };
  }

  return {
    mergedFillOpacity: 0.22,
    mergedWeight: 2,
    indWeight: 1.5,
    indStrokeOpacity: 0.8,
    indFillOpacity: 0.01,
  };
}

function defaultMergedFillOpacity(def) {
  const t = priorityTuning(def);
  return t.mergedFillOpacity;
}

function priorityMergedFillColor(def) {
  const p = priority(def);
  if (p === 1) return "#0D9488";
  if (p === 2) return "#FB7185";
  if (p === 3) return "#6366F1";
  return "#64748B";
}

/* =========================
   INDIVIDUAL STYLE
   (NO FILL)
========================= */

export function individualStyle(def) {
  const isPostcode =
    def?.geography_type === "postcode_district" ||
    def?.geography_type === "postcode_sector";

  const t = priorityTuning(def);
  const base = baseSchoolColor(def);

  const strokeColor = pick(def, "stroke_color", base);

  return {
    color: strokeColor,
    weight: Number(pick(def, "individual_weight", t.indWeight)),
    opacity: (Number(pick(def, "stroke_opacity", t.indStrokeOpacity)) || 0) * (isPostcode ? 0.4 : 1),


    // Individuals have no fill
    fill: false,
    fillOpacity: 0,

    dashArray: isPostcode ? null : "4 6",

    lineJoin: "round",
    lineCap: "round",
  };
}

/* =========================
   MERGED STYLE
========================= */

export function mergedStyle(def) {
  const t = priorityTuning(def);
  const base = baseSchoolColor(def);

  const strokeColor = pick(def, "stroke_color", base);

  const mergedFillColor = pick(
    def,
    "merged_fill_color",
    priorityMergedFillColor(def)
  );

  const mergedFillOpacity = Number(
    pick(def, "merged_fill_opacity", t.mergedFillOpacity)
  );

  return {
    color: strokeColor,
    weight: Number(pick(def, "merged_weight", t.mergedWeight)),
    opacity: Number(pick(def, "stroke_opacity", 1)),

    fillColor: mergedFillColor,
    fillOpacity: Number.isFinite(mergedFillOpacity)
      ? mergedFillOpacity
      : defaultMergedFillOpacity(def),

    lineJoin: "round",
    lineCap: "round",
  };
}
