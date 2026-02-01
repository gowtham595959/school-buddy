import React from "react";

export default function CatchmentResultsList({ results }) {
  if (!results) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h4>Schools in your home catchment</h4>

      {results.length === 0 ? (
        <div style={{ fontSize: 13, color: "#555" }}>
          No schools found in your home catchment.
        </div>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {results.map((school) => (
            <li key={school.school_id} style={{ marginBottom: 6 }}>
              {school.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
