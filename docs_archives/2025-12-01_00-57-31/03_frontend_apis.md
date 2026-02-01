# Frontend API Usage — 2025-12-01_00-57-31

This section lists which frontend files call backend `/api/...` endpoints.

We scan for:

- `fetch("/api/...")`
- `axios.get("/api/...")`, `axios.post("/api/...")`, etc.

## API call sites

- /workspaces/school-buddy/client/src/MapView.jsx:54:        const res = await fetch("/api/schools/catchment/tiffin");
- /workspaces/school-buddy/client/src/App.js:11:    fetch("/api/schools")
