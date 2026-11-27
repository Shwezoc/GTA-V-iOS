# GTA V iOS Port — Shwezoc

Experimental iOS integration workspace for the open-source GTA V recompilation project.

> This repository contains original integration code and tooling only. It does not include Rockstar Games source code, proprietary RAGE Engine source, game executables, generated game code, shaders, or game assets. Use only game data you are legally entitled to use.

## Target
- Native platform: iOS / arm64
- Current app shell: SwiftUI + Metal
- Upstream runtime: `andrewnakas/gtav-recomp` (pinned Git submodule)
- Intended renderer: upstream Plume/Vulkan through MoltenVK, hosted by SDL3/UIKit

## Current status — not yet a GTA V build
The existing Swift app and C++ frame/input scaffolding are diagnostic scaffolding only. `ios/MetalRenderer.swift` still draws a triangle. The upstream ReXGlue/Plume runtime is **not yet linked** to the app, and no Michael/player scene is running.

The GitHub Actions IPA currently produced by this branch is only that diagnostic Swift/Metal shell. It is **not a GTA V IPA** and will not show a GTA V 3D scene. Its artifact is deliberately labelled accordingly.

## Actual upstream iOS pipeline
The pinned upstream iOS port documents these required stages:

1. Build the iOS ReXGlue SDK runtime and its dependencies (including patched Plume, SDL3 and FFmpeg).
2. Build the iOS game host against that SDK, compile the renderer's own shaders, and bundle the iOS MoltenVK framework.
3. On a supported desktop host, generate/compile the GTA V game library from the user's own Xbox 360 Disc 1, Disc 2 and TU27 data, and translate the game's shader cache for iOS.
4. Package the app shell and locally generated game library/shaders. Game-derived files must stay outside this public repository.

The upstream documentation states that the game-specific iOS library and shaders are built on a desktop host; iOS cannot perform those compile/translation stages itself. A shell-only build can validate the host/runtime but cannot render Michael or the game world without the locally generated game library and game data.

See [the repository's staged runtime build gates](docs/BUILDING_REAL_IOS_RUNTIME.md), [the pinned upstream iOS build notes](https://github.com/andrewnakas/gtav-recomp/blob/2a76184f563e4b604a88bea8eeed1334e77f3220/docs/IOS_PORT.md) and [the upstream project README](https://github.com/andrewnakas/gtav-recomp/tree/2a76184f563e4b604a88bea8eeed1334e77f3220).

## Layout
- `ios/` — current native diagnostic app shell
- `engine/` — portable C++ frame/input scaffolding
- `upstream/gtav-recomp/` — pinned upstream source submodule
- `docs/` — architecture and integration notes
- `tools/` — source/build-input audit tooling

## Validation
Initialize the source submodule and run:

```sh
git submodule update --init --recursive
sh tools/verify_upstream_ios.sh
```

A successful source audit is not a successful runtime build. The audit reports external/generated build inputs separately.

## Clean-room rules
1. Do not commit game archives, decrypted executables, keys, generated game C++, compiled game libraries, game shaders, or game data.
2. Do not publish an IPA containing Rockstar-derived code or assets.
3. Keep platform-specific host code separate from portable integration code.
4. Profile memory, CPU, GPU and thermal load on real target hardware before claiming compatibility.
