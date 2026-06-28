#!/usr/bin/env python3
"""Extract explicit paper objects from PDF text with page provenance."""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

from wct_pdf_derivations import (
    discover_papers,
    download_pdf,
    extract_pages,
    pdf_cache_name,
    safe_name,
    yaml_quote,
)

VERSION = "1.0.0"
RULES = {
    "claim": re.compile(r"^(?:\d+(?:\.\d+)*\s+)?(?:main claim|claims?|key results?|main results?|findings?|contributions?|significance|predictions?)\b", re.I),
    "theorem": re.compile(r"^(?:\d+(?:\.\d+)*\s+)?(?:theorems?|lemmas?|propositions?|corollaries?|formal results?|upper bound|lower bound|no-go result)\b", re.I),
    "contradiction": re.compile(r"^(?:\d+(?:\.\d+)*\s+)?(?:contradictions?|counterexamples?|limitations?|failure modes?|falsifiers?|rejection criteria|inconsistencies?)\b", re.I),
}
THEOREM_LINE = re.compile(r"\b(?:theorem|lemma|proposition|corollary|upper bound|lower bound|no-go result)\b", re.I)
CONTRADICTION_LINE = re.compile(r"\b(?:contradict|counterexample|falsif|refut|inconsistent|cannot hold|not compatible|limitation)\b", re.I)
HEADING = re.compile(r"^(?:\d+(?:\.\d+)*\s+)?[A-Z][^.!?]{2,100}$")
BULLET = re.compile(r"^(?:[-*•]|\d+[.)])\s+(.+)$")


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", required=True)
    parser.add_argument("--notes-folder", default="Research/01 Literature Notes")
    parser.add_argument("--output", default="Research/09 Paper Objects/PDF")
    parser.add_argument("--cache", default=".wct-cache/pdfs")
    parser.add_argument("--paper", action="append", default=[])
    parser.add_argument("--max-sections", type=int, default=30)
    parser.add_argument("--max-pages-per-section", type=int, default=5)
    parser.add_argument("--refresh", action="store_true")
    return parser.parse_args()


def clean(text: str) -> str:
    return "\n".join(re.sub(r"[\t ]+", " ", line).strip() for line in text.replace("\r", "").splitlines()).strip()


def object_type(line: str) -> str | None:
    value = line.strip().rstrip(":")
    if not value or len(value) > 120 or len(value.split()) > 16:
        return None
    return next((kind for kind, pattern in RULES.items() if pattern.search(value)), None)


def section(pages: list[str], page: int, line: int, maximum: int) -> tuple[str, int]:
    chunks = ["\n".join(pages[page].splitlines()[line + 1:])]
    end = page
    for offset in range(1, maximum):
        index = page + offset
        if index >= len(pages):
            break
        lines = pages[index].splitlines()
        stop = next((i for i, value in enumerate(lines) if HEADING.match(value.strip()) or object_type(value)), None)
        chunks.append("\n".join(lines[:stop]) if stop is not None else pages[index])
        end = index
        if stop is not None:
            break
    return "\n\n".join(value for value in chunks if value.strip()).strip()[:16000], end


def items(text: str) -> list[str]:
    result: list[str] = []
    current = ""
    for raw in text.splitlines():
        line = raw.strip()
        match = BULLET.match(line)
        if match:
            if current:
                result.append(re.sub(r"\s+", " ", current).strip())
            current = match.group(1)
        elif current and line:
            current += " " + line
        elif not line and current:
            result.append(re.sub(r"\s+", " ", current).strip())
            current = ""
    if current:
        result.append(re.sub(r"\s+", " ", current).strip())
    if result:
        return [value for value in result if len(value) >= 12]
    compact = re.sub(r"\s+", " ", text).strip()
    return [value.strip() for value in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", compact) if 24 <= len(value.strip()) <= 1200]


def extract(raw_pages: list[str], limit: int, span: int) -> list[tuple[str, str, str, int, int, float]]:
    pages = [clean(page) for page in raw_pages]
    found: list[tuple[str, str, str, int, int, float]] = []
    seen: set[str] = set()

    def add(kind: str, heading: str, text: str, start: int, end: int, confidence: float) -> None:
        value = re.sub(r"\s+", " ", text).strip()
        key = kind + "\0" + re.sub(r"\W+", " ", value.lower()).strip()
        if len(value) < 12 or key in seen or len(found) >= limit:
            return
        seen.add(key)
        found.append((kind, heading, value, start, end, confidence))

    for page_index, page_text in enumerate(pages):
        lines = page_text.splitlines()
        for line_index, line in enumerate(lines):
            kind = object_type(line)
            if not kind:
                continue
            body, end = section(pages, page_index, line_index, span)
            values = items(body) or [body]
            for value in values:
                add(kind, line.strip(), value, page_index + 1, end + 1, 0.86)
        for line in lines:
            if THEOREM_LINE.search(line):
                add("theorem", "Detected theorem statement", line, page_index + 1, page_index + 1, 0.68)
            if CONTRADICTION_LINE.search(line):
                add("contradiction", "Detected contradiction or limitation", line, page_index + 1, page_index + 1, 0.62)
    return found


def write_object(folder: Path, paper, record, ordinal: int, backend: str) -> None:
    kind, heading, text, start, end, confidence = record
    pages = str(start) if start == end else f"{start}-{end}"
    identity = f"{paper.relative_note_path}|{kind}|{pages}|{heading}|{text}"
    prefix = {"claim": "CLA-PDF", "theorem": "THM-PDF", "contradiction": "CTR-PDF"}[kind]
    stable_id = prefix + "-" + hashlib.sha1(identity.encode()).hexdigest()[:10].upper()
    filename = f"{safe_name(paper.title, 58)} -- {kind} {ordinal:03d} -- p{pages} -- {stable_id}.md"
    relation = "stated-by" if kind == "claim" else "contained-by"
    content = f"""---
id: {stable_id}
type: {kind}
source_kind: pdf
source_paper: {yaml_quote(paper.relative_note_path)}
source_pdf: {yaml_quote(paper.pdf_url)}
source_pages: {yaml_quote(pages)}
source_heading: {yaml_quote(heading)}
source_index: {ordinal}
extraction_method: {yaml_quote(backend)}
extraction_confidence: {confidence:.2f}
human_verified: false
symbolic_status: UNREVIEWED
formal_status: UNREVIEWED
physical_status: UNREVIEWED
experimental_status: UNREVIEWED
relations:
  {relation}:
    - {yaml_quote(paper.relative_note_path)}
---

# {paper.title} — {kind.title()} {ordinal} — pp. {pages}

> [!warning] PDF extraction awaiting source review.

## Current state

- **Source paper:** [[{paper.relative_note_path.removesuffix('.md')}|{paper.title}]]
- **PDF pages:** {pages}
- **Source heading:** {heading}
- **Extraction backend:** {backend}
- **Human verification:** Pending

## {kind.title()}

{text}

## What is missing

- [ ] Compare this object with the rendered PDF pages.
- [ ] Link applicable equations, definitions, assumptions, evidence, and falsifiers.
- [ ] Record validation status and set `human_verified: true` only after review.
"""
    (folder / filename).write_text(content, encoding="utf-8")


def main() -> int:
    options = args()
    vault = Path(options.vault).expanduser().resolve()
    papers = discover_papers(vault, options.notes_folder, options.paper)
    output = vault / options.output
    cache = vault / options.cache
    output.mkdir(parents=True, exist_ok=True)
    failures = 0
    for index, paper in enumerate(papers, start=1):
        print(f"[{index}/{len(papers)}] PDF objects: {paper.title}", flush=True)
        try:
            pdf = cache / pdf_cache_name(paper)
            download_pdf(paper, pdf, options.refresh)
            pages, backend = extract_pages(pdf)
            records = extract(pages, options.max_sections, options.max_pages_per_section)
            folder = output / safe_name(paper.title, 90)
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob("*.md"):
                if "source_kind: pdf" in old.read_text(encoding="utf-8", errors="replace")[:700]:
                    old.unlink()
            for ordinal, record in enumerate(records, start=1):
                write_object(folder, paper, record, ordinal, backend)
            print(f"  Imported {len(records)} explicit paper object(s).", flush=True)
        except Exception as exc:
            failures += 1
            print(f"  Failed: {exc}", file=sys.stderr, flush=True)
    print(f"Completed PDF paper objects: {len(papers) - failures} processed, {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
