# gis/load_postcodes.py
"""
One-off script to load postcode district polygons into the 'postcodes' table.

Prereqs:
- A GeoJSON or shapefile with all UK postcode district geometries
- psycopg2 and geopandas installed in your environment

Run:
  python gis/load_postcodes.py
"""

import os
import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_values

# 1. Config
DB_DSN = "postgresql://postgres:postgres@localhost:5432/schoolmap"
MASTER_FILE = "gis/data/all_postcode_districts.geojson"  # you will need to place this
TIFFIN_CODES = [
    "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10","KT12","KT13","KT17","KT19",
    "TW1","TW2","TW3","TW4","TW5","TW7","TW8","TW9","TW10","TW11","TW12","TW13","TW14","TW15","TW16","TW17",
    "SW13","SW14","SW15","SW17","SW18","SW19","SW20",
    "W3","W4","W5","W7","W13","SM4","CR4"
]

CODE_COL_CANDIDATES = ["pcd", "name", "code", "pcds", "district"]

def main():
  if not os.path.exists(MASTER_FILE):
    raise SystemExit(f"Master file not found at {MASTER_FILE}")

  print("Loading master postcode GeoJSON...")
  gdf = gpd.read_file(MASTER_FILE)
  print("Rows:", len(gdf), "columns:", list(gdf.columns))

  code_col = None
  for c in CODE_COL_CANDIDATES:
    if c in gdf.columns:
      code_col = c
      break

  if not code_col:
    raise SystemExit(f"Could not detect code column. Available: {gdf.columns}")

  gdf[code_col] = gdf[code_col].astype(str).str.upper().str.strip()

  subset = gdf[gdf[code_col].isin(TIFFIN_CODES)].copy()
  print("Matched districts:", subset[code_col].unique(), "count:", len(subset))

  if subset.empty:
    raise SystemExit("No matching districts found. Check codes or master file.")

  # Ensure CRS is WGS84
  if subset.crs and subset.crs.to_epsg() != 4326:
    subset = subset.to_crs(epsg=4326)

  # Prepare rows: (code, wkt)
  rows = [(row[code_col], row.geometry.wkt) for _, row in subset.iterrows()]

  print("Connecting to Postgres...")
  conn = psycopg2.connect(DB_DSN)
  cur = conn.cursor()
  print("Inserting into postcodes table...")

  execute_values(
    cur,
    """
    INSERT INTO postcodes (code, geom)
    VALUES %s
    ON CONFLICT (code) DO UPDATE
    SET geom = EXCLUDED.geom
    """.replace("geom)", "geom)".replace("geom", "ST_GeomFromText(%s, 4326)")),
    rows
  )

  conn.commit()
  cur.close()
  conn.close()
  print("Done.")

if __name__ == "__main__":
  main()
