# Native iOS runtime status

This document separates verified native build results from actual playable-game milestones.

## Verified cloud-native build

The `RAGE iOS Runtime Shell (no game data)` workflow completed successfully:

- Run: [46115841108](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46115841108)
- Artifact: `rage-ios-gtav-app-shell-apple-a14-no-game-data`
- The artifact contains an arm64 `GTAV.app` host executable, `librexruntime.dylib`, `librexgpu-xenos.dylib`, `libMoltenVK.dylib`, app metadata, runtime interface files and required third-party headers/licenses.
- The CI binary audit and app assembly steps passed.

This build ran on a **cloud macOS GitHub Actions runner**. The user does not need a local Mac or Windows PC for this part of development.

A successful shell build is **not a playable GTA V app**. The shell intentionally does not contain:
- generated/recompiled GTA V game code (`gtav_game.dylib`);
- game-derived shader data / translated SPIR-V;
- original game executable inputs or game content;
- an Apple provisioning profile or a signed/installable IPA.

## Lightweight port vs the current upstream installer

The project target is a **lightweight GTA V port**: a small streamed area and selected gameplay systems, not the entire Los Santos world, every mission, all vehicles/NPCs or GTA Online.

However, the pinned upstream iOS setup is currently a full-install workflow, not a slim-content mode. Its documented data layout includes:
- Disc 2 game data: approximately 7.7 GB;
- Disc 1 install partitions: approximately 7.6 GB;
- Title Update 27 data: approximately 54 MB;
- translated game shaders: approximately 75 MB;
- approximately 16 GB free storage on the phone.

The upstream installer validates and copies the full expected Disc 2, TU27 and Disc 1 partition file sets. We must not pretend that simply deleting arbitrary RPF files will produce a working smaller game.

The static-recompilation code-generation step specifically stages the game's `default.xex` and TU `default.xexp` as executable/patch inputs, then generates the game code library. Those executable inputs are separate from the map, mission and vehicle assets that can potentially be omitted from the first mobile slice.

**Engineering task to meet the lightweight goal:** build the game library in cloud macOS CI from the owner's legally obtained matching executable inputs, then research and implement a selective data/resource install path. The first slice must identify and validate its required RPF/resources rather than assume the whole install is necessary. Game-derived files must never be committed to public Git history or published as public artifacts.

## Verified Franklin and BMW assets

The current asset audit passed in [run 46117227854](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46117227854).

### Franklin

Artifact from [run 46113312010](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46113312010):

- Ped resource outputs include `.ydd`, `.yft`, `.ymt` and `.ytd`.
- Animated GLB: 14.8 MB, 4 skinned meshes, 1 skin, 4 animations, 133 nodes and 60,734 triangles.
- Retarget report: 106 matched bone IDs, zero unmatched IDs.
- Retargeted native-format `.ycd` exists and passed a decode/round-trip check.
- The YCD is an intermediate based on the selected Niko walk-style clips; playback still needs validation in the actual game runtime.

### BMW M5 F90

Artifact from [run 46112567911](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46112567911):

- Converted from GTA V `.yft` / `.ytd` vehicle resources.
- High-detail GLB: 20.0 MB, 274,642 triangles, 153 primitives, 97 embedded images.
- Conversion report: 111 source textures, zero undecodable textures, no missing GLB textures.
- This is a high-detail source asset, not yet an A13-ready LOD. It needs a reduced mesh/texture budget before real-time mobile use.

The GLB files are interchange/test formats, not proof that the upstream RAGE renderer loads them directly. Keep the native RAGE resource path available for integration.

## Device compatibility

The upstream documented iOS baseline is A14 or newer; its development notes identify an A15 iPhone 13 mini as the tested device. The user's iPhone 11 uses A13 and is below that baseline.

We will investigate A13 experimentally. A successful `-mcpu=apple-a13` compile would still not prove that the full runtime is stable on iPhone 11. Compatibility requires installation and real-device testing.

## Build and installation boundaries

1. Cloud macOS CI can build the open-source iOS host/runtime components.
2. Cloud macOS CI can potentially build the game-specific library once the matching legally owned executable inputs are made available through a private, ephemeral workflow.
3. The user's game data and generated game code must not be stored in public repository history or public CI artifacts.
4. App signing/sideloading still requires an Apple identity and a suitable installation workflow.
5. The iPhone must have enough storage for whichever validated resource subset the lightweight mode actually needs.

## Milestones reported separately

- native host/runtime build;
- game-library build;
- selective game-data/resource loading;
- first frame from the actual GTA V runtime;
- playable on-foot slice;
- playable vehicle slice;
- tested iPhone 11 compatibility.

A browser prototype, static asset preview, unsigned shell or successful CI compile is never described as a playable GTA V port.
