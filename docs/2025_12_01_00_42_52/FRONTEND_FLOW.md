
# Frontend Flow

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

### Full Frontend Flow Description
1. App loads `/api/schools`
2. User selects school checkboxes
3. MapView renders:
   - markers
   - circles
   - Tiffin polygons (when selected)
4. Leaflet map updates automatically

