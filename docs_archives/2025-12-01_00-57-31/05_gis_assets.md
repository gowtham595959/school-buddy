# GIS Assets — 2025-12-01_00-57-31

## GeoJSON files in `gis/`

- tiffin_boundary.geojson
- tiffin_individual.geojson

## Where these files are referenced in server code

### tiffin_boundary.geojson

    /workspaces/school-buddy/server/src/routes/tiffin.js:45:const boundaryPath = path.join(__dirname, "../../../gis/tiffin_boundary.geojson");

### tiffin_individual.geojson

    /workspaces/school-buddy/server/src/routes/tiffin.js:46:const postcodePath = path.join(__dirname, "../../../gis/tiffin_individual.geojson");

