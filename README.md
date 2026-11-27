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

See [the repository's staged runtime build gates](docs/BUILDING_REAL_IOS_RUNTIME.md), [the pinned upstream iOS build notes](https://github.com/andrewnakas/gtav-recomp/blob/2a76184f563e4b604a88bea8eeed1334e77f3220/docs/IOS_PORT.md) and [the upstream project README](https://github.com/andrewnakas/gtav-recomp/tree/2a76184f563e4b604a88bea8eeed1334e77f3220).

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

## Browser target — actual runtime only

There is currently **no playable GTA V/ReXGlue runtime in a browser**. The former Three.js page was a standalone visual prototype and did not execute the upstream game runtime; it is not the browser target and must not be presented as one.

The active browser-port investigation is tracked in [the RAGE/WebAssembly feasibility audit](docs/BROWSER_RAGE_WASM_FEASIBILITY.md). The [shader probe](tools/probe_native_shaders_wgsl.sh) confirms that the simple upstream vertex shader converts to WGSL, while the Vulkan compute-resolve and input-attachment shaders need explicit rewrites. Two first WGSL rewrites now pass Naga validation, but they are not yet integrated into Plume. None of this is a playable game build.

The browser milestone will only be called complete when the actual upstream runtime executes in WebAssembly or a live native instance streams its real rendered frames to the browser. No generated game code, assets, shaders, or game libraries may be committed or published.

## Clean-room rules
1. Do not commit game archives, decrypted executables, keys, generated game C++, compiled game libraries, game shaders, or game data.
2. Do not publish an IPA containing Rockstar-derived code or assets.
3. Keep platform-specific host code separate from portable integration code.
4. Profile memory, CPU, GPU and thermal load on real target hardware before claiming compatibility.
