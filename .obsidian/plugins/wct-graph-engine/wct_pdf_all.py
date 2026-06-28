#!/usr/bin/env python3
"""Run all WCT PDF importers."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def options() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", required=True)
    parser.add_argument("--notes-folder", default="Research/01 Literature Notes")
    parser.add_argument("--equations-folder", default="Research/04 Equations")
    parser.add_argument("--output", default="Research/08 Derivations/PDF")
    parser.add_argument("--cache", default=".wct-cache/pdfs")
    parser.add_argument("--paper", action="append", default=[])
    parser.add_argument("--max-papers", type=int, default=0)
    parser.add_argument("--max-sections", type=int, default=10)
    parser.add_argument("--max-pages-per-section", type=int, default=5)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def shared(value: argparse.Namespace) -> list[str]:
    result = [
        "--vault", value.vault,
        "--notes-folder", value.notes_folder,
        "--cache", value.cache,
        "--max-pages-per-section", str(value.max_pages_per_section),
    ]
    for paper in value.paper:
        result.extend(["--paper", paper])
    if value.max_papers > 0:
        result.extend(["--max-papers", str(value.max_papers)])
    if value.refresh:
        result.append("--refresh")
    if value.dry_run:
        result.append("--dry-run")
    return result


def invoke(script: Path, arguments: list[str]) -> int:
    return int(subprocess.run([sys.executable, str(script), *arguments], check=False).returncode)


def main() -> int:
    value = options()
    folder = Path(__file__).resolve().parent
    derivation = invoke(folder / "wct_pdf_derivations.py", [
        *shared(value),
        "--equations-folder", value.equations_folder,
        "--output", value.output,
        "--max-sections", str(value.max_sections),
    ])
    paper_objects = invoke(folder / "wct_pdf_paper_objects.py", [
        *shared(value),
        "--output", "Research/09 Paper Objects/PDF",
        "--max-sections", str(max(30, value.max_sections)),
    ])
    warnings = int(derivation != 0) + int(paper_objects != 0)
    print(f"Completed: PDF research objects finished with {warnings} importer warning(s).", flush=True)
    return 1 if warnings else 0


if __name__ == "__main__":
    raise SystemExit(main())
