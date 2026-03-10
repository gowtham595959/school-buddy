// server/src/routes/styles.js

const express = require("express");
const router = express.Router();

/**
 * Returns polygon style definitions
 */
router.get("/:schoolId", (req, res) => {
  const id = Number(req.params.schoolId);

  const styles = {
    1: { color: "#1e90ff", weight: 2, fillOpacity: 0.25 },
    2: { color: "#32cd32", weight: 2, fillOpacity: 0.25 },
    3: { color: "#ff8c00", weight: 2, fillOpacity: 0.25 },
  };

  res.json(styles[id] || styles[1]);
});

module.exports = router;
