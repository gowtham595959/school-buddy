// server/src/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db');

const schoolsRouter = require('./routes/schools');

const app = express();

// ⬇️ Simple, permissive CORS for dev (could even be removed)
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// API routes (these will be hit via /api from the React proxy)
app.use('/api/schools', schoolsRouter);

const port = process.env.PORT || 5000;

// Bind to 0.0.0.0 so React dev server inside Codespace can reach it
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
