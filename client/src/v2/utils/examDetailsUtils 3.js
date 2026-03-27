/**
 * Helpers for 11+ Exam panel (admissions_policies JSON + flags).
 */

const EXAM_DATE_LABELS = {
  application_start: "Application opens",
  application_end: "Application closes",
  registration_deadline: "Registration deadline",
  stage1_exam: "Stage 1 exam",
  stage1_result: "Stage 1 results",
  stage2_exam: "Stage 2 exam",
  stage2_result: "Stage 2 results",
  offered_day: "Offer day",
  appeal_deadline: "Appeal deadline",
};

export function isExamSectionEnabled(value) {
  return value === true;
}

/** Entrance test column (admission_test DB field): boolean → Yes / No / — */
export function formatAdmissionTestYesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/**
 * Split combined assessment text into one line per stage when the policy uses
 * patterns like "Stage 1 part, then stage 2 part" or semicolon-separated clauses.
 * Returns `null` to use the full string under every stage.
 */
export function splitAssessmentForStages(assessmentType, nStages) {
  const t = typeof assessmentType === "string" ? assessmentType.trim() : "";
  if (!t || nStages < 2) return null;

  const thenParts = t.match(/^(.+?),\s*then\s+(.+)$/is);
  if (thenParts) {
    const a = thenParts[1].trim().replace(/\s+/g, " ");
    const b = thenParts[2].trim().replace(/\s+/g, " ");
    if (nStages === 2) return [a, b];
  }

  const semi = t
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (semi.length >= nStages) return semi.slice(0, nStages);

  return null;
}

/**
 * Normalise DB value (JSONB object, JSON string, or legacy text) to a plain object for key_dates rows.
 */
export function coerceRecordObject(value) {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t);
      if (p && typeof p === "object" && !Array.isArray(p)) return p;
    } catch {
      /* prose in key_dates */
    }
    return { details: t };
  }
  return null;
}

/** Dates block reads only key_dates (JSONB). */
export function resolveKeyDatesForPanel(policy) {
  if (!policy) return null;
  return coerceRecordObject(policy.key_dates);
}

function labelFromKey(key) {
  if (!key || typeof key !== "string") return "—";
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Panel body / lists: Mathematics (and US "Math") → Maths; English casing. */
export function normalizeExamSubjectDetailLabel(name) {
  if (name == null || typeof name !== "string") return name;
  const t = name.trim();
  if (!t) return t;
  if (/^english$/i.test(t)) return "English";
  if (/^mathematics$/i.test(t) || /^math$/i.test(t)) return "Maths";
  return t;
}

/**
 * Collapsed drawer chip: short codes (VR, NVR, SR, CR) + canonical English / Maths.
 */
export function normalizeExamSubjectChipLabel(name) {
  const base = normalizeExamSubjectDetailLabel(name);
  if (base == null || typeof base !== "string") return base;
  const t = base.trim();
  if (!t) return t;
  if (/^english$/i.test(t)) return "English";
  if (/^verbal reasoning$/i.test(t) || /^verbal skills$/i.test(t)) return "VR";
  if (
    /^non-verbal reasoning$/i.test(t) ||
    /^non verbal reasoning$/i.test(t) ||
    /^non-verbal skills$/i.test(t) ||
    /^non verbal skills$/i.test(t)
  ) {
    return "NVR";
  }
  if (/^spatial reasoning$/i.test(t) || /^spatial skills$/i.test(t)) return "SR";
  if (/^creative writing$/i.test(t)) return "CR";
  return t;
}

const EXAM_SUBJECT_CHIP_SORT_ORDER = ["English", "Maths", "VR", "NVR", "SR", "CR"];

function sortExamSubjectChips(labels) {
  if (!labels.length) return [];
  const lower = (s) => s.toLowerCase();
  const canonicalByLower = new Map();
  for (const x of labels) {
    if (!canonicalByLower.has(lower(x))) canonicalByLower.set(lower(x), x);
  }
  const ordered = [];
  for (const o of EXAM_SUBJECT_CHIP_SORT_ORDER) {
    const c = canonicalByLower.get(lower(o));
    if (c != null) ordered.push(c);
  }
  const tail = labels.filter((x) => !EXAM_SUBJECT_CHIP_SORT_ORDER.some((o) => lower(o) === lower(x)));
  tail.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...ordered, ...tail];
}

/**
 * Rich subject row for exam_stages JSON: short copy + optional learn/practice link.
 * Strings in `subjects` arrays still work; objects unlock links and notes.
 *
 * Object keys (any optional except one name field):
 * - name | label | subject
 * - note | hint | tip — one short line under the name
 * - url | mock_tests_url | mock_test_url | resource_url | practice_url | link (string)
 * - link_label | linkLabel — anchor text (default in UI: "Practice & mock tests →")
 *
 * @returns {Array<{ name: string, url?: string, note?: string, linkLabel?: string }>}
 */
export function parseSubjectEntries(subjects) {
  const out = [];
  if (subjects == null) return out;

  if (typeof subjects === "string") {
    const t = normalizeExamSubjectDetailLabel(subjects.trim());
    if (t) out.push({ name: t });
    return out;
  }

  if (!Array.isArray(subjects)) return out;

  for (const x of subjects) {
    if (x == null) continue;
    if (typeof x === "string") {
      const n = normalizeExamSubjectDetailLabel(x.trim());
      if (n) out.push({ name: n });
      continue;
    }
    if (typeof x !== "object") continue;

    const name = normalizeExamSubjectDetailLabel(String(x.name ?? x.label ?? x.subject ?? "").trim());
    if (!name) continue;

    const noteRaw = x.note ?? x.hint ?? x.tip;
    const note = noteRaw != null && String(noteRaw).trim() ? String(noteRaw).trim() : undefined;

    const urlRaw = x.url ?? x.mock_tests_url ?? x.mock_test_url ?? x.resource_url ?? x.practice_url;
    let url = urlRaw != null && String(urlRaw).trim() ? String(urlRaw).trim() : undefined;
    if (!url && typeof x.link === "string" && x.link.trim()) url = x.link.trim();

    const ll = x.link_label ?? x.linkLabel;
    const linkLabel = ll != null && String(ll).trim() ? String(ll).trim() : undefined;

    out.push({ name, note, url, linkLabel });
  }

  return out;
}

/**
 * @returns {Array<{ stage: string, detail: string, subjectEntries: Array<{ name: string, url?: string, note?: string, linkLabel?: string }>, assessment_type?: string, test_authority?: string }>}
 */
export function normalizeExamStages(raw) {
  if (raw == null) return [];

  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (arr && typeof arr === "object" && !Array.isArray(arr) && Array.isArray(arr.stages)) {
    arr = arr.stages;
  }
  if (!Array.isArray(arr)) return [];

  return arr
    .map((item, idx) => {
      if (item == null) return null;

      if (typeof item === "string") {
        const t = normalizeExamSubjectDetailLabel(item.trim());
        if (!t) return null;
        return {
          stage: String(idx + 1),
          detail: t,
          subjectEntries: [{ name: t }],
        };
      }

      const num = item.stage ?? item.stage_number ?? item.stage_no ?? idx + 1;
      const subjectsRaw = item.subjects ?? item.papers ?? item.tests;
      let subjectEntries = parseSubjectEntries(subjectsRaw);
      if (subjectEntries.length === 0 && item.name && String(item.name).trim()) {
        subjectEntries = [{ name: normalizeExamSubjectDetailLabel(String(item.name).trim()) }];
      }
      if (subjectEntries.length === 0 && item.notes && String(item.notes).trim()) {
        subjectEntries = [{ name: normalizeExamSubjectDetailLabel(String(item.notes).trim()) }];
      }

      const detail = subjectEntries.length ? subjectEntries.map((s) => s.name).join(", ") : "—";

      const row = {
        stage: String(num),
        detail,
        subjectEntries,
      };
      const at = item.assessment_type;
      if (at != null && String(at).trim()) row.assessment_type = String(at).trim();
      const ta = item.test_authority;
      if (ta != null && String(ta).trim()) row.test_authority = String(ta).trim();
      return row;
    })
    .filter(Boolean);
}

/**
 * Key-value pairs for key_dates JSON object.
 */
export function flattenKeyDates(obj) {
  if (obj == null || typeof obj !== "object") return [];
  const entries = Object.entries(obj).filter(([, v]) => v != null && String(v).trim() !== "");
  const known = [];
  const rest = [];
  for (const [k, v] of entries) {
    if (EXAM_DATE_LABELS[k]) known.push([k, v]);
    else rest.push([k, v]);
  }
  known.sort(([a], [b]) => {
    const order = Object.keys(EXAM_DATE_LABELS);
    return order.indexOf(a) - order.indexOf(b);
  });
  rest.sort(([a], [b]) => a.localeCompare(b));
  return [...known, ...rest].map(([k, v]) => ({
    key: k,
    label: EXAM_DATE_LABELS[k] || labelFromKey(k),
    value: String(v),
  }));
}

/**
 * Snapshot object → label/value rows (stable order for common keys).
 */
export function flattenAllocationSnapshot(obj) {
  if (obj == null || typeof obj !== "object") return [];
  const preferred = [
    "total_applications",
    "registered_candidates",
    "sat_stage1",
    "cleared_stage1",
    "sat_stage2",
    "cutoff_mark",
    "cutoff_total_mark",
    "admissions_offered",
    "waitlist_size",
  ];
  const used = new Set();
  const rows = [];
  for (const k of preferred) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && String(obj[k]).trim() !== "") {
      rows.push({ key: k, label: labelFromKey(k), value: String(obj[k]) });
      used.add(k);
    }
  }
  const rest = Object.keys(obj)
    .filter((k) => !used.has(k) && obj[k] != null && String(obj[k]).trim() !== "")
    .sort();
  for (const k of rest) {
    rows.push({ key: k, label: labelFromKey(k), value: String(obj[k]) });
  }
  return rows;
}

/** Default policy for header chips: latest entry_year (matches exam panel). */
export function pickLatestAdmissionPolicy(policies) {
  if (!Array.isArray(policies) || policies.length === 0) return null;
  return policies.reduce((best, p) => {
    const y = p?.entry_year ?? 0;
    const by = best?.entry_year ?? 0;
    return y > by ? p : best;
  });
}

/** Unique subject chips from exam_stages, sorted: English, Maths, VR, NVR, SR, CR, then others A–Z. */
export function formatExamSubjectsChipFromPolicy(policy) {
  if (!policy) return "";
  const stages = normalizeExamStages(policy.exam_stages);
  const seen = new Set();
  const names = [];
  for (const s of stages) {
    for (const e of s.subjectEntries || []) {
      const chip = normalizeExamSubjectChipLabel(String(e.name || "").trim());
      if (!chip) continue;
      const key = chip.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(chip);
    }
  }
  return sortExamSubjectChips(names).join(" · ");
}

/** @deprecated use flattenKeyDates */
export function flattenExamDates(obj) {
  return flattenKeyDates(obj);
}
