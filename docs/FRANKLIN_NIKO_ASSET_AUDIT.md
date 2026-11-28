# Franklin + Niko animation asset audit

Audit date: 2026-11-28  
Branch: `minimal-runtime`

This document records the inspection of the two user-supplied ZIP archives. The archives themselves are intentionally **not committed**: they contain third-party GTA V mod assets. Keep the original downloads local and use them only where the relevant asset permissions allow.

## 1. Franklin character archive

Archive: `PC _ Computer - Grand Theft Auto 5 - Characters - Franklin Clinton.zip`  
ZIP integrity: passed (`ZipFile.testzip()` returned no damaged member).

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
- `feet_diff_000_a_uni.png`: 512×512
- `hair_diff_000_a_uni.png`: 512×512
- `hand_diff_000_a_uni.png`: 1024×1024
- `head_diff_000_a_bla.png`: 1024×1024
- `lowr_diff_000_a_bla.png`: 1024×1024
- `teef_diff_000_a_uni.png`: 512×512
- `uppr_diff_000_a_uni.png`: 1024×1024

### Character-rig finding

The OBJ contains mesh positions, UVs, normals, faces and material assignments. It does **not** contain an armature, bone hierarchy, vertex-group weights, or animation tracks. The object name `SKEL_ROOT.018` is only an OBJ object label; it does not prove that a skeleton is embedded.

Therefore this archive is sufficient for a static character mesh conversion, but not by itself for skeletal animation. A compatible Franklin skeleton and skin weights are still required.

## 2. Niko walk-style archive

Archive: `265fb3-Niko Walk Style Addon v1.0.zip`  
ZIP integrity: passed.

Relevant files:
- `move_m@generic_niko.ycd` — 497,958 bytes
- `move_m@wfire@nikowalk.ycd` — 23,878 bytes
- Main `clip_sets.ymt` — 660,488 bytes
- Optional combat-compatible `clip_sets.ymt` — 689,012 bytes
- Optional LCPP `clip_sets.ymt` — 3,380,491 bytes (XML text)
- Optional standalone clip-set XML snippet in `standalone text data.txt`

The two YCD files begin with the `RSC7` resource signature. The binary YMT begins with `PSIN`. The LCPP optional file is XML text, not a third animation dictionary.

The included author instructions explicitly name these assignments:
- `ClipDictionaryName = move_m@generic_niko`
- `MovementClipSet = MOVE_M@WFIRE@NIKOWALK`

The author describes `move_m@generic_niko` as Niko run/walk stops and `MOVE_M@WFIRE@NIKOWALK` as Niko walk, idle, run and sprint animations. This is the mod author's description; the clips have not yet been decoded or played in our runtime.

## 3. What is and is not proven

| Item | Audit result |
|---|---|
| ZIP integrity | Passed for both archives |
| Franklin static mesh data | Present |
| Franklin material file and textures | Present |
| Franklin skeleton / skin weights | Not present in supplied OBJ |
| Niko YCD animation resources | Present |
| Niko clip-set configuration | Present |
| YCD clip names and per-bone tracks | Not yet decoded |
| Franklin/Niko skeleton compatibility | Not established |
| Playback in the iOS RAGE runtime | Not implemented or tested |

## 4. Correct integration path

1. Obtain a Franklin-compatible GTA V ped skeleton resource (normally the relevant YFT/YDD/YMT family, or a legally usable exported rig) and verify its bone hierarchy.
2. Decode the supplied YCD resources and enumerate clip names, frame counts, track bone IDs and timing. CodeWalker has a YCD resource reader and XML export path.
3. Compare the decoded track bone IDs against the Franklin skeleton. Do not assume Niko's animation set is automatically compatible merely because both are GTA V peds.
4. If the rigs differ, retarget the animation tracks or map them through a compatible GTA V ped skeleton.
5. Convert the Franklin mesh into the runtime's supported skinned-mesh representation, including vertex weights, inverse bind matrices, materials and textures.
6. Add a native animation sampling/skinning path to the RAGE/Plume runtime and verify it on device.

## 5. References

- CodeWalker YCD reader: https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/GameFiles/FileTypes/YcdFile.cs
- CodeWalker ped model structure (YDD/YTD/YCD/YFT/YMT and skeleton): https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/World/Ped.cs
- Sollumz YCD import/export workflow: https://docs.sollumz.org/
