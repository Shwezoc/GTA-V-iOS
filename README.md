# GTA V iOS Port — Shwezoc

**Goal:** an unofficial, lightweight native iOS port of GTA V. This is a porting project, not a new GTA-inspired game and not a full desktop-game installation copied onto a phone.

The first milestone is a small playable slice that preserves GTA V's identity and selected original systems while loading only a limited area, selected characters/vehicles, and the required gameplay resources.

> The repository contains original integration code and build tooling. It does not publish Rockstar source code, proprietary game executables, generated game code, game shaders, or proprietary game archives. Use only game data you are legally entitled to use.

## Target and constraints

- Development device: iPhone 11 / A13 (experimental target; compatibility is not guaranteed).
- User-side development: iPhone only. No local Mac or Windows PC is assumed.
- Build infrastructure: GitHub Actions, including cloud macOS runners for iOS-native components.
- Preferred runtime direction: `andrewnakas/gtav-recomp` with ReXGlue + Plume/Xenos and MoltenVK.
- Important distinction: `gtav-recomp` is a static recompilation/runtime project; it is not Rockstar's original RAGE Engine source code.

## Lightweight port scope

We do **not** plan to load the entire Los Santos world, every interior, every mission, all ambient scripts, every vehicle/NPC, or GTA Online for the first playable build.

The first slice targets:
- a limited, streamed GTA V area;
- Franklin with a small set of movement animations;
- one BMW M5 F90;
- third-person camera and on-foot movement;
- vehicle entry/exit, basic driving and collision;
- a small active NPC population;
- mobile touch controls and local saves;
- mobile LOD, texture, memory and draw-distance budgets.

A smaller content footprint does not remove the need for compatible game code and runtime support for the original systems we retain. The game executable/build inputs needed by the static-recompilation pipeline are distinct from the map tiles, mission content and other assets that we can omit from the first slice.

See [LIGHTWEIGHT_PORT_SCOPE.md](docs/LIGHTWEIGHT_PORT_SCOPE.md) for the scope, verified asset inventory and engineering gates.

## Assets already processed

- **Franklin:** a ped resource was produced with `.ydd`, `.yft`, `.ymt` and `.ytd` files. The animation pipeline produced a skinned GLB with four clips (idle, walk, run, sprint), 106 matched bone IDs, and a retargeted native-format YCD intermediate. Playback in the actual game runtime still needs validation.
- **BMW M5 F90:** the GTA V YFT/YTD vehicle resources were converted to GLB. The high-detail conversion contains 274,642 triangles and 111 textures; it needs mobile LOD and texture optimization before A13 testing.

These are valuable game resources, but GLB is currently an interchange/test format, not proof that the upstream RAGE renderer can load them directly. The original RAGE resource path must be preserved for native integration.

The [iOS asset compatibility audit](.github/workflows/ios-asset-audit.yml) downloads the existing Franklin and BMW CI artifacts and validates their structure without committing the binary assets to the public repository. The [Franklin + BMW RPF7 packaging workflow](.github/workflows/package-bmw-dlc-rpf.yml) builds a combined native DLC archive in ephemeral CI, verifies it with CodeWalker, and retains only a metadata report.

## Native runtime status

The `RAGE iOS Runtime Shell (no game data)` workflow has successfully compiled and packaged unsigned upstream host shells for both `apple-a14` and experimental `apple-a13` in [run 46117623893](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46117623893). The build runs on cloud macOS runners. Both artifacts contain arm64 host/runtime binaries and the separate `gtav_game.dylib` load dependency, but intentionally omit the generated game library and game shaders. The A13 result proves only that the host components compile for that CPU target; it is **not** proof that GTA V launches or runs on iPhone 11.

The local game-library helper now supports `IOS_CPU_TARGET=apple-a13` (experimental), `apple-a14` (default), or `apple-a15`, so the separately generated library can be compiled for the selected CPU target. This target-selection patch is covered by the [pipeline audit](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46136237878); it has not yet been exercised with real game-generated source.

The shell alone does not include:
- the generated GTA V game library (`gtav_game.dylib`);
- game-derived shader data;
- the user's game data/resources;
- an Apple-signed, installable IPA.

The next gates are: generate the game-specific library from the matching legally owned executable inputs in cloud CI, implement a selective resource install path for the first slice, connect the combined Franklin/BMW DLC package to the actual game loader, and reach the first frame from the actual game runtime. No local Mac/Windows machine is part of the intended user workflow, but the cloud pipeline still needs the required game-code inputs and Apple signing path.

## Hardware warning

The upstream documented baseline is A14 or newer. iPhone 11 uses A13 and is below that baseline. The A13 host shell has compiled experimentally. We will optimize the first slice aggressively, but will not claim game compatibility until the full app has been signed, installed and tested on the actual device.

## Repository layout

- `ios/` — native iOS host/prototype code
- `engine/` — portable frame/input scaffolding
- `upstream/gtav-recomp/` — pinned upstream source submodule
- `browser/` — interface and asset-preview experiments; not the target runtime
- `docs/` — architecture, asset audit and integration status
- `tools/` — dependency preparation and asset/build-input audit tooling
- `.github/workflows/` — cloud build and asset-validation workflows

## Milestone reporting

We report these separately:
1. native host/runtime build;
2. game-library build;
3. game-data and native-resource loading;
4. first frame from the actual GTA V runtime;
5. playable on-foot slice;
6. playable vehicle slice;
7. tested device compatibility.

A browser prototype, static asset preview, unsigned shell or successful CI compile must never be described as a playable GTA V port.
