
# Backend Request Flow

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

### Full Backend Flow Description
1. HTTP request hits `/api/...`
2. Express router resolves endpoint
3. Router calls PostgreSQL using Pool
4. Query result returns rows
5. JSON response sent back to frontend

