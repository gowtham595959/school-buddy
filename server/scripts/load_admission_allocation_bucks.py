#!/usr/bin/env python3
"""
Load Buckinghamshire allocation profile XLSX only (same as --only bucks on the unified script).

Requires: pip install psycopg2-binary openpyxl requests
  DATABASE_URL

Usage:
  PYTHONPATH=server/scripts python3 server/scripts/load_admission_allocation_bucks.py --dry-run
  PYTHONPATH=server/scripts python3 server/scripts/load_admission_allocation_bucks.py
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from admission_allocation.bucks import run as run_bucks  # noqa: E402
from admission_allocation.common import get_db_url, run_transaction  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db_url = get_db_url()
    if args.dry_run:
        run_bucks(None, dry_run=True)
        return
    if not db_url:
        print("Set DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    def work(cur) -> None:
        n, misses = run_bucks(cur, dry_run=False)
        print(f"Upserted {n} rows. Unmatched: {sorted(set(misses))}")

    run_transaction(db_url, work)


if __name__ == "__main__":
    main()
