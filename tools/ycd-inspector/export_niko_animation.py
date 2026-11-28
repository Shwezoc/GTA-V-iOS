#!/usr/bin/env python3
"""Export CodeWalker YCD XML to a lossless, skeleton-labelled animation intermediate.

This stage preserves channel encodings and sample arrays. It intentionally does
not reinterpret GTA transform conventions or claim to produce glTF animation.
"""
import argparse
import json
import math
import pathlib
import xml.etree.ElementTree as ET


def value_attr(node, name="value", default=None):
    if node is None:
        return default
    raw = node.get(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return raw


def floats(text):
    return [float(token) for token in (text or "").split()]


def parse_channel(node):
    kind_node = node.find("Type")
    kind = kind_node.get("value", "Unknown") if kind_node is not None else "Unknown"
    result = {"encoding": kind}

    for field in ("Quantum", "Offset"):
        item = node.find(field)
        if item is not None:
            result[field[0].lower() + field[1:]] = value_attr(item)

    value = node.find("Value")
    if value is not None:
        if kind == "StaticQuaternion":
            result["value"] = {
                axis: value_attr(value, axis)
                for axis in ("x", "y", "z", "w")
            }
        else:
            result["value"] = value_attr(value)

    values = node.find("Values")
    if values is not None:
        result["values"] = floats(values.text)

    frames = node.find("Frames")
    if frames is not None:
        result["frameIndices"] = [int(x) for x in (frames.text or "").split()]

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--xml", required=True)
    parser.add_argument("--skeleton", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    xml_path = pathlib.Path(args.xml)
    skeleton_path = pathlib.Path(args.skeleton)
    out_path = pathlib.Path(args.out)

    root = ET.parse(xml_path).getroot()
    skeleton = json.loads(skeleton_path.read_text(encoding="utf-8"))
    bones = {
        int(bone["tag"]): {
            "name": bone["name"],
            "parent": bone.get("parent")
        }
        for bone in skeleton["bones"]
    }

    animations_by_hash = {}
    animations = []
    for item in root.findall("./Animations/Item"):
        animation_hash = item.findtext("Hash", default="")
        bone_items = item.findall("./BoneIds/Item")
        sequence_items = item.findall("./Sequences/Item")
        sequence_data = sequence_items[0].findall("./SequenceData/Item") if sequence_items else []
        if len(bone_items) != len(sequence_data):
            raise ValueError(
                f"{animation_hash}: BoneIds ({len(bone_items)}) and SequenceData "
                f"({len(sequence_data)}) counts differ"
            )

        tracks = []
        for index, (bone_item, sequence) in enumerate(zip(bone_items, sequence_data)):
            bone_id = int(bone_item.find("BoneId").get("value"))
            bone = bones.get(bone_id)
            channels = [
                parse_channel(channel)
                for channel in sequence.findall("./Channels/Item")
            ]
            tracks.append({
                "index": index,
                "boneId": bone_id,
                "boneName": bone["name"] if bone else None,
                "parentBone": bone["parent"] if bone else None,
                "trackType": int(bone_item.find("Track").get("value")),
                "unknown0": int(bone_item.find("Unk0").get("value")),
                "channels": channels
            })

        frames = int(value_attr(item.find("FrameCount"), default=0))
        animations_by_hash[animation_hash] = {
            "hash": animation_hash,
            "frameCount": frames,
            "durationSeconds": value_attr(item.find("Duration")),
            "sequenceFrameLimit": int(value_attr(item.find("SequenceFrameLimit"), default=0)),
            "trackCount": len(tracks),
            "tracks": tracks
        }
        animations.append(animations_by_hash[animation_hash])

    clips = []
    for item in root.findall("./Clips/Item"):
        animation_hash = item.findtext("AnimationHash")
        animation = animations_by_hash.get(animation_hash)
        clips.append({
            "name": item.findtext("Hash"),
            "dictionaryName": item.findtext("Name"),
            "type": (item.find("Type").get("value") if item.find("Type") is not None else None),
            "animationHash": animation_hash,
            "startTime": value_attr(item.find("StartTime")),
            "endTime": value_attr(item.find("EndTime")),
            "rate": value_attr(item.find("Rate")),
            "animationFrameCount": animation["frameCount"] if animation else None,
            "animationDurationSeconds": animation["durationSeconds"] if animation else None
        })

    used_ids = sorted({track["boneId"] for animation in animations for track in animation["tracks"]})
    unmatched = [bone_id for bone_id in used_ids if bone_id not in bones]
    output = {
        "format": "niko-ycd-channel-intermediate",
        "formatVersion": 1,
        "sourceXml": xml_path.name,
        "skeleton": skeleton.get("armature"),
        "skeletonBoneCount": len(bones),
        "boneIdCoverage": {
            "uniqueTrackBoneIds": len(used_ids),
            "matched": len(used_ids) - len(unmatched),
            "unmatchedIds": unmatched
        },
        "clips": clips,
        "animations": animations,
        "limitations": [
            "Channel encodings and decoded sample arrays are preserved; GTA channel semantics are not converted to glTF.",
            "Track-to-bone labels use exact skeleton tag matches.",
            "Runtime sampling, coordinate conversion, retargeting and playback remain separate implementation stages."
        ]
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "output": str(out_path),
        "clips": len(clips),
        "animations": len(animations),
        "tracks": sum(animation["trackCount"] for animation in animations),
        "uniqueBoneIds": len(used_ids),
        "unmatchedBoneIds": unmatched
    }))


if __name__ == "__main__":
    main()
