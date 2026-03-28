#!/usr/bin/env bash
# Download official DfE bulk files for KS4 (GCSE) and 16–18 (A level) from
# Explore Education Statistics. Release UUIDs come from each release page HTML
# (search for content.explore-education-statistics.../api/releases/<uuid>/files).
#
# Usage: ./server/scripts/download_dfe_performance.sh
#
# Output: data/dfe-performance/*.zip
#
# School-level CSVs inside the archives (England state-funded; filter by school_urn):
#   KS4:   data/202425_performance_tables_schools_revised.csv
#          (+ optional data/202425_subject_school_all_exam_entriesgrades_revised.csv)
#   16–18: data/institution_performance_202225.csv
#          (+ optional data/institution_subject_and_qualification_results_202425.csv)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/data/dfe-performance"
mkdir -p "$OUT"

# Key stage 4 performance — academic year 2024/25 (revised)
KS4_RELEASE_ID="4e06e0e2-d705-462c-bb99-97afa166928c"
# A level and other 16 to 18 results — academic year 2024/25
ALEV_RELEASE_ID="915999c1-8e2b-412c-811b-272c2f0dcf48"

BASE="https://content.explore-education-statistics.service.gov.uk/api/releases"

echo "Downloading KS4 (GCSE) all files ZIP…"
curl -fSL -o "$OUT/ks4-2024-25_all_files.zip" "$BASE/$KS4_RELEASE_ID/files"

echo "Downloading A level / 16–18 all files ZIP…"
curl -fSL -o "$OUT/a-level-16-18-2024-25_all_files.zip" "$BASE/$ALEV_RELEASE_ID/files"

echo "Done. Listing school-level CSV paths in KS4 zip:"
unzip -l "$OUT/ks4-2024-25_all_files.zip" | grep -E 'performance_tables_schools|subject_school_all' || true
echo "Institution-level paths in 16–18 zip:"
unzip -l "$OUT/a-level-16-18-2024-25_all_files.zip" | grep -E 'institution_performance|institution_subject' || true
