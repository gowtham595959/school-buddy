/** Ofsted overall effectiveness → chip label + CSS tier suffix (England). */
export function getInspectionOverallChip(grade) {
  const g = String(grade || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!g) return { label: "See report", tier: "unknown" };
  if (g === "outstanding") return { label: "Outstanding", tier: "outstanding" };
  if (g === "good") return { label: "Good", tier: "good" };
  if (g === "requires improvement" || g === "requiresimprovement") {
    return { label: "Requires improvement", tier: "requires_improvement" };
  }
  if (g === "inadequate") return { label: "Inadequate", tier: "inadequate" };
  const titled = String(grade).trim();
  return { label: titled || "See report", tier: "unknown" };
}
