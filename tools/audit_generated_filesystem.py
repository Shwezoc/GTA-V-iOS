#!/usr/bin/env python3
"""Locally audit generated TU27 C++ for filesystem/archive integration call sites.

The generated source is game-derived. This tool runs locally, emits a small report,
and must not be wired to upload generated source, snippets, or report artifacts.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

TOKEN_PATTERNS = {
    "rage_file_device": re.compile(r"\b(?:fiDevice|fiDeviceLocal|fiDeviceRelative|fiDeviceCache|fiPackfile|fiCollection|fiStream)\b", re.I),
    "rpf_archive": re.compile(r"\b(?:Rpf|RPF|Packfile|packfile|ResourceArchive|ResourceFile)\w*\b", re.I),
    "filesystem": re.compile(r"\b(?:FileSystem|filesystem|file_system|Mount|mount|Unmount|unmount|dlclist|DLC)\w*\b", re.I),
    "c_file_io": re.compile(r"\b(?:fopen|fread|fwrite|fseek|ftell|fclose|open|read|pread|write|lseek|close|stat|opendir|readdir)\s*\(", re.I),
    "platform_file_io": re.compile(r"\b(?:CreateFile|ReadFile|WriteFile|SetFilePointer|FindFirstFile|FindNextFile)\s*\(", re.I),
}
SOURCE_SUFFIXES = {".cpp", ".cc", ".c", ".h", ".hpp", ".inl"}
MAX_HITS_PER_FILE = 500


def scan(root: Path) -> dict:
    if not root.is_dir():
        raise ValueError(f"generated source directory does not exist: {root}")
    files = sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in SOURCE_SUFFIXES)
    if not files:
        raise ValueError("no generated C/C++ source or header files found")
    totals: Counter[str] = Counter()
    hits = []
    for path in files:
        file_hits = 0
        try:
            stream = path.open("r", encoding="utf-8", errors="replace")
        except OSError as exc:
            raise ValueError(f"cannot read {path.name}: {exc}") from exc
        with stream:
            for line_no, line in enumerate(stream, 1):
                matched = [name for name, pattern in TOKEN_PATTERNS.items() if pattern.search(line)]
                if not matched:
                    continue
                for name in matched:
                    totals[name] += 1
                if file_hits < MAX_HITS_PER_FILE:
                    hits.append({
                        "file": path.name,
                        "line": line_no,
                        "categories": matched,
                        "snippet": line.strip()[:240],
                    })
                    file_hits += 1
    return {
        "status": "pass",
        "sourceFiles": len(files),
        "hitLines": len(hits),
        "categoryCounts": dict(sorted(totals.items())),
        "hits": hits,
        "note": "Candidate references only; inspect surrounding call graph and ABI before implementing a mount adapter.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("generated_dir", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--output", type=Path, help="write report locally; never upload it")
    args = parser.parse_args()
    try:
        result = scan(args.generated_dir)
    except (OSError, ValueError) as exc:
        print(f"FILESYSTEM AUDIT ERROR: {exc}", file=sys.stderr)
        return 1
    rendered = json.dumps(result, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    if args.json:
        print(rendered)
    else:
        print(f"Generated source files: {result['sourceFiles']}")
        print(f"Candidate hit lines: {result['hitLines']}")
        for category, count in result["categoryCounts"].items():
            print(f"{category}: {count}")
        print("Report is local-only. It is not proof of a runtime mount implementation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
