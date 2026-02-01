#!/usr/bin/env bash
# --------------------------------------------------------
# Dump project source files into a single text file.
#
# 1) Prints filtered file tree
# 2) Prints contents of selected code/config files
#
# Generic, reusable, read-only.
# --------------------------------------------------------

# Project root and backup directory
ROOT_DIR="/workspaces/school-buddy"
BACKUP_DIR="$ROOT_DIR/backups"

# Timestamp format: 16-Dec_14_32
TIMESTAMP=$(date +"%d-%b_%H_%M")
OUTPUT="$BACKUP_DIR/file_format_backup_${TIMESTAMP}.txt"

# Max file size (bytes) for .txt files
MAX_TXT_SIZE=51200  # 50 KB

# Extensions to include
INCLUDE_EXTENSIONS="js jsx ts tsx json yaml yml md txt sh"

# Directories to exclude
EXCLUDE_DIRS=(
  node_modules
  .git
  dist
  build
  .cache
  backups
  docs
  docs_archives
)

# Files to exclude by name pattern
EXCLUDE_PATTERNS=(
  "*.log"
  "*.lock"
  "*.min.js"
  "*.map"
  "package-lock.json"
  "project_bundle.txt"
  "project-tree.txt"
  "schools.json"
)

echo "📄 Creating file format backup"
echo "📂 Project root: $ROOT_DIR"
echo "📁 Backup directory: $BACKUP_DIR"
echo "🕒 Timestamp: $TIMESTAMP"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Change to project root for clean relative paths
cd "$ROOT_DIR" || exit 1

# Check if path contains excluded dir
is_excluded_dir () {
  for d in "${EXCLUDE_DIRS[@]}"; do
    [[ "$1" == *"/$d/"* ]] && return 0
  done
  return 1
}

# Check excluded file patterns
is_excluded_file () {
  for p in "${EXCLUDE_PATTERNS[@]}"; do
    [[ "$(basename "$1")" == $p ]] && return 0
  done
  return 1
}

# Check extension
has_allowed_extension () {
  ext="${1##*.}"
  for e in $INCLUDE_EXTENSIONS; do
    [[ "$ext" == "$e" ]] && return 0
  done
  return 1
}

# --------------------------------------------------------
# 1) FILE TREE
# --------------------------------------------------------
{
  echo "########## FILE TREE ##########"
  find . -type f | while read -r file; do
    is_excluded_dir "$file" && continue
    is_excluded_file "$file" && continue
    has_allowed_extension "$file" || continue
    echo "${file#./}"
  done
  echo
} > "$OUTPUT"

# --------------------------------------------------------
# 2) FILE CONTENTS
# --------------------------------------------------------
find . -type f | while read -r file; do
  is_excluded_dir "$file" && continue
  is_excluded_file "$file" && continue
  has_allowed_extension "$file" || continue

  # Size guard for .txt files
  if [[ "$file" == *.txt ]]; then
    size=$(stat -c%s "$file" 2>/dev/null || wc -c < "$file")
    [[ "$size" -gt "$MAX_TXT_SIZE" ]] && continue
  fi

  {
    echo "########## FILE: ${file#./} ##########"
    echo
    sed 's/\t/  /g' "$file"
    echo
    echo
  } >> "$OUTPUT"
done

echo "########## END OF BACKUP ##########" >> "$OUTPUT"

echo "✅ File format backup complete."
echo "➡️  Output written to:"
echo "    $OUTPUT"
