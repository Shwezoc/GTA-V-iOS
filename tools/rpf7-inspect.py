#!/usr/bin/env python3
"""Read-only structural inspector for unencrypted/open GTA V RPF7 archives.

This is an index validator, not a game runtime mount implementation. AES/NG encrypted
TOCs are intentionally rejected rather than guessed or silently misparsed.
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path

MAGIC = 0x52504637
OPEN = 0x4E45504F
BLOCK = 512
MAX_ENTRIES = 2_000_000


class RpfError(ValueError):
    pass


def u32(data: bytes, off: int) -> int:
    return struct.unpack_from("<I", data, off)[0]


def inspect(path: Path) -> dict:
    size = path.stat().st_size
    with path.open("rb") as f:
        header = f.read(16)
        if len(header) != 16:
            raise RpfError("truncated RPF7 header")
        version, count, names_len, encryption = struct.unpack("<4I", header)
        if version != MAGIC:
            raise RpfError(f"bad magic/version 0x{version:08X}")
        if count == 0 or count > MAX_ENTRIES:
            raise RpfError(f"invalid entry count: {count}")
        if encryption not in (0, OPEN):
            raise RpfError(f"encrypted/unsupported TOC (encryption=0x{encryption:08X}); only NONE/OPEN supported")
        toc_len = count * 16
        if 16 + toc_len + names_len > size:
            raise RpfError("TOC or names table extends beyond archive")
        entries_blob = f.read(toc_len)
        names_blob = f.read(names_len)
        if len(entries_blob) != toc_len or len(names_blob) != names_len:
            raise RpfError("truncated TOC or names table")

    def name_at(offset: int) -> str:
        if offset >= len(names_blob):
            raise RpfError(f"name offset out of range: {offset}")
        end = names_blob.find(b"\0", offset)
        if end < 0:
            raise RpfError(f"unterminated name at offset {offset}")
        try:
            value = names_blob[offset:end].decode("utf-8")
        except UnicodeDecodeError as e:
            raise RpfError(f"invalid UTF-8 name at offset {offset}") from e
        if not value or "/" in value or "\\" in value or value in (".", ".."):
            raise RpfError(f"unsafe entry name: {value!r}")
        return value

    records = []
    for i in range(count):
        raw = entries_blob[i * 16:(i + 1) * 16]
        a, b, c, d = struct.unpack("<4I", raw)
        if b == 0x7FFFFF00:
            records.append({"kind": "dir", "name": name_at(a), "first": c, "count": d})
        elif (b & 0x80000000) == 0:
            packed = a | (b << 32)
            name_off = packed & 0xFFFF
            stored = (packed >> 16) & 0xFFFFFF
            block_off = (packed >> 40) & 0xFFFFFF
            if d not in (0, 1):
                raise RpfError(f"invalid binary-entry encryption flag at index {i}: {d}")
            length = stored if stored else c
            records.append({"kind": "binary", "name": name_at(name_off), "offset": block_off * BLOCK,
                            "stored_size": stored, "size": length, "encrypted": bool(d)})
        else:
            name_off = a & 0xFFFF
            stored = b & 0xFFFFFF
            block_off = ((b >> 24) & 0x7FFFFF)
            records.append({"kind": "resource", "name": name_at(name_off), "offset": block_off * BLOCK,
                            "stored_size": stored, "system_flags": c, "graphics_flags": d})

    if records[0]["kind"] != "dir":
        raise RpfError("entry zero is not the root directory")
    for i, rec in enumerate(records):
        if rec["kind"] == "dir":
            first, n = rec["first"], rec["count"]
            if first > count or n > count - first:
                raise RpfError(f"directory entry range out of bounds at index {i}")
            if i != 0 and n == 0:
                raise RpfError(f"empty non-root directory at index {i}")

    files = []
    visited = set()

    def walk(dir_index: int, prefix: str, depth: int = 0):
        if depth > 64:
            raise RpfError("directory nesting exceeds 64")
        directory = records[dir_index]
        start, end = directory["first"], directory["first"] + directory["count"]
        for idx in range(start, end):
            if idx in visited:
                raise RpfError(f"entry {idx} is referenced by multiple directories")
            visited.add(idx)
            rec = records[idx]
            full = f"{prefix}/{rec['name']}" if prefix else rec["name"]
            if rec["kind"] == "dir":
                walk(idx, full, depth + 1)
            else:
                physical_size = rec.get("stored_size", 0) or rec.get("size", 0)
                if rec["offset"] > size or physical_size > size - rec["offset"]:
                    raise RpfError(f"file data extends beyond archive: {full}")
                files.append({"path": full, "kind": rec["kind"], "offset": rec["offset"],
                              "stored_size": rec.get("stored_size", 0), "size": rec.get("size"),
                              "encrypted": rec.get("encrypted", False)})

    walk(0, "")
    if len(visited) != count - 1:
        raise RpfError(f"unreachable TOC entries: {count - 1 - len(visited)}")
    return {
        "status": "pass", "archive": path.name, "bytes": size, "version": "RPF7",
        "encryption": f"0x{encryption:08X}", "entryCount": count,
        "fileCount": len(files), "resourceCount": sum(x["kind"] == "resource" for x in files),
        "binaryCount": sum(x["kind"] == "binary" for x in files), "files": files,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("archive", type=Path)
    ap.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = ap.parse_args()
    try:
        result = inspect(args.archive)
    except (OSError, RpfError, struct.error) as e:
        print(json.dumps({"status": "fail", "error": str(e)}) if args.json else f"RPF7 ERROR: {e}",
              file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"RPF7 OK: {result['fileCount']} files ({result['resourceCount']} resources, "
              f"{result['binaryCount']} binary), {result['bytes']} bytes")
        for entry in result["files"]:
            print(f"{entry['kind']:8} {entry['path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
