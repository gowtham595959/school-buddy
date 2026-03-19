// server/src/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES (v2-driven) ----------
const schoolsRoutes = require("./routes/schools");
const geocodeRoutes = require("./routes/geocode");
const transportRoutes = require("./routes/transport");
const catchmentsV2Routes = require("./routes/catchmentsV2");
const catchmentDomainRoutes = require("./routes/catchment");
const healthRoutes = require("./routes/health");

// ---------- REGISTER ROUTES ----------
app.use("/api/schools", schoolsRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/transport-route", transportRoutes);
app.use("/api/catchment", catchmentDomainRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/catchments-v2", catchmentsV2Routes);


// ---------- ROOT HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("SchoolBuddy API is running");
});

// ---------- SERVER START ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
