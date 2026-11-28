#!/usr/bin/env python3
"""Audit the GTA V-derived model artifacts intended for the lightweight iOS port."""
from __future__ import annotations

import argparse
import json
import pathlib
import struct
import sys


def load_glb(path: pathlib.Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError(f"{path}: invalid GLB header")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2 or declared_length != len(data):
        raise ValueError(f"{path}: unsupported or truncated GLB (version={version}, declared={declared_length}, actual={len(data)})")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A or 20 + chunk_length > len(data):
        raise ValueError(f"{path}: missing JSON chunk")
    return json.loads(data[20:20 + chunk_length].decode("utf-8").rstrip(" \t\r\n\0"))


def summarize(path: pathlib.Path) -> dict:
    gltf = load_glb(path)
    meshes = gltf.get("meshes", [])
    triangles = 0
    vertices = 0
    primitives = 0
    for mesh in meshes:
        for primitive in mesh.get("primitives", []):
            primitives += 1
            if primitive.get("mode", 4) != 4:
                continue
            accessors = gltf.get("accessors", [])
            indices = primitive.get("indices")
            if indices is not None:
                triangles += accessors[indices]["count"] // 3
            else:
                position = primitive.get("attributes", {}).get("POSITION")
                if position is not None:
                    triangles += accessors[position]["count"] // 3
    for accessor in gltf.get("accessors", []):
        # POSITION accessors only; avoid counting joints, weights and animation channels.
        if accessor.get("type") == "VEC3":
            vertices += accessor.get("count", 0)
    image_bytes = 0
    for image in gltf.get("images", []):
        view_id = image.get("bufferView")
        if view_id is not None:
            image_bytes += gltf.get("bufferViews", [])[view_id].get("byteLength", 0)
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "meshes": len(meshes),
        "primitives": primitives,
        "triangles": triangles,
        "vec3_accessors_total": vertices,
        "skins": len(gltf.get("skins", [])),
        "animations": len(gltf.get("animations", [])),
        "nodes": len(gltf.get("nodes", [])),
        "images": len(gltf.get("images", [])),
        "embedded_image_bytes": image_bytes,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--franklin-dir", type=pathlib.Path, required=True)
    parser.add_argument("--bmw-dir", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()

    franklin_glb = args.franklin_dir / "niko-animated" / "franklin_niko_animated.glb"
    franklin_report = args.franklin_dir / "niko-animated" / "franklin_niko_retarget_report.json"
    franklin_ycd = args.franklin_dir / "niko-animated" / "niko_franklin_retargeted.ycd"
    bmw_glb = args.bmw_dir / "bmwm5f90_hi.glb"
    bmw_report = args.bmw_dir / "bmwm5f90_hi-report.txt"

    required = [franklin_glb, franklin_report, franklin_ycd, bmw_glb, bmw_report]
    missing = [str(p) for p in required if not p.is_file() or p.stat().st_size == 0]
    if missing:
        raise SystemExit("Missing required asset outputs:\n" + "\n".join(missing))

    franklin = summarize(franklin_glb)
    bmw = summarize(bmw_glb)
    retarget = json.loads(franklin_report.read_text(encoding="utf-8"))
    bmw_source_report = bmw_report.read_text(encoding="utf-8")

    checks = {
        "franklin_glb_has_skin": franklin["skins"] >= 1,
        "franklin_glb_has_four_animation_clips": franklin["animations"] >= 4,
        "franklin_retarget_has_no_unmatched_bones": retarget.get("ok") is True and not retarget.get("unmatchedBoneIds"),
        "franklin_native_ycd_present": franklin_ycd.stat().st_size > 1000,
        "bmw_glb_has_geometry": bmw["triangles"] > 10000,
        "bmw_report_has_no_missing_textures": "GLB missing textures: []" in bmw_source_report,
    }
    result = {
        "status": "pass" if all(checks.values()) else "fail",
        "checks": checks,
        "franklin": franklin,
        "franklin_retarget": {
            "target_rig": retarget.get("targetRig"),
            "matched_bones": retarget.get("matchedBoneIds"),
            "unmatched_bones": retarget.get("unmatchedBoneIds"),
            "clips": [clip.get("clip") for clip in retarget.get("clips", [])],
        },
        "bmw": bmw,
        "notes": [
            "GLB files are interchange/test assets, not native RAGE runtime resources.",
            "The Franklin YCD is a retargeted intermediate and still requires in-engine playback validation.",
            "The high-detail BMW is a source-quality asset; an A13-specific LOD and texture budget is still required.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
