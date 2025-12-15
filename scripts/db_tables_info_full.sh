#!/bin/bash

# ==============================
# CONFIG
# ==============================
CONTAINER="schoolbuddy-postgis"
DB="schoolmap"
USER="postgres"

BACKUP_DIR="/workspaces/school-buddy/backups/db_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTFILE="$BACKUP_DIR/db_table_all_$TIMESTAMP.txt"

# Tables to exclude from FULL DATA dump (summary still included)
EXCLUDE_FULL_DATA=(
  "geojson_raw"
  "postcode_areas_tmp"
  "spatial_ref_sys"
  "catchments"
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

# Final ordered table list
ORDERED_TABLES=("${TABLES_WITH_ROWS[@]}" "${TABLES_EMPTY[@]}")

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

    # Row count
    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'ROW COUNT: ' || count(*) FROM public.\"$TABLE\";"

    # Column count
    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'COLUMN COUNT: ' || count(*)
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='$TABLE';"

    # Table size in KB
    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -Atc \
      "SELECT 'TABLE SIZE KB: ' ||
              pg_total_relation_size('public.$TABLE') / 1024;"

    # Columns (single line, ordered)
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
    echo "FULL DATA: public.$TABLE"
    echo "##############################################"

    if [[ " ${EXCLUDE_FULL_DATA[@]} " =~ " $TABLE " ]]; then
      echo "NOTE: Full data not printed for this table."
      echo "Reason: large geospatial or system-managed table."
      echo "Refer to a full pg_dump export for complete contents."
      echo
      continue
    fi

    docker exec "$CONTAINER" psql -U "$USER" -d "$DB" \
      -c "SELECT * FROM public.\"$TABLE\";"

    echo
  done

} > "$OUTFILE"

echo "Backup complete."
echo "Saved to: $OUTFILE"
