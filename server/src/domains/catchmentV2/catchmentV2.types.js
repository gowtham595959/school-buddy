// server/src/domains/catchmentV2/catchmentV2.types.js

const GEOMETRY_KIND = {
  MERGED: "merged",
  INDIVIDUAL: "individual",
};

const GEOMETRY_STATUS = {
  READY: "ready",
  MISSING: "missing",
};

module.exports = { GEOMETRY_KIND, GEOMETRY_STATUS };
