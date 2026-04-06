import React from "react";

function kmToMiles(km) {
  if (typeof km !== "number") return null;
  return km * 0.621371;
}

function formatDuration(minutes) {
  if (typeof minutes !== "number") return "";
  if (minutes < 60) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} Hr${h > 1 ? "s" : ""} ${m} Min`;
}

function modeLabel(mode) {
  if (!mode) return "";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function modeEmoji(mode) {
  switch (mode) {
    case "driving":
      return "🚗";
    case "transit":
      return "🚌";
    case "walking":
      return "🚶";
    case "bicycling":
      return "🚴";
    default:
      return "🧭";
  }
}

export default function TransportButton({
  route,
  onClick,
  isActive,
  optionIndex,
  onMouseEnter,
  onMouseLeave,
  compact = false,
}) {
  if (!route) return null;

  const miles = kmToMiles(route.distance_km);
  const milesText = typeof miles === "number" ? `${miles.toFixed(1)} mi` : "";
  const durationText = formatDuration(route.duration_minutes);

  const modeText =
    optionIndex != null
      ? `${modeLabel(route.mode)} ${optionIndex + 1}`
      : modeLabel(route.mode);

  const DOUBLE_SPACE = "\u00A0\u00A0";

  const pad = compact ? "5px 6px" : "8px 10px";
  const marginTop = compact ? 5 : 8;
  const emojiCol = compact ? 16 : 18;
  const fontWeightSection = compact ? 550 : 600;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 8,
        border: "1px solid #e5e5e5",
        marginTop,
        cursor: "pointer",
        background: isActive ? "#eef5ff" : "#fff",
        whiteSpace: "nowrap",
        fontSize: compact ? 12 : 14,
      }}
    >
      {/* LEFT SIDE: emoji + mode */}
      <span style={{ width: emojiCol, textAlign: "center", fontSize: compact ? 13 : undefined }}>
        {modeEmoji(route.mode)}
      </span>

      {DOUBLE_SPACE}

      <span style={{ fontWeight: fontWeightSection }}>
        {modeText}
      </span>

      {DOUBLE_SPACE}

      {/* Colon */}
      <span style={{ fontWeight: fontWeightSection }}>
        :
      </span>

      {DOUBLE_SPACE}

      {/* Duration */}
      <span>
        {durationText}
      </span>

      {DOUBLE_SPACE}

      {/* Distance */}
      <span style={{ color: "#666" }}>
        {milesText}
      </span>
    </div>
  );
}
