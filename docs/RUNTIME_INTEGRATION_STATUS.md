# Runtime integration status

Last checked: 2026-11-28.

## What is actually in this repository

- `ios/App.swift`: a SwiftUI + SceneKit procedural walk-test scene. Its character is built from primitive geometry; it is not a GTA V character asset.
- `engine/`: a small C++17 timing/input bridge. It is not ReXGlue and does not execute GTA V.
- `.gitmodules`: declares `upstream/gtav-recomp` as a submodule, but the upstream source files are not currently available as ordinary files in this repository checkout through the GitHub contents API. Verify and initialize the gitlink before attempting a native runtime build.
- The current Xcode project is a minimal custom project, not the upstream iOS app target.

## Upstream runtime facts

The upstream `andrewnakas/gtav-recomp` project uses ReXGlue v0.10.0 and a Vulkan renderer through MoltenVK. Its iOS port is not a drop-in framework: it requires the upstream game/runtime build, the iOS SDK runtime, the GPU plugin, SDL/UIKit integration, MoltenVK, and a prepared shader cache.

The upstream iOS port documentation specifies iOS 17+ and an A14 minimum build target; its tested device is an iPhone 13 mini (A15). Therefore:
- iPhone 12 (A14) is the minimum target stated by upstream.
- iPhone 11 (A13) is below that minimum. It can run this lightweight SceneKit prototype, but must not be represented as a supported device for the full recompiled game runtime.

## Integration sequence

1. Confirm the submodule gitlink points to a known upstream commit and initialize all nested submodules at their pinned revisions.
2. Port the upstream iOS build scripts and CMake targets; do not try to link the whole runtime into the existing SceneKit target as if it were a single library.
3. Build the ReXGlue iOS runtime, GPU plugin, and game host for arm64/iOS 17+ using the upstream patches and toolchain.
4. Integrate the upstream SDL/UIKit entry point and MoltenVK loading/bundle layout.
5. Keep game-derived code, shaders, game data, generated binaries, and IPA contents local to the owner's legally obtained game data. Never commit or distribute them.
6. Build/sign/install on a supported A14+ device and validate memory, GPU, and thermal behavior.

## Current blocker

This repository's current iOS target contains only the SceneKit prototype and the small C++ helper. No ReXGlue runtime, Vulkan/MoltenVK runtime, upstream game host, or game-derived build output is linked. The next engineering task is therefore upstream submodule/build integration, not a cosmetic change to the SceneKit scene.

## Clean-room boundary

Only original integration code, build scripts, public upstream source, and non-game-derived metadata belong in this repository. Do not commit Rockstar game assets, disc images, title updates, extracted models/textures/audio, generated game C++, translated game shaders, compiled game libraries, logs containing game memory, or a game-bearing IPA.
