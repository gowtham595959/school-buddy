
# Project Architecture Summary

This document summarises backend + frontend architecture.

# Backend Architecture (ASCII Diagram)

______________________________
 Backend Architecture Diagram
------------------------------
        ┌──────────────────────┐
        │      Client UI       │
        │    (React/Leaflet)   │
        └──────────┬───────────┘
                   │ HTTP API
                   ▼
        ┌──────────────────────┐
        │     Express API      │
        │   /api/schools       │
        │   /api/...           │
        └──────────┬───────────┘
                   │ uses
                   ▼
        ┌──────────────────────┐
        │    PostgreSQL +      │
        │      PostGIS         │
        └──────────────────────┘

# Frontend Architecture (ASCII Diagram)

______________________________
 Frontend Architecture Diagram
------------------------------
        ┌────────────────────────────┐
        │   <App.jsx>                │
        │   - Loads schools          │
        │   - Manages UI state       │
        └─────────────┬──────────────┘
                      │ props
                      ▼
        ┌────────────────────────────┐
        │   <MapView.jsx>            │
        │   - Renders Leaflet map    │
        │   - Draws markers, circles │
        │   - Fetches Tiffin polygon │
        └─────────────┬──────────────┘
                      │ calls backend
                      ▼
        ┌────────────────────────────┐
        │  /api/schools/catchment/...│
        └────────────────────────────┘

# Project File Tree

/workspaces/school-buddy
├── README.md
├── bundle.sh
├── client
│   ├── README.md
│   ├── frontend.log
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── leaflet-test.html
│   │   ├── logo.png
│   │   ├── logo192.png
│   │   ├── logo512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   └── src
│       ├── App.css
│       ├── App.js
│       ├── App.test.js
│       ├── MapView.jsx
│       ├── api.js
│       ├── index.css
│       ├── index.js
│       ├── logo.svg
│       ├── reportWebVitals.js
│       └── setupTests.js
├── db
│   ├── init.sql
│   └── seed.sql
├── docker-compose.yml
├── docs
│   ├── 2025-12-01_00-31-01
│   │   ├── API_2025-12-01_00-31-01.md
│   │   ├── API_ROUTES_RAW_2025-12-01_00-31-01.txt
│   │   ├── ARCHITECTURE_2025-12-01_00-31-01.md
│   │   ├── COMPONENT_GRAPH_2025-12-01_00-31-01.md
│   │   ├── DB_SCHEMA_2025-12-01_00-31-01.md
│   │   ├── FILE_TREE_2025-12-01_00-31-01.md
│   │   ├── diagram_architecture_2025-12-01_00-31-01.mmd
│   │   └── diagram_routes_2025-12-01_00-31-01.mmd
│   └── 2025_12_01_00_42_52
│       └── ARCHITECTURE_SUMMARY.md
├── gis
│   ├── build_tiffin.js
│   ├── build_tiffin_catchment.py
│   ├── load_postcodes.py
│   ├── load_tiffin_postcodes.py
│   ├── package-lock.json
│   ├── package.json
│   ├── postcode_geojson
│   │   ├── CR.geojson
│   │   ├── KT.geojson
│   │   ├── SM.geojson
│   │   ├── SW.geojson
│   │   ├── TW.geojson
│   │   └── W.geojson
│   ├── tiffin_boundary.geojson
│   ├── tiffin_individual.geojson
│   └── update_tiffin_db.js
├── milestone_1_backup.zip
├── package-lock.json
├── project-tree.txt
├── project_bundle.txt
├── schools.json
├── scripts
│   ├── backup.sh
│   ├── codeRestart.sh
│   ├── generate_full_docs.sh
│   ├── milestone_gitCommit_backup.sh
│   ├── openDB.sh
│   ├── restore.sh
│   ├── startup.sh
│   └── zip_repo_only_code.sh
└── server
    ├── backend.log
    ├── package-lock.json
    ├── package.json
    └── src
        ├── db.js
        ├── index.js
        └── routes
            ├── catchment.js
            ├── schools.js
            └── tiffin.js

14 directories, 72 files
