#!/usr/bin/env python3
"""Retarget the Niko walk-style YCD clips onto the rigged Freemode Male ped.

Run inside Blender with Sollumz v2.9.0 enabled. The output is an animated
skinned GLB intermediate plus the updated Blender scene; it is not a native
RAGE runtime asset.
"""
import json
import os
import struct
import sys
import traceback
import xml.etree.ElementTree as ET

def args_after_separator():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return dict(item.split("=", 1) for item in argv if "=" in item)

def fail(message, code=2):
    print("NIKO_RETARGET_ERROR " + message)
    raise SystemExit(code)

def glb_json(path):
    with open(path, "rb") as fh:
        header = fh.read(12)
        if len(header) != 12:
            fail("GLB header is truncated")
        magic, version, total_length = struct.unpack("<4sII", header)
        if magic != b"glTF" or version != 2 or total_length != os.path.getsize(path):
            fail("GLB header validation failed")
        chunk_length, chunk_type = struct.unpack("<I4s", fh.read(8))
        if chunk_type != b"JSON":
            fail("GLB first chunk is not JSON")
        return json.loads(fh.read(chunk_length).decode("utf-8").rstrip(" \t\r\n\0"))

def main():
    import bpy
    from Sollumz.sollumz_properties import SollumType
    from Sollumz.ycd.ycdimport import_ycd
    from Sollumz.tools.animationhelper import action_fcurves

    a = args_after_separator()
    blend = os.path.abspath(a["blend"])
    xml_path = os.path.abspath(a["xml"])
    skeleton_path = os.path.abspath(a["skeleton"])
    out_dir = os.path.abspath(a["out"])
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isfile(blend) or not os.path.isfile(xml_path):
        fail("Rigged Franklin blend or Niko YCD XML is missing")

    bpy.ops.wm.open_mainfile(filepath=blend)

    skeleton = json.load(open(skeleton_path, "r", encoding="utf-8"))
    reference = {int(b["tag"]): b["name"] for b in skeleton["bones"]}
    xml_root = ET.parse(xml_path).getroot()
    niko_ids = {
        int(node.get("value"))
        for node in xml_root.findall("./Animations/Item/BoneIds/Item/BoneId")
    }

    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if not armatures:
        fail("No armature object found in the rigged Franklin scene")

    def tag_map(obj):
        result = {}
        for bone in obj.data.bones:
            try:
                tag = int(bone.bone_properties.tag)
            except Exception:
                continue
            result[tag] = bone.name
        return result

    scored = [(len(niko_ids & set(tag_map(obj))), obj) for obj in armatures]
    score, armature = max(scored, key=lambda pair: pair[0])
    mapped = tag_map(armature)
    missing = sorted(niko_ids - set(mapped))
    if missing:
        fail(f"Target rig {armature.name} is missing {len(missing)} Niko bone tags: {missing[:20]}")
    if score != len(niko_ids):
        fail("Niko bone-tag coverage is not complete")

    print("NIKO_TARGET_RIG", json.dumps({
        "object": armature.name,
        "armature": armature.data.name,
        "boneCount": len(armature.data.bones),
        "nikoUniqueBoneIds": len(niko_ids),
        "matched": score
    }))

    dictionary = import_ycd(xml_path)
    animations_container = next(
        (child for child in dictionary.children if child.sollum_type == SollumType.ANIMATIONS),
        None
    )
    clips_container = next(
        (child for child in dictionary.children if child.sollum_type == SollumType.CLIPS),
        None
    )
    if animations_container is None or clips_container is None:
        fail("Sollumz imported the YCD but did not create Clips/Animations containers")

    animation_objects = [
        obj for obj in animations_container.children
        if obj.sollum_type == SollumType.ANIMATION
    ]
    if len(animation_objects) != 4:
        fail(f"Expected 4 unique Niko animations, imported {len(animation_objects)}")

    retargeted = []
    for animation_obj in animation_objects:
        props = animation_obj.animation_properties
        props.target_id = armature.data  # Sollumz invokes its native retarget_animation callback.
        action = props.action
        if action is None:
            fail(f"Animation {animation_obj.name} has no Blender action after import")

        unresolved = []
        curve_count = 0
        for fcurve in action.fcurves:
            curve_count += 1
            match = re.search(r'pose\\.bones\\["([^"]+)"\\]', fcurve.data_path)
            if not match:
                continue
            bone_name = match.group(1)
            if bone_name.startswith("#") or bone_name not in armature.pose.bones:
                unresolved.append(fcurve.data_path)
        if unresolved:
            fail(f"Animation {animation_obj.name} has unresolved bone paths: {unresolved[:10]}")
        retargeted.append({
            "animation": animation_obj.name,
            "action": action.name,
            "fcurves": curve_count,
            "target": armature.data.name
        })

    # Build one NLA strip per source clip (idle and idle_intro intentionally share an action).
    if armature.animation_data is None:
        armature.animation_data_create()
    for old_track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(old_track)

    fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    clip_report = []
    for clip_obj in clips_container.children:
        props = clip_obj.clip_properties
        links = list(props.animations)
        if not links:
            continue
        for link_index, link in enumerate(links):
            animation_obj = link.animation
            if animation_obj is None or animation_obj.animation_properties.action is None:
                fail(f"Clip {props.hash} references a missing animation action")
            action = animation_obj.animation_properties.action
            start = float(link.start_frame)
            end = float(link.end_frame)
            if end <= start:
                fail(f"Clip {props.hash} has an invalid source frame range")
            track = armature.animation_data.nla_tracks.new()
            track.name = str(props.hash)
            strip = track.strips.new(str(props.hash), 1, action)
            strip.action_frame_start = start
            strip.action_frame_end = end
            duration_frames = max(1.0, float(props.duration) * fps)
            strip.scale = duration_frames / (end - start)
            strip.blend_type = "REPLACE"
            strip.extrapolation = "NOTHING"
            clip_report.append({
                "clip": str(props.hash),
                "action": action.name,
                "startFrame": start,
                "endFrame": end,
                "durationSeconds": float(props.duration)
            })

    mesh_objects = [
        obj for obj in bpy.data.objects
        if obj.type == "MESH" and any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        )
    ]
    if not mesh_objects:
        fail("No skinned mesh with an Armature modifier targeting the selected rig was found")

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = max(2, int(max(
        (clip["durationSeconds"] for clip in clip_report), default=1.0
    ) * fps) + 1)

    blend_out = os.path.join(out_dir, "franklin_niko_animated.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_out)

    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    armature.select_set(True)
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature

    glb_out = os.path.join(out_dir, "franklin_niko_animated.glb")
    if not hasattr(bpy.ops.export_scene, "gltf"):
        fail("Blender glTF exporter is unavailable; the retargeted .blend is saved but GLB export cannot continue")
    bpy.ops.export_scene.gltf(
        filepath=glb_out,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_nla_strips=True,
        export_skins=True,
        export_frame_step=1,
        export_optimize_animation_size=False
    )
    if not os.path.isfile(glb_out) or os.path.getsize(glb_out) < 1000:
        fail("glTF exporter did not produce a valid-sized GLB")
    gltf = glb_json(glb_out)
    if not gltf.get("skins") or not gltf.get("animations") or not gltf.get("meshes"):
        fail("Exported GLB is missing one or more of skins, animations, or meshes")

    report = {
        "ok": True,
        "sourceYcd": os.path.basename(xml_path),
        "targetRig": armature.data.name,
        "targetBoneCount": len(armature.data.bones),
        "nikoUniqueBoneIds": len(niko_ids),
        "matchedBoneIds": score,
        "unmatchedBoneIds": missing,
        "skinnedMeshObjects": [obj.name for obj in mesh_objects],
        "retargetedAnimations": retargeted,
        "clips": clip_report,
        "glb": {
            "path": os.path.basename(glb_out),
            "bytes": os.path.getsize(glb_out),
            "meshCount": len(gltf.get("meshes", [])),
            "skinCount": len(gltf.get("skins", [])),
            "animationCount": len(gltf.get("animations", [])),
            "nodeCount": len(gltf.get("nodes", []))
        },
        "blend": {"path": os.path.basename(blend_out), "bytes": os.path.getsize(blend_out)},
        "limitations": [
            "This is a Blender/Sollumz-retargeted skinned GLB intermediate, not a native RAGE runtime resource.",
            "Playback must still be validated in the iOS RAGE/Plume renderer."
        ]
    }
    report_path = os.path.join(out_dir, "franklin_niko_retarget_report.json")
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    print("NIKO_RETARGET_OK " + json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
