/**
 * Human-friendly subject labels for the Subjects drawer (DfE names → app copy).
 * "Other <category> (<detail>)..." → "<detail> - Other <category>"
 */
export function displaySubjectName(raw) {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return "—";
  if (!/^Other\b/i.test(s)) return s;
  const m = s.match(/^Other\s+(.+?)\s+\(([^)]+)\)/i);
  if (m) {
    const category = m[1].trim();
    const detail = m[2].trim();
    if (category && detail) {
      return `${detail} - Other ${category}`;
    }
  }
  return s;
}
