# GIS Assets — 2025-12-08_20-38-15

## GeoJSON files in `gis/`

- tiffin_boundary.geojson
- tiffin_individual.geojson

## Where these files are referenced in server code

### tiffin_boundary.geojson

    /workspaces/school-buddy/server/src/routes/tiffin.js:45:const boundaryPath = path.join(__dirname, "../../../gis/tiffin_boundary.geojson");

### tiffin_individual.geojson

    /workspaces/school-buddy/server/src/routes/tiffin.js:46:const postcodePath = path.join(__dirname, "../../../gis/tiffin_individual.geojson");

