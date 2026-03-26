#!/bin/bash

# ==============================
# CONFIG
# ==============================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CONTAINER="schoolbuddy-postgis"
DB="schoolmap"
USER="postgres"

BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP=$(date +"%d-%b_%H_%M")
OUTFILE="$BACKUP_DIR/db_table_all_$TIMESTAMP.txt"

# Tables to exclude from FULL DATA dump (summary still included)
EXCLUDE_FULL_DATA=(
  "spatial_ref_sys"
)

# Tables that should be dumped in "slim" mode (no full boundaries)
# We still print rows, but replace big geometry/json with stats/byte sizes.
SLIM_GEO_TABLES=(
  "canonical_geometries"
  "catchment_geometries"
  "catchments"
  "catchments_backup"
  "postcode_areas_tmp"
  "postcodes"
  "deprecated_geojson_raw"
)

mkdir -p "$BACKUP_DIR"

echo "Starting SchoolMap full DB inspection backup..."
echo "Output file: $OUTFILE"
echo

# ==============================
# GET TABLE LIST
# ==============================
ALL_TABLES=$(docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

TABLE_COUNT=$(echo "$ALL_TABLES" | wc -l | tr -d ' ')

# ==============================
# SPLIT TABLES BY ROW COUNT
# ==============================
TABLES_WITH_ROWS=()
TABLES_EMPTY=()

for TABLE in $ALL_TABLES; do
  ROW_COUNT=$(docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
    "SELECT count(*) FROM public.\"$TABLE\";")

  if [ "$ROW_COUNT" -gt 0 ]; then
    TABLES_WITH_ROWS+=("$TABLE")
  else
    TABLES_EMPTY+=("$TABLE")
  fi
done

ORDERED_TABLES=("${TABLES_WITH_ROWS[@]}" "${TABLES_EMPTY[@]}")

# Helper: check if array contains value
contains() {
  local seeking=$1; shift
  local item
  for item in "$@"; do
    [[ "$item" == "$seeking" ]] && return 0
  done
  return 1
}

# ==============================
# WRITE BACKUP
# ==============================
{
  echo "=============================================="
  echo "DATABASE: $DB"
  echo "GENERATED: $TIMESTAMP"
  echo "TOTAL TABLES: $TABLE_COUNT"
  echo "=============================================="
  echo
  echo "========== TABLE SUMMARY =========="
  echo

  for TABLE in "${ORDERED_TABLES[@]}"; do
    echo "----------------------------------------------"
    echo "TABLE: public.$TABLE"

    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'ROW COUNT: ' || count(*) FROM public.\"$TABLE\";"

    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'COLUMN COUNT: ' || count(*)
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='$TABLE';"

    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'TABLE SIZE KB: ' ||
              pg_total_relation_size('public.$TABLE') / 1024;"

    echo -n "COLUMNS: "
    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT string_agg(
                column_name || '(' || data_type || ')',
                ', ' ORDER BY ordinal_position
              )
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='$TABLE';"

    echo
    echo
  done

  echo
  echo "=============================================="
  echo "FULL TABLE DATA"
  echo "=============================================="
  echo

  for TABLE in "${ORDERED_TABLES[@]}"; do
    echo "##############################################"
    echo "DATA: public.$TABLE"
    echo "##############################################"

    if contains "$TABLE" "${EXCLUDE_FULL_DATA[@]}"; then
      echo "NOTE: Full data not printed for this table."
      echo "Reason: system-managed / noisy table."
      echo
      continue
    fi

    # Slim output for geo-heavy tables
    if contains "$TABLE" "${SLIM_GEO_TABLES[@]}"; then
      echo "NOTE: Slim dump (no full boundaries)."
      echo

      case "$TABLE" in
        canonical_geometries)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              id,
              geography_type,
              member_code,
              name,
              source,
              dataset_version,
              updated_at,
              ST_GeometryType(geom) AS geom_type,
              ST_NPoints(geom) AS geom_points,
              ROUND((ST_Area(geom::geography)/1000000.0)::numeric, 3) AS area_km2,
              octet_length(geojson::text) AS geojson_bytes
            FROM public.canonical_geometries
            ORDER BY geography_type, member_code
            LIMIT 200;
          "
          echo "NOTE: canonical_geometries limited to first 200 rows for readability."
          ;;

        catchment_geometries)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              id,
              school_id,
              school_name,
              catchment_key,
              geometry_kind,
              member_code,
              built_from_members_hash,
              updated_at,
              octet_length(geojson::text) AS geojson_bytes
            FROM public.catchment_geometries
            ORDER BY school_id, catchment_key, geometry_kind, member_code
            LIMIT 500;
          "
          echo "NOTE: catchment_geometries limited to first 500 rows for readability."
          ;;

        catchments|catchments_backup)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              id,
              school_id,
              type,
              year,
              active,
              created_at,
              updated_at,
              ST_GeometryType(boundary_geom) AS geom_type,
              ST_NPoints(boundary_geom) AS geom_points,
              ROUND((ST_Area(boundary_geom::geography)/1000000.0)::numeric, 3) AS area_km2,
              octet_length(boundary_geojson::text) AS geojson_bytes
            FROM public.\"$TABLE\"
            ORDER BY school_id, type, year
            LIMIT 200;
          "
          echo "NOTE: $TABLE limited to first 200 rows for readability."
          ;;

        postcode_areas_tmp)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              postcode_area,
              ST_GeometryType(geom) AS geom_type,
              ST_NPoints(geom) AS geom_points,
              ROUND((ST_Area(geom::geography)/1000000.0)::numeric, 3) AS area_km2
            FROM public.postcode_areas_tmp
            ORDER BY postcode_area;
          "
          ;;

        postcodes)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              id,
              code,
              ST_GeometryType(geom) AS geom_type
            FROM public.postcodes
            ORDER BY id
            LIMIT 200;
          "
          echo "NOTE: postcodes limited to first 200 rows for readability."
          ;;

        deprecated_geojson_raw)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
            SELECT
              octet_length(data::text) AS json_bytes,
              left(data::text, 200) AS json_preview
            FROM public.deprecated_geojson_raw;
          "
          ;;

        *)
          docker exec "$CONTAINER" psql -U "$USER" -d "$DB" \
            -c "SELECT * FROM public.\"$TABLE\" LIMIT 200;"
          echo "NOTE: default slim limit 200 rows."
          ;;
      esac

      echo
      continue
    fi

    # Normal full dump for non-geo tables
    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" \
      -c "SELECT * FROM public.\"$TABLE\";"

    echo
  done

} > "$OUTFILE"

echo "Backup complete."
echo "Saved to: $OUTFILE"
