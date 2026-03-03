// server/src/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES ----------
const schoolsRoutes = require("./routes/schools");
const catchmentsRoutes = require("./routes/catchments"); // geometry (plural)
const userRoutes = require("./routes/user");
const geocodeRoutes = require("./routes/geocode");
const catchmentCheckRoutes = require("./routes/catchmentCheck");
const transportRoutes = require("./routes/transport");
const catchmentsV2Routes = require("./routes/catchmentsV2");


// ✅ Catchment domain logic routes (singular)
const catchmentDomainRoutes = require("./routes/catchment");

// ✅ Health route
const healthRoutes = require("./routes/health");

// ❌ DEPRECATED — moved to routes/_deprecated
// const styleRoutes = require("./routes/styles");
// const tiffinIndividualsRoutes = require("./routes/tiffinIndividuals");

// ---------- REGISTER ROUTES ----------
app.use("/api/schools", schoolsRoutes);

// EXISTING — geometry & visual catchment data
app.use("/api/catchments", catchmentsRoutes);

// ❌ DEPRECATED — styles now DB-driven via catchment domain
// app.use("/api/styles", styleRoutes);

// ❌ DEPRECATED — Tiffin feature removed from frontend
// app.use("/api/tiffin", tiffinIndividualsRoutes);

app.use("/api/user", userRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/catchment-check", catchmentCheckRoutes);
app.use("/api/transport-route", transportRoutes);

// ✅ NEW — eligibility & future catchment logic
app.use("/api/catchment", catchmentDomainRoutes);

// ✅ NEW — health checks
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
