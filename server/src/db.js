// server/src/db.js
// Compatibility shim: existing code imports "../db" or "../../db".
// This keeps those imports working while the real implementation lives in ./db/pool.js.

module.exports = require("./db/pool");
