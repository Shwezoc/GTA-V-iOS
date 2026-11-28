# Niko animation compatibility report

Date: 2026-11-28  
Branch: `minimal-runtime`

## Source decode

The supplied Niko Walk Style Addon archive was decoded by the pinned CodeWalker-based YCD inspector.

- Workflow run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46108348760
- Artifact: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46108348760/artifacts/15247764655
- `move_m@generic_niko.ycd`: 66 clips, 22 animation map entries.
- `move_m@wfire@nikowalk.ycd`: 5 clips (`idle_intro`, `idle`, `run`, `sprint`, `walk`), 4 animation map entries.
- The four walk-style animations each contain 108 bone-track records and 106 unique bone IDs.

## Exact skeleton-tag comparison

The Niko walk-style YCD bone IDs were compared against the pinned Muto Ped Rig v0.3.2 Freemode Male reference skeleton:

- Armature: `mp_m_freemode_01`
- Reference skeleton size: 128 bones
- Unique bone IDs in Niko walk-style dictionary: 106
- Exact tag matches: **106 / 106**
- Unmatched IDs: **0**

This establishes exact bone-tag coverage for the Niko walk-style dictionary against the Freemode Male reference skeleton. It does **not** prove that the animation curves are already being sampled, retargeted, or played by the native RAGE/Plume runtime.

The broader `move_m@generic_niko.ycd` dictionary has 119 unique bone IDs. Its 106 shared IDs match; 13 IDs are not present in the 128-bone reference and require further investigation before using every generic clip.

## Automation

The YCD inspector now optionally accepts the pinned skeleton JSON and writes per-animation mapped bone names plus an aggregate compatibility summary into each JSON report. The GitHub Actions workflow fetches the exact v0.3.2 skeleton reference and supplies it to the inspector.

## Next implementation stages

1. Confirm the new CI build compiles with skeleton-aware reporting.
2. Run the decoder again to produce the enriched reports.
3. Inspect the clip-to-animation references and sequence channel formats; preserve the YCD source timing and track data.
4. Implement a converter/retarget stage for the Niko walk set into a documented intermediate animation format.
5. Implement or connect the native RAGE/Plume animation sampler and GPU skinning path, then verify on-device playback.

No claim of in-game animation playback is made until a native runtime capture demonstrates it.
