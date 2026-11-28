#!/usr/bin/env python3
"""Headless Franklin rigging wrapper for Blender + Muto Ped Rig.

Usage (Blender):
  blender -b --python rig_franklin.py -- src=/path/franklin.glb out=/path/out worker=/path/muto/bl/batch_worker.py
"""
import importlib.util
import json
import os
import sys
import traceback

import bpy


def args_after_separator():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return dict(item.split("=", 1) for item in argv if "=" in item)


def fail(message, code=2):
    print("FRANKLIN_RIG_ERROR " + message)
    raise SystemExit(code)


def main():
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
    with open(os.path.join(out, "muto_batch_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)

    if not report.get("ok"):
        fail("Muto rigging pipeline did not complete; see muto_batch_report.json and worker log", 1)

    arm = bpy.data.objects.get("MPR_Rig")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and len(obj.data.polygons)]
    if arm is None or not meshes:
        fail("Rigged scene is missing MPR_Rig or mesh objects", 1)

    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = arm

    glb_path = os.path.join(out, "franklin_rigged_gta_freemode.glb")
    result = bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_skins=True,
        export_animations=True,
        export_apply=False,
    )
    if "FINISHED" not in result or not os.path.isfile(glb_path) or os.path.getsize(glb_path) == 0:
        fail("glTF export failed", 1)

    print("FRANKLIN_RIG_OK " + json.dumps({
        "glb": glb_path,
        "bytes": os.path.getsize(glb_path),
        "bones": len(arm.data.bones),
        "mesh_objects": len(meshes),
        "source": os.path.basename(src),
        "rig": "GTA V freemode humanoid fallback (Muto Ped Rig 0.3.2)",
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
