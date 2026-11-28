# Lightweight GTA V iOS port — scope and engineering gates

## Product definition

This project is an **unofficial, lightweight iOS port of GTA V**, not a new game inspired by GTA and not a full-fidelity copy of the complete desktop installation.

The intended result preserves GTA V identity and selected original game systems while reducing the content loaded and the cost of rendering on mobile hardware. The first target is a small playable slice, not the entire Los Santos map or every mission and online feature.

## What is in scope for the first playable slice

- The upstream GTA V recompilation/runtime path (ReXGlue + Plume/Xenos + MoltenVK) as the preferred native runtime foundation.
- A limited, streamed playable area rather than the entire world.
- One playable Franklin character, a small animation set, one BMW M5 F90 vehicle.
- Third-person camera, on-foot movement, vehicle entry/exit, basic driving and collision.
- A small number of nearby NPCs and selected interactions.
- Mobile touch controls, pause/settings UI and local save state.
- Mobile performance budgets: reduced draw distance, LODs, texture sizes, selective streaming and bounded NPC/physics work.

Not required for the first slice: the full world, all interiors, every mission, all vehicles, all pedestrians, every ambient script, GTA Online, or Rockstar online services.

## Important distinction: game code vs game content

A lightweight port does **not** need every original map tile, mission, vehicle, NPC and script loaded at once. It still needs a compatible game-code/runtime path for whichever original GTA V systems are retained. The static-recompilation pipeline may need the relevant original executable/build inputs to generate the game library; that is separate from shipping every original asset.

The Franklin and BMW files already processed in this repository are valuable character/vehicle resources. They do not, by themselves, contain the original GTA V game executable, the complete game logic, the original world, or all shaders. Do not confuse an asset conversion success with a playable game runtime.

## Verified assets currently available as CI artifacts

### Franklin + animation set

Artifact: `franklin-niko-retargeted-animated-glb` from workflow run [46113312010](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46113312010).

- The pipeline produced a Franklin ped resource with native `.ydd`, `.yft`, `.ymt`, and `.ytd` files; their headers use the RSC7 resource container signature.
- A retargeted animated GLB contains 4 animation tracks/clips: idle, run, sprint and walk.
- Retarget report records 106 matched animation bone IDs and zero unmatched IDs.
- A native-format `.ycd` intermediate was packed and round-trip decoded.
- The GLB is an interchange/testing artifact, not a native RAGE runtime resource. The retargeted YCD still needs playback validation in the target runtime.

### BMW M5 F90

Artifact: `BMW-M5-F90-GLB-and-previews` from workflow run [46112567911](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46112567911).

- The native source artifact [BMW-M5-F90-extracted-RAGE-assets](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46094904611) preserves `bmwm5f90.yft`, `bmwm5f90.ytd`, `bmwm5f90_hi.yft`, mod-part `.yft` files, and vehicle metadata including `handling.meta`, `carvariations.meta` and `carcols.meta`.
- The extracted native YFT/YTD resources have the RSC7 container signature.
- High-detail GLB conversion reports 274,642 triangles, 153 primitives and 97 embedded images; the source report records 111 textures, with no undecodable textures and no missing GLB textures.
- This is too expensive to assume safe for A13 as-is. It needs a mobile LOD/mesh/texture budget before being used in a real-time scene.
- The GLB is a conversion/interchange format; preserve original RAGE resource inputs for any native asset path.

The `iOS GTA V asset compatibility audit` workflow downloads these existing artifacts and checks their structure without committing the proprietary-derived binary assets into the public repository.

## Runtime strategy

1. Keep building and auditing the actual upstream iOS runtime in cloud macOS GitHub Actions. The user workflow remains iPhone-only; no local Mac or Windows PC is assumed.
2. Finish the upstream native shell build and verify the actual linked libraries and app bundle.
3. Establish the smallest supported game-code build path from legally owned GTA V inputs. Do not upload proprietary game archives or generated game code to public Git history or public artifacts.
4. Integrate the selected Franklin/BMW resources through the formats and resource-loading path actually supported by the runtime. Do not assume a GLB can be loaded by the upstream RAGE renderer.
5. Build the first streamed gameplay slice and measure memory, CPU/GPU time, thermal behaviour and frame pacing.
6. Build both the A14 baseline and an experimental A13 variant in cloud CI. Upstream's documented baseline is A14 or newer, so an A13 compile is only an initial research result; iPhone 11 support still requires installation and real-device testing.

## What the current native CI does and does not prove

A successful `RAGE iOS Runtime Shell (no game data)` workflow proves that the open-source host/runtime components in that workflow compile and package. It does not prove that the original GTA V game library has been generated, that Rockstar game data is loaded, or that the app is playable.

The project must report these milestones separately:

- native host/runtime build;
- game-library build;
- game-data/resource loading;
- first frame from the actual game runtime;
- playable on-foot slice;
- playable vehicle slice;
- tested device compatibility.

Never label an unsigned shell, browser prototype, or static asset preview as a playable GTA V port.
