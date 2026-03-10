#!/bin/bash

OUTPUT="project_bundle.txt"

echo "Creating full project bundle..." > "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Scanning project directories..."
echo "" >> "$OUTPUT"

find . \
  -type f \
  \( -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.sql" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/scripts/backups/*" \
  ! -path "*/gis/postcode_geojson/*" \
  ! -name "*.log" \
  ! -name "*.zip" \
  -print0 | while IFS= read -r -d '' file; do

    echo "=========================================" >> "$OUTPUT"
    echo "FILE: $file" >> "$OUTPUT"
    echo "=========================================" >> "$OUTPUT"
    echo "" >> "$OUTPUT"

    cat "$file" >> "$OUTPUT"

    echo "" >> "$OUTPUT"
    echo "" >> "$OUTPUT"

done

echo "DONE! Wrote output to $OUTPUT"
