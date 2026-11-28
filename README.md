# GTA V iOS Port — Shwezoc

Experimental iOS integration workspace for the open-source GTA V recompilation project.

> This repository contains original integration code and tooling only. It does not include Rockstar Games source code, proprietary RAGE Engine source, game executables, generated game code, shaders, or game assets. Use only game data you are legally entitled to use.

## Target
- Native platform: iOS / arm64
- Current visual prototype: SwiftUI + SceneKit (Metal-backed)
- Upstream runtime: `andrewnakas/gtav-recomp` (pinned Git submodule)
- Intended renderer: upstream Plume/Vulkan through MoltenVK, hosted by SDL3/UIKit

## Current visual milestone — 3D walk-test, not yet GTA V
The app now contains a small 3D environment with a procedural proxy humanoid walking in place, a road, ground, distant buildings, lighting and an orbitable camera. This is a device/rendering milestone only: the proxy is not the original Michael De Santa model, and the scene is not rendered by RAGE or the upstream GTA V runtime.

The actual upstream ReXGlue/Plume runtime is **not yet linked** to the iOS app. The SceneKit prototype must not be represented as a playable GTA V build. The diagnostic IPA, if CI completes, is only a prototype shell.

## Actual upstream iOS pipeline
The pinned upstream iOS port documents these required stages:

1. Build the iOS ReXGlue SDK runtime and its dependencies (including patched Plume, SDL3 and FFmpeg).
2. Build the iOS game host against that SDK, compile the renderer's own shaders, and bundle the iOS MoltenVK framework.
3. On a supported desktop host, generate/compile the GTA V game library from the user's own Xbox 360 Disc 1, Disc 2 and TU27 data, and translate the game's shader cache for iOS.
4. Package the app shell and locally generated game library/shaders. Game-derived files must stay outside this public repository.

The upstream documentation states that the game-specific iOS library and shaders are built on a desktop host; iOS cannot perform those compile/translation stages itself. A shell-only build cannot render the GTA V world without the locally generated game library and game data.

See [the repository's native runtime status and hardware limits](docs/REAL_IOS_RUNTIME_STATUS.md), [the repository's staged runtime build gates](docs/BUILDING_REAL_IOS_RUNTIME.md), [the pinned upstream iOS build notes](https://github.com/andrewnakas/gtav-recomp/blob/2a76184f563e4b604a88bea8eeed1334e77f3220/docs/IOS_PORT.md) and [the upstream project README](https://github.com/andrewnakas/gtav-recomp/tree/2a76184f563e4b604a88bea8eeed1334e77f3220).

## Hardware compatibility warning

The upstream iOS development baseline is A14 (iPhone 12) or newer. The iPhone 11 uses A13 and is below that documented baseline. An A13-targeted shell compile is experimental and does not establish runtime compatibility. See [native runtime status and hardware limits](docs/REAL_IOS_RUNTIME_STATUS.md) before attempting installation.

## Layout
- `ios/` — native iOS prototype shell
- `engine/` — portable C++ frame/input scaffolding
- `upstream/gtav-recomp/` — pinned upstream source submodule
- `docs/` — architecture and integration notes
- `tools/` — dependency preparation and source/build-input audit tooling
- `webgpu/shaders/` — experimental WGSL rewrites of actual upstream native-renderer shaders; validated by Naga, not yet integrated into Plume

## Validation
Initialize the source submodule and run:

```sh
git submodule update --init --recursive
sh tools/verify_upstream_ios.sh
```

A successful source audit is not a successful runtime build. The audit reports external/generated build inputs separately.

## Browser interface milestone — GTA V loading composition

The former generic text-logo boot card has been replaced by a layered `LOADINGSCREEN_STARTUP` renderer based on the publicly documented 1280×720 composition, independent image planes, perspective cameras and slide transitions reconstructed in [shadany7824/playgta5](https://github.com/shadany7824/playgta5). The implementation is original project code; it does not copy that repository's full page or redistribute Rockstar assets.

**Original game textures are not included.** To display the actual artwork, supply the local files listed in [browser/assets/gtav-loading/README.md](browser/assets/gtav-loading/README.md). The proprietary asset directory is git-ignored and must remain out of public commits and Pages artifacts. When the files are absent, the loader shows an explicit missing-assets diagnostic instead of a fabricated GTA V logo. Current manifest includes the beach opening composition and two further layered screens.

The loading percentage is illustrative interface progress, not a measurement of RAGE startup or game-data loading. The existing main menu, mode selection and settings remain available after the loading sequence. Story Mode and GTA Online remain unavailable until the real runtime and legally sourced game data are integrated.

## Browser target — actual runtime only

There is currently **no playable GTA V/ReXGlue runtime in a browser**. The former Three.js page was a standalone visual prototype and did not execute the upstream game runtime; it is not the browser target and must not be presented as one.

The active browser-port investigation is tracked in [the RAGE/WebAssembly feasibility audit](docs/BROWSER_RAGE_WASM_FEASIBILITY.md). The [shader probe](tools/probe_native_shaders_wgsl.sh) confirms that the simple upstream vertex shader converts to WGSL, while the Vulkan compute-resolve and input-attachment shaders need explicit rewrites. Two first WGSL rewrites now pass Naga validation, but they are not yet integrated into Plume. None of this is a playable game build.

The browser milestone will only be called complete when the actual upstream runtime executes in WebAssembly or a live native instance streams its real rendered frames to the browser. No generated game code, assets, shaders, or game libraries may be committed or published.

## Clean-room rules
1. Do not commit game archives, decrypted executables, keys, generated game C++, compiled game libraries, game shaders, or game data.
2. Do not publish an IPA containing Rockstar-derived code or assets.
3. Keep platform-specific host code separate from portable integration code.
4. Profile memory, CPU, GPU and thermal load on real target hardware before claiming compatibility.
