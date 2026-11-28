# Muto Ped Rig dependency

Status: selected and pinned for the Franklin character-rigging pipeline.

## Upstream

- Repository: https://github.com/B7Kompirine/muto-ped-rig
- Release: `v0.3.2`
- Release page: https://github.com/B7Kompirine/muto-ped-rig/releases/tag/v0.3.2
- License: GPL-3.0-or-later for the add-on code.
- Requirements: Blender 4.2+ and Sollumz 2.9.0+.
- The upstream `data/` directory contains values derived from GTA V files. Those values are not relicensed by the add-on's GPL license; use requires a legitimate GTA V copy.

## Why this dependency

Muto Ped Rig builds a 128-bone GTA V freemode humanoid skeleton, transfers vanilla ped skin weights to a character mesh, converts the mesh to GTA rest pose, validates influences and exports ped resources through Sollumz. It also provides animation retargeting from Mixamo, Unreal, Biped, Rigify and NVIDIA SOMA rigs.

This is the selected fallback rig for our supplied static Franklin GLB because the OBJ audit found no armature, skin weights or animation tracks.

## Franklin integration plan

1. Input: `franklin_clinton_static.glb` (local asset; not committed).
2. In Blender, import the GLB and inspect orientation, scale, pose and disconnected body parts.
3. Fit the Muto Ped Rig 128-bone skeleton; compute weights; convert to GTA rest pose; validate.
4. Export an intermediate skinned representation (prefer GLB with joints, inverse bind matrices and vertex weights, or a documented compact binary format). Keep Sollumz GTA resource export separate from the iOS runtime asset.
5. Decode the chosen animation clips and verify bone IDs / hierarchy before retargeting.
6. Implement native RAGE/Plume skinned-mesh upload, animation sampling and GPU skinning. The current native scene probe is not yet a skeletal character renderer.
7. Test on A13 and A14 devices; CI compilation alone does not prove on-device rendering.

## Important compatibility limits

- This is a GTA V freemode ped skeleton, not the original protagonist-specific `player_one.yft` Franklin resource.
- It is a compatible fallback rig, not proof of exact Franklin bone transforms or Rockstar's original skin weights.
- The supplied Niko YCD files are not assumed compatible. Decode and compare their tracks before use.
- Muto Ped Rig requires Blender and Sollumz; it cannot be executed on iPhone alone. The iPhone-only runtime can consume the exported intermediate after conversion.
- Do not commit Rockstar game archives, extracted proprietary game data, or third-party model archives to this repository. Keep source asset provenance and permissions documented.

## Reproducible upstream pin

Use release `v0.3.2` (tag commit `3352c91`) rather than tracking the moving default branch. Download the release ZIP from the upstream Releases page when a Blender-capable conversion environment is available.
