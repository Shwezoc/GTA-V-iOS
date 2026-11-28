# Niko animation compatibility and Franklin retarget report

Date: 2026-11-28  
Branch: `minimal-runtime`

## Source decode

The supplied Niko Walk Style Addon archive is decoded with the pinned CodeWalker YCD inspector.

- Decode workflow: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46109067134
- Source `move_m@generic_niko.ycd`: 66 clips, 22 animation map entries.
- Source `move_m@wfire@nikowalk.ycd`: 5 clips (`idle_intro`, `idle`, `run`, `sprint`, `walk`), 4 animation map entries.
- Each of the four walk-style animations has 108 bone-track records and 106 unique bone IDs.

## Exact skeleton-tag comparison

The Niko walk-style YCD bone IDs were compared against the pinned Muto Ped Rig v0.3.2 Freemode Male reference skeleton:

- Armature: `mp_m_freemode_01`
- Reference skeleton size: 128 bones
- Unique bone IDs in Niko walk-style dictionary: 106
- Exact tag matches: **106 / 106**
- Unmatched IDs: **0**

The broader `move_m@generic_niko.ycd` dictionary has 119 unique bone IDs. Its 106 shared IDs match; 13 IDs are not present in the 128-bone reference and remain out of scope for this walk-style retarget.

## Franklin retarget and GLB export — completed

The CI pipeline now performs the complete offline conversion:

1. Downloads and rigs the supplied Franklin OBJ on the GTA V Freemode Male skeleton.
2. Decodes the supplied `move_m@wfire@nikowalk.ycd` using the pinned CodeWalker parser.
3. Imports the YCD XML through pinned Sollumz v2.9.0.
4. Retargets all 106 Niko bone tags onto the rigged Franklin armature.
5. Builds NLA clip strips and exports a skinned glTF 2.0 binary.

Successful retarget workflow:

- Run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110027534
- Artifact: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110027534/artifacts/15249147076
- Output: `niko-animated/franklin_niko_animated.glb`
- GLB size: 755,248 bytes
- Meshes: 1
- Skins: 1
- Skeleton joints: 128
- Animation entries: **4**
- Animation channels: **385 per animation**
- Clip entries: **5** (`idle`, `idle_intro`, `walk`, `run`, `sprint`)
- Retargeted armature: `franklin_skel`, 128 bones
- Matched Niko bone IDs: **106 / 106**
- Unmatched bone IDs: **0**

The shared `idle` / `idle_intro` action is exported once to avoid duplicate animation channels. The artifact includes the retargeted Blender scene, GLB, report, and the GTA Freemode ped resource files. The downloaded GLB was independently checked: valid glTF 2.0 binary header, one skinned mesh, one skin, 128 joints, and four animation entries.

## Scope and limitations

This proves the Niko walk-style curves were imported by Sollumz, retargeted to the rigged Franklin Freemode Male skeleton, and exported as a skinned GLB with four animation actions. It does **not** prove playback inside the native RAGE/Plume iOS runtime.

The Franklin GTA resource is still an add-on ped based on the Freemode Male skeleton, not the original `player_one` story-character skeleton. The GLB is an intermediate asset for the native renderer integration stage, not a native GTA V YCD resource.

## Next implementation stage

Integrate the GLB animation data into the native RAGE/Plume asset path (or implement a YCD-native runtime loader), connect clip selection and animation sampling to the character's 128-bone skinning palette, and verify visible playback on the iOS device. Do not mark the game character as animated in RAGE until a native runtime capture confirms it.
