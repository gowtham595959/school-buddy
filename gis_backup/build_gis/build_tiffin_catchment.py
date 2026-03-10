import json
import geopandas as gpd
from shapely.ops import unary_union
import os

ROOT = "/workspaces/school-buddy/gis/postcode_geojson"

TIFFIN_CODES = [
    "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10","KT12","KT13","KT17","KT19",
    "TW1","TW2","TW3","TW4","TW5","TW7","TW8","TW9","TW10","TW11","TW12","TW13","TW14","TW15","TW16","TW17",
    "SW13","SW14","SW15","SW17","SW18","SW19","SW20",
    "W3","W4","W5","W7","W13","SM4","CR4"
]

def main():
    merged_geoms = []
    features = []

    for code in TIFFIN_CODES:
        prefix = ''.join([c for c in code if not c.isdigit()])
        file = os.path.join(ROOT, f"{prefix}.geojson")
        if not os.path.exists(file):
            print("Missing:", file)
            continue

        gdf = gpd.read_file(file)
        match = gdf[gdf["name"].str.upper() == code.upper()]
        if match.empty:
            print("Missing district:", code)
            continue

        geom = match.geometry.iloc[0]
        merged_geoms.append(geom)
        features.append({
            "type": "Feature",
            "geometry": json.loads(geom.to_json()),
            "properties": {"code": code}
        })

    merged = unary_union(merged_geoms)

    out = {
        "merged": json.loads(merged.to_json()),
        "postcodes": {
            "type": "FeatureCollection",
            "features": features
        }
    }

    with open("tiffin_catchment.json", "w") as f:
        json.dump(out, f, indent=2)

    print("✔ Done.")

if __name__ == "__main__":
    main()
