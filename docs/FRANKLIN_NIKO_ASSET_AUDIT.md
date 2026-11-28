# Franklin + Niko animation asset audit

Audit date: 2026-11-28  
Branch: `minimal-runtime`

This document records inspection of the user-supplied ZIP archives. The archives and converted character asset are intentionally **not committed**: they contain third-party GTA V mod assets. Keep original downloads local and use them only where the relevant asset permissions allow.

## 1. Franklin character archive

Archive: `PC _ Computer - Grand Theft Auto 5 - Characters - Franklin Clinton.zip`  
ZIP integrity: passed.

Contents:
- `Franklin Clinton.obj` — 2,758,394 bytes
- `Franklin Clinton.mtl` — 2,107 bytes
- Seven PNG textures

OBJ inspection:
- 19,200 position records (`v`)
- 11,196 UV records (`vt`)
- 17,427 normal records (`vn`)
- 30,367 triangular faces (`f`)
- One OBJ object: `SKEL_ROOT.018`
- Nine material assignments

Texture dimensions:
- feet, hair and teeth: 512×512
- hand, head, lower-body and upper-body: 1024×1024

### Static GLB conversion

A local conversion was completed from the supplied OBJ/MTL/PNG set:
- Output: `franklin_clinton_static.glb`
- Size: 7,125,108 bytes
- Nine mesh/material submeshes
- 30,367 triangles total
- UV coordinates retained
- PNG base-colour textures embedded
- Approximately 1.83 units high in the source coordinate system

This is a static-mesh intermediate only. It has not been loaded by the native RAGE/Plume renderer, and it has no skinning or animation.

### Character-rig finding

The OBJ contains mesh positions, UVs, normals, faces and material assignments. It does **not** contain an armature, bone hierarchy, vertex-group weights, or animation tracks. The object name `SKEL_ROOT.018` is only an OBJ object label; it does not prove that a skeleton is embedded.

Therefore this archive is sufficient for a static character mesh conversion, but not by itself for skeletal animation. A compatible Franklin skeleton and skin weights are still required.

## 2. Niko walk-style archive

Archive: `265fb3-Niko Walk Style Addon v1.0.zip`  
ZIP size: 2,164,568 bytes  
SHA-256: `0c0edccfb8ba4d44ece41d852af2b1ecb10aaa15a3583593c71b4414690856bc`  
ZIP integrity: passed (`testzip()` returned no damaged member).

Relevant files:
- `move_m@generic_niko.ycd` — 497,958 bytes
- `move_m@wfire@nikowalk.ycd` — 23,878 bytes
- Main `clip_sets.ymt` — 660,488 bytes
- Optional combat-compatible `clip_sets.ymt` — 689,012 bytes
- Optional LCPP `clip_sets.ymt` — 3,380,491 bytes (XML text)
- Optional standalone clip-set XML snippet in `standalone text data.txt`

The two YCD files begin with the `RSC7` resource signature. The binary YMT begins with `PSIN`. The LCPP optional file is XML text, not a third animation dictionary.

Both YCD payloads were also independently decompressed and checked locally using raw DEFLATE after the 16-byte RSC7 header:
- `move_m@generic_niko.ycd`: RSC7 version 46, system flags `0x28160003`, graphics flags `0xE0000000` (zero graphics page size); decompressed system payload 724,992 bytes, matching the page size encoded in the flags.
- `move_m@wfire@nikowalk.ycd`: RSC7 version 46, system flags `0x21040001`, graphics flags `0xE0000000` (zero graphics page size); decompressed system payload 40,960 bytes, matching the page size encoded in the flags.

This validates the compressed resource containers and their declared system-page sizes. It does not yet decode clip names or bone tracks.

The included author instructions explicitly name these assignments:
- `ClipDictionaryName = move_m@generic_niko`
- `MovementClipSet = MOVE_M@WFIRE@NIKOWALK`

The author describes `move_m@generic_niko` as Niko run/walk stops and `MOVE_M@WFIRE@NIKOWALK` as Niko walk, idle, run and sprint animations. This is the mod author's description; the clips have not yet been decoded or played in our runtime.

The standalone XML describes the clip-set fallback from `move_m@wfire@nikowalk` to `move_m@generic_niko`, plus streaming metadata. It is configuration metadata, not decoded animation tracks.

## 3. What is and is not proven

| Item | Audit result |
|---|---|
| ZIP integrity | Passed for both archives |
| Franklin source mesh / textures | Present |
| Franklin source OBJ armature / weights | Not present in the supplied OBJ |
| Generated Franklin GTA Freemode Male rig | Exported; 128-bone armature and weighted mesh |
| Niko YCD clip names / animation tracks | Decoded by CodeWalker |
| Niko walk-style bone compatibility | Exact 106 / 106 tag matches against Freemode Male |
| Generic Niko dictionary compatibility | 106 / 119 unique tags match; 13 remain unresolved |
| Sollumz import and retarget | Completed for all four unique walk-style animations |
| Animated GLB intermediate | Exported and independently validated |
| Playback in the native iOS RAGE/Plume runtime | Not implemented or tested |

## 4. Franklin rig and Niko retarget result

The Franklin OBJ was rigged with Muto Ped Rig v0.3.2 and Sollumz v2.9.0 onto the GTA V Freemode Male fallback skeleton:
- Armature: `franklin_skel`, 128 bones
- Weighted mesh: 19,200 vertices
- GTA resource export: `franklin.ydd`, `franklin.yft`, `franklin.ymt`, `franklin.ytd`, `peds.meta`, resource manifest and client stub
- This is a Freemode Male add-on ped, not the original protagonist-specific `player_one` Franklin skeleton.

The Niko walk-style dictionary was decoded and imported by Sollumz:
- Source clips: `idle_intro`, `idle`, `walk`, `run`, `sprint`
- Four unique animation actions; 430 F-curves per action
- All 106 Niko bone IDs matched the Franklin rig; no missing bone tags
- The shared `idle` / `idle_intro` animation is represented by one NLA strip to avoid duplicate curves.

Latest successful pipeline:
- Workflow: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110027534
- Artifact: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110027534/artifacts/15249147076
- Animated GLB: `niko-animated/franklin_niko_animated.glb`
- GLB validation: 1 mesh, 1 skin, 128 joints, 4 animation entries, 130 nodes
- The artifact also contains the retargeted Blender scene, report, and GTA Freemode ped resource files.

This proves offline YCD decode, exact bone-tag matching, Sollumz animation import/retarget, and export of a skinned animated GLB. It does not prove that the native iOS RAGE/Plume runtime can load or play this GLB.

## 5. Automated asset pipeline

- `.github/workflows/decode-niko-ycd.yml` builds the CodeWalker-based inspector, decodes both supplied YCD resources, matches their bone IDs against the pinned Muto Ped Rig Freemode Male reference, and exports skeleton-labelled channel intermediates.
- `tools/ycd-inspector/export_niko_animation.py` preserves decoded YCD channel encodings and sample arrays in a documented intermediate JSON format.
- `.github/workflows/rig-franklin-model.yml` downloads the supplied Franklin and Niko archives, creates the Freemode Male Franklin rig, imports the Niko walk-style YCD through Sollumz, retargets all four unique animations, and exports the animated GLB.
- `tools/retarget_niko_animations.py` validates bone coverage and action paths, creates NLA clips, exports the skinned GLB, and checks its mesh, skin and animation tables.
- Third-party source archives and converted model assets are not committed to the repository; CI artifacts expire after 30 days.

## 6. Next native-runtime stage

The animated GLB is an intermediate asset, not a native GTA V resource. The repository's current iOS host is still a diagnostic Swift/Metal shell, and the upstream GTA runtime is not yet linked into that target. The next engineering work is to integrate the real runtime first, then decide whether to add a supported asset bridge or use the game's native YCD animation loader. Native sampling, pose evaluation, GPU skinning and on-device playback must be separately implemented and verified.

## 6. References

- CodeWalker YCD reader: https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/GameFiles/FileTypes/YcdFile.cs
- CodeWalker ped model structure (YDD/YTD/YCD/YFT/YMT and skeleton): https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/World/Ped.cs
- Sollumz YCD import/export workflow: https://docs.sollumz.org/
