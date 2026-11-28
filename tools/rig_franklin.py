#!/usr/bin/env python3
"""Headless Franklin rigging wrapper for Blender + Muto Ped Rig.

The pinned Muto batch worker performs the complete Sollumz export and writes
its native GTA resource directory, .blend scene, and batch_report.json.
"""
import importlib.util
import json
import os
import sys
import traceback

def args_after_separator():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return dict(item.split("=", 1) for item in argv if "=" in item)

def fail(message, code=2):
    print("FRANKLIN_RIG_ERROR " + message)
    raise SystemExit(code)

def main():
    import bpy
    a = args_after_separator()
    src = os.path.abspath(a["src"])
    out = os.path.abspath(a["out"])
    worker_path = os.path.abspath(a["worker"])
    ped = a.get("ped", "franklin")
    os.makedirs(out, exist_ok=True)
    if not os.path.isfile(src):
        fail("Input model not found: " + src)
    if not os.path.isfile(worker_path):
        fail("Muto batch_worker.py not found: " + worker_path)

    spec = importlib.util.spec_from_file_location("muto_batch_worker", worker_path)
    if spec is None or spec.loader is None:
        fail("Could not load Muto batch worker")
    worker = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(worker)

    report = worker.run({
        "src": src,
        "out": out,
        "ped": ped,
        "rig": "mp_m",
        "mode": "ADDON",
        "height": a.get("height", "1.83"),
        "tex": "YTD",
    })
    report_path = os.path.join(out, "batch_report.json")
    if not os.path.isfile(report_path):
        with open(report_path, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
    print("FRANKLIN_RIG_REPORT " + json.dumps(report, ensure_ascii=False))
    if not report.get("ok"):
        fail("Muto batch rig/export failed; inspect batch_report.json", 1)

    resource_dir = os.path.join(out, "mpr_" + ped)
    blend_path = os.path.join(out, ped + ".blend")
    if not os.path.isdir(resource_dir) or not os.listdir(resource_dir):
        fail("Muto reported success but GTA resource directory is missing or empty", 1)
    if not os.path.isfile(blend_path) or os.path.getsize(blend_path) == 0:
        fail("Muto reported success but the rigged Blender scene is missing", 1)

    print("FRANKLIN_RIG_OK " + json.dumps({
        "resource_dir": resource_dir,
        "resource_files": sum(len(files) for _, _, files in os.walk(resource_dir)),
        "blend": blend_path,
        "blend_bytes": os.path.getsize(blend_path),
        "source": os.path.basename(src),
        "rig": "GTA V freemode male humanoid (Muto Ped Rig 0.3.2)",
        "note": "Sollumz GTA resource export; not a runtime-ready GLB or original player_one skeleton",
    }, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
