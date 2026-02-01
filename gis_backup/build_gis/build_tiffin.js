// gis/build_tiffin.js
//
// Node script to build Tiffin catchment GeoJSONs from postcode
// district source files.
//
// Usage (from gis folder):
//   node build_tiffin.js
//
// Output:
//   - tiffin_individual.geojson   (all 44 postcode districts as separate Features)
//   - tiffin_boundary.geojson     (union/dissolved single catchment polygon)
//
// This script is run *offline*. The Express backend then simply
// reads these two files and serves them to the React frontend.

const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

// The 44 postcode district codes used by Tiffin Girls.
const TIFFIN_CODES = [
  "KT1",
  "KT2",
  "KT3",
  "KT4",
  "KT5",
  "KT6",
  "KT7",
  "KT8",
  "KT9",
  "KT10",
  "KT12",
  "KT13",
  "KT17",
  "KT19",
  "TW1",
  "TW2",
  "TW3",
  "TW4",
  "TW5",
  "TW7",
  "TW8",
  "TW9",
  "TW10",
  "TW11",
  "TW12",
  "TW13",
  "TW14",
  "TW15",
  "TW16",
  "TW17",
  "SW13",
  "SW14",
  "SW15",
  "SW17",
  "SW18",
  "SW19",
  "SW20",
  "W3",
  "W4",
  "W5",
  "W7",
  "W13",
  "SM4",
  "CR4",
];

// Folder containing raw postcode district GeoJSON files.
// E.g. KT.geojson, TW.geojson, etc.
const GEOJSON_FOLDER = path.join(__dirname, "postcode_geojson");

// Output file paths.
const OUT_INDIVIDUAL = path.join(__dirname, "tiffin_individual.geojson");
const OUT_BOUNDARY = path.join(__dirname, "tiffin_boundary.geojson");

// Given a postcode like "KT5", return the area file name "KT.geojson".
function areaFileForCode(code) {
  return code.replace(/[0-9].*$/, ""); // strip all digits
}

function main() {
  const features = [];

  // ----- Collect individual postcode features -----
  TIFFIN_CODES.forEach((code) => {
    const area = areaFileForCode(code);
    const filepath = path.join(GEOJSON_FOLDER, `${area}.geojson`);

    if (!fs.existsSync(filepath)) {
      console.warn(`❌ Missing source file for area ${area}: ${filepath}`);
      return;
    }

    const raw = fs.readFileSync(filepath, "utf8");
    const geo = JSON.parse(raw);

    // Find correct property field for the district code.
    const candidateFields = ["name", "code", "pcd", "pcds", "district"];
    const sampleProps = geo.features[0]?.properties || {};
    const nameField = candidateFields.find((f) => f in sampleProps);

    if (!nameField) {
      console.error(`❌ No suitable name field in ${filepath}`);
      return;
    }

    // Find the specific feature with properties[nameField] === code.
    const match = geo.features.find(
      (f) =>
        String(f.properties[nameField]).trim().toUpperCase() ===
        code.toUpperCase()
    );

    if (!match) {
      console.warn(`⚠️ No polygon found for ${code} in ${filepath}`);
      return;
    }

    console.log(`✔ Found ${code}`);

    // Normalize the properties to { code: "KT5" } etc.
    features.push({
      type: "Feature",
      geometry: match.geometry,
      properties: { code },
    });
  });

  console.log(`\nTotal polygons found: ${features.length}`);

  if (features.length === 0) {
    console.error("❌ No polygons collected, aborting.");
    process.exit(1);
  }

  // Write tiffin_individual.geojson as a FeatureCollection.
  const individualFC = {
    type: "FeatureCollection",
    features,
  };
  fs.writeFileSync(OUT_INDIVIDUAL, JSON.stringify(individualFC));
  console.log(`✅ Wrote individual postcodes: ${OUT_INDIVIDUAL}`);

  // ----- Build merged boundary using turf.union / dissolve fallback -----
  console.log("Merging polygons… this may take a few seconds…");

  let merged;

  try {
    // Attempt pairwise union over all features.
    merged = features.reduce((acc, feat, idx) => {
      if (!acc) return feat;
      return turf.union(acc, feat);
    }, null);
  } catch (err) {
    console.warn("⚠️ Union failed, retrying using dissolve approach:", err);

    // Fallback: dissolve all polygons by a constant property.
    const withKey = features.map((f) => ({
      ...f,
      properties: { group: "tiffin" },
    }));
    const fc = { type: "FeatureCollection", features: withKey };
    const dissolved = turf.dissolve(fc, { propertyName: "group" });

    merged = dissolved.features[0];
  }

  const mergedFC = {
    type: "FeatureCollection",
    features: [merged],
  };

  fs.writeFileSync(OUT_BOUNDARY, JSON.stringify(mergedFC));
  console.log(`✅ Wrote merged boundary: ${OUT_BOUNDARY}`);

  console.log("\n✅ DONE — Tiffin catchment GeoJSONs generated.\n");
}

main();
