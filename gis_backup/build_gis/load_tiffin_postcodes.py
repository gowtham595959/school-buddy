"""
Load Tiffin Girls' postcode district polygons into PostgreSQL/PostGIS.
"""

import os
import json
import psycopg2
from psycopg2.extras import execute_values

TIFFIN_POSTCODES = [
    "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10","KT12","KT13","KT17","KT19",
    "TW1","TW2","TW3","TW4","TW5","TW7","TW8","TW9","TW10","TW11","TW12","TW13","TW14","TW15","TW16","TW17",
    "SW13","SW14","SW15","SW17","SW18","SW19","SW20",
    "W3","W4","W5","W7","W13","SM4","CR4"
]

GEOJSON_FOLDER = "postcode_geojson"
DB_DSN = "postgresql://postgres:postgres@localhost:5432/schoolmap"

NAME_FIELDS = ["name", "code", "pcd", "pcds", "district"]

def load_geojson(path):
    with open(path, "r") as f:
        return json.load(f)

def main():
    print("Connecting to DB...")
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    rows_to_insert = []

    for code in TIFFIN_POSTCODES:
        area = ''.join([c for c in code if not c.isdigit()])
        filepath = os.path.join(GEOJSON_FOLDER, f"{area}.geojson")

        if not os.path.exists(filepath):
            print(f"❌ Missing file for area {area}: {filepath}")
            continue

        print(f"Processing {code} from {filepath}")

        geo = load_geojson(filepath)

        # Detect correct property label
        name_field = next((f for f in NAME_FIELDS if f in geo["features"][0]["properties"]), None)
        if not name_field:
            raise ValueError(f"❌ No postcode label in {filepath}")

        # Find the exact district
        match = None
        for feat in geo["features"]:
            if str(feat["properties"][name_field]).upper() == code.upper():
                match = feat
                break

        if not match:
            print(f"⚠️ No polygon for {code} in {filepath}")
            continue

        geom_json = json.dumps(match["geometry"])
        rows_to_insert.append((code, geom_json))
        print(f"   → found polygon for {code}")

    if not rows_to_insert:
        print("❌ No polygons collected")
        return

    print("\nInserting polygons into PostGIS...")

    sql = """
        INSERT INTO postcodes (code, geom)
        VALUES %s
        ON CONFLICT (code)
        DO UPDATE SET geom = EXCLUDED.geom
    """

    execute_values(
        cur,
        sql,
        rows_to_insert,
        template="(%s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))"
    )

    conn.commit()
    cur.close()
    conn.close()

    print("\n✅ DONE — all Tiffin postcode polygons loaded as MULTIPOLYGONS!\n")

if __name__ == "__main__":
    main()
