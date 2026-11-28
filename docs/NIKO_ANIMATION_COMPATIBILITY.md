# Niko animation compatibility and Franklin retarget report

Date: 2026-11-28  
Branch: `minimal-runtime`

## Source decode

The supplied Niko Walk Style Addon archive is decoded with the pinned CodeWalker YCD inspector.

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

The CI pipeline:

1. Downloads and rigs the supplied Franklin OBJ on the GTA V Freemode Male skeleton.
2. Decodes the supplied `move_m@wfire@nikowalk.ycd` using the pinned CodeWalker parser.
3. Imports the YCD XML through pinned Sollumz v2.9.0.
4. Retargets all 106 Niko bone tags onto the rigged Franklin armature.
5. Builds the five source clip entries from four unique animation actions.
6. Exports a skinned glTF 2.0 binary for inspection and intermediate use.

Latest successful run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110320174

GLB output:
- `niko-animated/franklin_niko_animated.glb`
- Meshes: 1
- Skins: 1
- Animation actions: **4**
- Nodes: 130
- Size: 755,248 bytes

## Native RSC7 YCD export — completed and round-trip verified

Sollumz exports the retargeted clip dictionary as XML. The pinned CodeWalker library then packs it into a native GTA V RSC7 resource using resource version 46. The output is loaded again through CodeWalker to verify the binary structure and its clip/animation maps.

- Native file: `niko-animated/niko_franklin_retargeted.ycd`
- RSC signature: `RSC7`
- Resource version: **46**
- Size: **23,701 bytes**
- Clips after round-trip: **5**
- Unique animations after round-trip: **4**
- Skeleton: `mp_m_freemode_01`
- Matched bone IDs: **106 / 106**
- Unmatched bone IDs: **0**
- Round-trip check: **passed**

The CI log emits `NATIVE_RSC7_YCD_VALID` only after CodeWalker has reloaded the generated binary and confirmed the clip count, animation count and skeleton-tag coverage.

## Artifact contents

Successful workflow artifact: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46110320174/artifacts/15249681858

It contains:
- the rigged Franklin GTA add-on ped resource (`.ydd`, `.yft`, `.ymt`, `.ytd`, `peds.meta`, resource manifest);
- the retargeted Blender scene;
- the animated skinned GLB;
- the retargeted native RSC7 `.ycd`;
- the Sollumz YCD XML and CodeWalker round-trip report.

## Scope and limitations

This proves offline decode, exact bone-tag matching, Sollumz import/retarget, skinned GLB export, native RSC7 YCD packing, and CodeWalker round-trip validation.

The generated ped is an add-on ped based on the Freemode Male skeleton, **not** the original Franklin `player_one` story-character skeleton. The generated YCD is a native GTA V resource, but it has not yet been registered into the ped's runtime clip-set metadata or loaded by the iOS RAGE/Plume renderer. No in-game playback claim is made.

## Next implementation stage

Wire the generated YCD dictionary and its clip-set metadata into the Franklin ped resource, then integrate the native resource loading and animation sampling path with the RAGE/Plume runtime. Verify visible playback on the iOS device before marking the character as animated in-game.
