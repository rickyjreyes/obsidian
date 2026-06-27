#!/usr/bin/env python3
"""Extract derivation sections from PDFs referenced by WCT literature notes.

The script is intentionally conservative: it creates page-provenance derivation
objects from extracted text, but it does not claim that PDF equation text is
canonical LaTeX or that an extracted derivation has been verified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

VERSION = "1.0.0"
EQUATION_ID_RE = re.compile(
    r"\b(?:M\d+[A-Z]?|E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+|G1|EX|EY|EZ|FA)\b",
    re.IGNORECASE,
)
DERIVATION_HEADING_RE = re.compile(
    r"^(?:\d+(?:\.\d+)*\s+)?(?:appendix\s+[a-z0-9]+\s*[:.\-]?\s*)?"
    r"(?:mathematical|analytic(?:al)?|formal|geometric|spectral|variational|"
    r"dimensional|field|mass|constant|model|asymptotic|perturbative|numerical)?\s*"
    r"(?:derivation(?:s)?|proof(?:s)?|calculation(?:s)?|governing\s+equations?|"
    r"analytical\s+framework|mathematical\s+development|theoretical\s+development)\b",
    re.IGNORECASE,
)
GENERIC_HEADING_RE = re.compile(
    r"^(?:\d+(?:\.\d+)*\s+)?(?:abstract|introduction|background|methods?|results?|"
    r"discussion|conclusions?|references|appendix|supplement|theory|model|analysis|"
    r"simulation|experiments?|predictions?|validation|limitations?)\b",
    re.IGNORECASE,
)
DERIVATION_CUE_RE = re.compile(
    r"\b(?:derive|derived|derivation|substitut(?:e|ing)|therefore|hence|thus|yields?|"
    r"follows from|solving|integrating|differentiating|variation|Euler[- ]Lagrange|"
    r"boundary condition|normalization|stationary condition)\b",
    re.IGNORECASE,
)
EQUATION_LINE_RE = re.compile(
    r"(?:=|≈|≃|≤|≥|∂|∇|∫|Σ|Π|√|\^\s*[-+]?\d|_[a-zA-Z0-9]|\\(?:frac|partial|nabla|sum|int))"
)


@dataclass(frozen=True)
class Paper:
    note_path: Path
    relative_note_path: str
    title: str
    pdf_url: str


@dataclass(frozen=True)
class Section:
    heading: str
    start_page: int
    end_page: int
    text: str
    equation_lines: tuple[str, ...]
    equation_ids: tuple[str, ...]
    confidence: float
    method: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", required=True, help="Absolute path to the Obsidian vault")
    parser.add_argument(
        "--notes-folder",
        default="Research/01 Literature Notes",
        help="Vault-relative folder containing literature notes with pdf_url frontmatter",
    )
    parser.add_argument(
        "--equations-folder",
        default="Research/04 Equations",
        help="Vault-relative folder containing canonical equation notes",
    )
    parser.add_argument(
        "--output",
        default="Research/08 Derivations/PDF",
        help="Vault-relative folder for generated derivation objects",
    )
    parser.add_argument(
        "--cache",
        default=".wct-cache/pdfs",
        help="Vault-relative PDF cache folder",
    )
    parser.add_argument("--paper", action="append", default=[], help="Only process papers whose title/path contains this text")
    parser.add_argument("--max-papers", type=int, default=0, help="Maximum number of papers to process; 0 means all")
    parser.add_argument("--max-sections", type=int, default=10, help="Maximum derivation sections generated per paper")
    parser.add_argument("--max-pages-per-section", type=int, default=5)
    parser.add_argument("--refresh", action="store_true", help="Download PDFs again even when cached")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be generated without writing files")
    return parser.parse_args()


def normalize_newlines(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def parse_frontmatter(text: str) -> dict[str, object]:
    text = normalize_newlines(text)
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}
    result: dict[str, object] = {}
    for raw_line in text[4:end].splitlines():
        if not raw_line or raw_line[0].isspace() or ":" not in raw_line:
            continue
        key, raw_value = raw_line.split(":", 1)
        value = raw_value.strip()
        if value.startswith(('"', "'")) and value.endswith(value[:1]):
            value = value[1:-1]
        result[key.strip()] = value
    return result


def markdown_title(text: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", normalize_newlines(text), re.MULTILINE)
    return match.group(1).strip() if match else fallback


def discover_papers(vault: Path, notes_folder: str, filters: Sequence[str]) -> list[Paper]:
    root = vault / notes_folder
    if not root.exists():
        raise FileNotFoundError(f"Literature-note folder not found: {root}")
    lowered_filters = [item.casefold() for item in filters if item.strip()]
    papers: list[Paper] = []
    for note_path in sorted(root.rglob("*.md")):
        text = note_path.read_text(encoding="utf-8", errors="replace")
        metadata = parse_frontmatter(text)
        pdf_url = str(metadata.get("pdf_url") or "").strip()
        if not pdf_url:
            continue
        title = str(metadata.get("title") or "").strip() or markdown_title(text, note_path.stem)
        relative = note_path.relative_to(vault).as_posix()
        haystack = f"{title} {relative} {pdf_url}".casefold()
        if lowered_filters and not any(token in haystack for token in lowered_filters):
            continue
        papers.append(Paper(note_path=note_path, relative_note_path=relative, title=title, pdf_url=pdf_url))
    return papers


def safe_name(value: str, max_length: int = 100) -> str:
    value = re.sub(r"[<>:\"/\\|?*\x00-\x1f]", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" .-")
    return (value[:max_length].rstrip() or "Untitled")


def pdf_cache_name(paper: Paper) -> str:
    parsed = urllib.parse.urlparse(paper.pdf_url)
    suffix = Path(urllib.parse.unquote(parsed.path)).suffix or ".pdf"
    digest = hashlib.sha1(paper.pdf_url.encode("utf-8")).hexdigest()[:12]
    return f"{safe_name(paper.title, 72)}--{digest}{suffix}"


def download_pdf(paper: Paper, destination: Path, refresh: bool) -> None:
    if destination.exists() and destination.stat().st_size > 1024 and not refresh:
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        paper.pdf_url,
        headers={
            "User-Agent": "WaveLock-Research-Compiler/1.0 (+https://github.com/rickyjreyes/obsidian)",
            "Accept": "application/pdf,*/*;q=0.8",
        },
    )
    temporary = destination.with_suffix(destination.suffix + ".part")
    try:
        with urllib.request.urlopen(request, timeout=90) as response, temporary.open("wb") as handle:
            shutil.copyfileobj(response, handle)
        if temporary.stat().st_size < 1024:
            raise RuntimeError("downloaded file is unexpectedly small")
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def extract_with_pymupdf(pdf_path: Path) -> tuple[list[str], str] | None:
    try:
        import fitz  # type: ignore
    except ImportError:
        return None
    pages: list[str] = []
    with fitz.open(pdf_path) as document:
        for page in document:
            pages.append(page.get_text("text", sort=True) or "")
    return pages, "PyMuPDF"


def extract_with_pypdf(pdf_path: Path) -> tuple[list[str], str] | None:
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError:
        return None
    reader = PdfReader(str(pdf_path))
    return [(page.extract_text() or "") for page in reader.pages], "pypdf"


def extract_with_pdftotext(pdf_path: Path) -> tuple[list[str], str] | None:
    executable = shutil.which("pdftotext")
    if not executable:
        return None
    completed = subprocess.run(
        [executable, "-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    pages = completed.stdout.split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    return pages, "pdftotext"


def extract_pages(pdf_path: Path) -> tuple[list[str], str]:
    errors: list[str] = []
    for extractor in (extract_with_pymupdf, extract_with_pypdf, extract_with_pdftotext):
        try:
            result = extractor(pdf_path)
            if result and any(page.strip() for page in result[0]):
                return result
        except Exception as exc:
            errors.append(f"{extractor.__name__}: {exc}")
    detail = "; ".join(errors) if errors else "no supported PDF text extractor is installed"
    raise RuntimeError(
        "PDF extraction unavailable. Install one backend, preferably `py -m pip install pymupdf`. "
        f"Details: {detail}"
    )


def clean_page_text(text: str) -> str:
    lines: list[str] = []
    for raw_line in normalize_newlines(text).splitlines():
        line = re.sub(r"[\t ]+", " ", raw_line).strip()
        if not line:
            lines.append("")
            continue
        if re.fullmatch(r"\d+", line):
            continue
        lines.append(line)
    compact: list[str] = []
    blank = False
    for line in lines:
        if not line:
            if not blank:
                compact.append("")
            blank = True
        else:
            compact.append(line)
            blank = False
    return "\n".join(compact).strip()


def equation_lines(text: str) -> tuple[str, ...]:
    values: list[str] = []
    seen: set[str] = set()
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line or len(line) > 260 or line.startswith("http"):
            continue
        if EQUATION_LINE_RE.search(line) and (len(line) <= 180 or EQUATION_ID_RE.search(line)):
            key = line.casefold()
            if key not in seen:
                seen.add(key)
                values.append(line)
    return tuple(values[:80])


def heading_candidate(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 120:
        return False
    if stripped.endswith((".", ";", ",")) and not re.match(r"^\d+(?:\.\d+)*\s+", stripped):
        return False
    if len(stripped.split()) > 14:
        return False
    return bool(DERIVATION_HEADING_RE.search(stripped))


def generic_heading_candidate(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 120 or len(stripped.split()) > 14:
        return False
    return bool(GENERIC_HEADING_RE.search(stripped)) or bool(re.match(r"^\d+(?:\.\d+){0,3}\s+[A-Z]", stripped))


def page_score(text: str) -> tuple[int, int]:
    return len(equation_lines(text)), len(DERIVATION_CUE_RE.findall(text))


def trim_section(text: str, max_chars: int = 16000) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n\n[Extraction truncated by importer.]"


def section_from_heading(pages: Sequence[str], page_index: int, line_index: int, max_pages: int) -> Section:
    first_lines = pages[page_index].splitlines()
    heading = first_lines[line_index].strip() or "Derivation"
    chunks = ["\n".join(first_lines[line_index + 1 :]).strip()]
    end_page = page_index
    for offset in range(1, max_pages):
        candidate_index = page_index + offset
        if candidate_index >= len(pages):
            break
        candidate_lines = pages[candidate_index].splitlines()
        stop = None
        for index, line in enumerate(candidate_lines):
            if generic_heading_candidate(line) and not heading_candidate(line):
                stop = index
                break
        if stop is not None:
            chunks.append("\n".join(candidate_lines[:stop]).strip())
            end_page = candidate_index
            break
        chunks.append(pages[candidate_index])
        end_page = candidate_index
    text = trim_section("\n\n".join(chunk for chunk in chunks if chunk.strip()))
    eq_lines = equation_lines(text)
    ids = tuple(sorted({match.upper() for match in EQUATION_ID_RE.findall(text)}))
    confidence = min(0.98, 0.72 + min(0.16, len(eq_lines) * 0.015) + (0.08 if DERIVATION_CUE_RE.search(text) else 0))
    return Section(
        heading=heading,
        start_page=page_index + 1,
        end_page=end_page + 1,
        text=text,
        equation_lines=eq_lines,
        equation_ids=ids,
        confidence=round(confidence, 2),
        method="explicit-heading",
    )


def fallback_sections(pages: Sequence[str], max_pages: int) -> list[Section]:
    selected: list[int] = []
    for index, page in enumerate(pages):
        equations, cues = page_score(page)
        if equations >= 4 and cues >= 2:
            selected.append(index)
    if not selected:
        return []
    groups: list[list[int]] = []
    for index in selected:
        if not groups or index > groups[-1][-1] + 1 or len(groups[-1]) >= max_pages:
            groups.append([index])
        else:
            groups[-1].append(index)
    sections: list[Section] = []
    for number, group in enumerate(groups, start=1):
        text = trim_section("\n\n".join(pages[index] for index in group))
        eq_lines = equation_lines(text)
        ids = tuple(sorted({match.upper() for match in EQUATION_ID_RE.findall(text)}))
        sections.append(
            Section(
                heading=f"Equation development {number}",
                start_page=group[0] + 1,
                end_page=group[-1] + 1,
                text=text,
                equation_lines=eq_lines,
                equation_ids=ids,
                confidence=0.58,
                method="equation-density-fallback",
            )
        )
    return sections


def extract_sections(pages: Sequence[str], max_sections: int, max_pages: int) -> list[Section]:
    cleaned = [clean_page_text(page) for page in pages]
    sections: list[Section] = []
    occupied_pages: set[int] = set()
    for page_index, page in enumerate(cleaned):
        for line_index, line in enumerate(page.splitlines()):
            if not heading_candidate(line) or page_index in occupied_pages:
                continue
            section = section_from_heading(cleaned, page_index, line_index, max_pages)
            if len(section.text) < 120 and not section.equation_lines:
                continue
            sections.append(section)
            occupied_pages.update(range(section.start_page - 1, section.end_page))
            if len(sections) >= max_sections:
                return sections
    for section in fallback_sections(cleaned, max_pages):
        if any(page in occupied_pages for page in range(section.start_page - 1, section.end_page)):
            continue
        sections.append(section)
        if len(sections) >= max_sections:
            break
    return sections


def build_equation_index(vault: Path, folder: str) -> dict[str, list[str]]:
    root = vault / folder
    index: dict[str, list[str]] = {}
    if not root.exists():
        return index
    for path in root.rglob("*.md"):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        relative = path.relative_to(vault).as_posix()
        searchable = f"{path.stem}\n{text[:12000]}"
        for equation_id in {match.upper() for match in EQUATION_ID_RE.findall(searchable)}:
            index.setdefault(equation_id, []).append(relative)
    for paths in index.values():
        paths.sort(key=lambda value: (len(value), value))
    return index


def yaml_quote(value: object) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def relation_block(source_path: str, linked_equations: Sequence[str]) -> str:
    lines = ["relations:", "  derived-from:", f"    - {yaml_quote(source_path)}", "  derives:"]
    if linked_equations:
        lines.extend(f"    - {yaml_quote(path)}" for path in linked_equations)
    else:
        lines.append("    - []")
    return "\n".join(lines)


def missing_items(section: Section, linked_equations: Sequence[str]) -> list[str]:
    items = [
        "Compare this extraction with the rendered source PDF pages and set `human_verified: true`.",
        "Replace extraction-only equation text with canonical LaTeX and set `canonical_latex_verified: true`.",
        "Record assumptions, boundary conditions, and omitted intermediate steps that PDF text extraction may have lost.",
        "Record symbolic, formal, physical, and experimental status for this derivation.",
    ]
    if section.equation_ids and not linked_equations:
        items.insert(0, "Resolve the detected equation IDs to canonical equation objects.")
    elif not section.equation_ids:
        items.insert(0, "Identify and link the canonical equation objects derived in this section.")
    return items


def generated_note(paper: Paper, section: Section, linked_equations: Sequence[str], extractor: str) -> tuple[str, str]:
    identity = f"{paper.relative_note_path}|{section.start_page}|{section.end_page}|{section.heading}"
    stable_id = "DRV-PDF-" + hashlib.sha1(identity.encode("utf-8")).hexdigest()[:10].upper()
    page_label = str(section.start_page) if section.start_page == section.end_page else f"{section.start_page}-{section.end_page}"
    title = f"{paper.title} — {section.heading} — pp. {page_label}"
    filename = f"{safe_name(paper.title, 62)} -- p{page_label} -- {safe_name(section.heading, 58)} -- {stable_id}.md"
    equation_ids = ", ".join(section.equation_ids) if section.equation_ids else "None detected"
    equation_links = "\n".join(f"- [[{path.removesuffix('.md')}|{Path(path).stem}]]" for path in linked_equations)
    if not equation_links:
        equation_links = "- No canonical equation object was resolved automatically."
    extracted_equations = "\n".join(section.equation_lines) if section.equation_lines else "No equation-like lines were preserved by text extraction."
    missing = "\n".join(f"- [ ] {item}" for item in missing_items(section, linked_equations))
    body = f"""---
id: {stable_id}
type: derivation
source_kind: pdf
source_paper: {yaml_quote(paper.relative_note_path)}
source_pdf: {yaml_quote(paper.pdf_url)}
source_pages: {yaml_quote(page_label)}
source_page_start: {section.start_page}
source_page_end: {section.end_page}
extraction_method: {yaml_quote(extractor)}
extraction_rule: {yaml_quote(section.method)}
parser_version: {yaml_quote(VERSION)}
extraction_confidence: {section.confidence:.2f}
human_verified: false
canonical_latex_verified: false
symbolic_status: UNREVIEWED
formal_status: UNREVIEWED
physical_status: UNREVIEWED
experimental_status: UNREVIEWED
{relation_block(paper.relative_note_path, linked_equations)}
---

# {title}

> [!warning] Extraction state
> This is a page-provenance extraction from the source PDF, not a verified reconstruction of the mathematics. PDF text extraction can lose fraction bars, superscripts, subscripts, symbols, ordering, and diagram context.

## Current state

- **Source paper:** [[{paper.relative_note_path.removesuffix('.md')}|{paper.title}]]
- **PDF pages:** {page_label}
- **Extraction backend:** {extractor}
- **Extraction rule:** {section.method}
- **Extraction confidence:** {section.confidence:.0%}
- **Human verification:** Pending
- **Canonical LaTeX verification:** Pending
- **Detected equation IDs:** {equation_ids}
- **Resolved canonical equation objects:** {len(linked_equations)}

## Derivation

{section.text or '_No derivation text was extracted._'}

## Extracted equation text

```text
{extracted_equations}
```

## Linked canonical equations

{equation_links}

## What is missing

{missing}

## Provenance

- **Origin note:** `{paper.relative_note_path}`
- **Origin PDF:** {paper.pdf_url}
- **Page range:** {page_label}
- **Parser:** `wct_pdf_derivations.py` {VERSION}
- **Method:** {section.method}
- **Generated object:** `{stable_id}`
"""
    return filename, body


def clean_generated_folder(folder: Path) -> None:
    if not folder.exists():
        return
    for path in folder.glob("*.md"):
        try:
            prefix = path.read_text(encoding="utf-8", errors="replace")[:900]
        except OSError:
            continue
        if "source_kind: pdf" in prefix and "parser_version:" in prefix:
            path.unlink()


def report_markdown(rows: Sequence[dict[str, object]], output_relative: str) -> str:
    succeeded = sum(1 for row in rows if row["status"] == "Imported")
    failed = sum(1 for row in rows if row["status"] == "Failed")
    no_sections = sum(1 for row in rows if row["status"] == "No derivation sections detected")
    table = [
        "| Paper | State | Sections | Backend | Current state / missing |",
        "|---|---|---:|---|---|",
    ]
    for row in rows:
        paper = str(row["paper"]).replace("|", "\\|")
        state = str(row["status"]).replace("|", "\\|")
        backend = str(row.get("backend") or "—").replace("|", "\\|")
        detail = str(row.get("detail") or "").replace("|", "\\|").replace("\n", " ")
        table.append(f"| {paper} | {state} | {row.get('sections', 0)} | {backend} | {detail} |")
    return f"""---
type: report
id: REP-PDF-DERIVATION-IMPORT
parser_version: {VERSION}
---

# PDF Derivation Import Report

## Current state

- **Papers inspected:** {len(rows)}
- **Papers with imported derivations:** {succeeded}
- **Papers with no detected derivation section:** {no_sections}
- **Failed imports:** {failed}
- **Output folder:** `{output_relative}`

## Paper status

{chr(10).join(table)}

## Meaning

- **Imported** means page-provenance text objects were generated. It does not mean the derivation is mathematically verified.
- **No derivation sections detected** means the conservative detector did not find an explicit derivation/proof heading or an equation-dense passage with derivation language.
- **Failed** means the PDF could not be downloaded or parsed. The table records the immediate cause.

## Required review workflow

1. Open each generated derivation object.
2. Compare it against the rendered PDF page range.
3. Correct the equation into canonical LaTeX and link the canonical equation object.
4. Record assumptions and intermediate steps lost during extraction.
5. Set `human_verified: true` and `canonical_latex_verified: true` only after checking the source.
"""


def process_paper(
    paper: Paper,
    vault: Path,
    cache_root: Path,
    output_root: Path,
    equation_index: dict[str, list[str]],
    args: argparse.Namespace,
) -> dict[str, object]:
    paper_folder = output_root / safe_name(paper.title, 90)
    pdf_path = cache_root / pdf_cache_name(paper)
    row: dict[str, object] = {"paper": paper.title, "status": "Failed", "sections": 0, "backend": "", "detail": ""}
    try:
        download_pdf(paper, pdf_path, args.refresh)
        pages, backend = extract_pages(pdf_path)
        sections = extract_sections(pages, args.max_sections, args.max_pages_per_section)
        row["backend"] = backend
        if not sections:
            row["status"] = "No derivation sections detected"
            row["detail"] = "PDF text was available, but no conservative derivation/proof passage matched. Review manually or broaden extraction rules."
            return row
        if not args.dry_run:
            paper_folder.mkdir(parents=True, exist_ok=True)
            clean_generated_folder(paper_folder)
        generated: list[str] = []
        for section in sections:
            linked: list[str] = []
            for equation_id in section.equation_ids:
                for path in equation_index.get(equation_id, [])[:1]:
                    if path not in linked:
                        linked.append(path)
            filename, content = generated_note(paper, section, linked, backend)
            generated.append(filename)
            if not args.dry_run:
                (paper_folder / filename).write_text(content, encoding="utf-8")
        row["status"] = "Imported"
        row["sections"] = len(sections)
        row["detail"] = f"Generated {len(sections)} page-provenance derivation object(s); human and LaTeX verification remain pending."
        row["files"] = generated
        return row
    except (OSError, RuntimeError, urllib.error.URLError, subprocess.SubprocessError) as exc:
        row["detail"] = str(exc)
        return row


def main() -> int:
    args = parse_args()
    vault = Path(args.vault).expanduser().resolve()
    if not vault.exists():
        print(f"Vault does not exist: {vault}", file=sys.stderr)
        return 2
    output_root = vault / args.output
    cache_root = vault / args.cache
    try:
        papers = discover_papers(vault, args.notes_folder, args.paper)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    if args.max_papers > 0:
        papers = papers[: args.max_papers]
    if not papers:
        print("No literature notes with pdf_url frontmatter matched.", file=sys.stderr)
        return 3

    equation_index = build_equation_index(vault, args.equations_folder)
    rows: list[dict[str, object]] = []
    for index, paper in enumerate(papers, start=1):
        print(f"[{index}/{len(papers)}] {paper.title}", flush=True)
        row = process_paper(paper, vault, cache_root, output_root, equation_index, args)
        rows.append(row)
        print(f"  {row['status']}: {row.get('detail', '')}", flush=True)

    if not args.dry_run:
        output_root.mkdir(parents=True, exist_ok=True)
        report = report_markdown(rows, args.output)
        (output_root / "_PDF Derivation Import Report.md").write_text(report, encoding="utf-8")

    failures = sum(1 for row in rows if row["status"] == "Failed")
    imported = sum(1 for row in rows if row["status"] == "Imported")
    print(f"Completed: {imported} paper(s) imported, {failures} failed, {len(rows) - imported - failures} without detected sections.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
