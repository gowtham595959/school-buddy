#!/usr/bin/env python3
"""
Run all local-authority admission allocation loaders wired for schools in this database.

  - Buckinghamshire: grammar allocation profile XLSX (multi-year, multi-round).
  - Sutton: national offer day HTML table (PAN + furthest distance).
  - Kingston / Kent / Hertfordshire: placeholder rows linking to official admissions pages
    until borough-specific parsers exist.

Requires: pip install psycopg2-binary openpyxl requests
  DATABASE_URL

Usage:
  PYTHONPATH=server/scripts python3 server/scripts/load_admission_allocations.py --dry-run
  PYTHONPATH=server/scripts python3 server/scripts/load_admission_allocations.py
  PYTHONPATH=server/scripts python3 server/scripts/load_admission_allocations.py --only sutton --sutton-entry-year 2025
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from admission_allocation import bucks, fallback_councils, sutton  # noqa: E402
from admission_allocation.common import get_db_url, run_transaction as db_transaction  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description="Load admissions_allocation_history for all supported councils.")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", choices=("all", "bucks", "sutton", "fallback"), default="all")
    ap.add_argument(
        "--sutton-entry-year",
        type=int,
        default=2025,
        help="September Year 7 entry year this Sutton table is treated as referring to (default 2025).",
    )
    ap.add_argument(
        "--fallback-entry-year",
        type=int,
        default=2025,
        help="September entry year for council placeholder rows (default 2025).",
    )
    args = ap.parse_args()

    db_url = get_db_url()
    if not db_url and not args.dry_run:
        print("Set DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    def work(cur) -> None:
        if args.only in ("all", "bucks"):
            n, misses = bucks.run(cur, dry_run=args.dry_run)
            if not args.dry_run:
                print(f"[bucks] Upserted {n} rows. Unmatched: {sorted(set(misses))}")
        if args.only in ("all", "sutton"):
            n, misses = sutton.run(cur, entry_year=args.sutton_entry_year, dry_run=args.dry_run)
            if not args.dry_run:
                print(f"[sutton] Upserted {n} rows. Unmatched table names: {sorted(set(misses))}")
        if args.only in ("all", "fallback"):
            n, _misses = fallback_councils.run(cur, entry_year=args.fallback_entry_year, dry_run=args.dry_run)
            if not args.dry_run:
                print(f"[fallback] Upserted {n} council guidance rows.")

    if args.dry_run:
        if args.only in ("all", "fallback"):
            if not db_url:
                print("Set DATABASE_URL for this dry-run (needs schools table for fallback).", file=sys.stderr)
                sys.exit(1)
            db_transaction(db_url, work)
        else:
            work(None)
        return

    if not db_url:
        sys.exit(1)
    db_transaction(db_url, work)


if __name__ == "__main__":
    main()
