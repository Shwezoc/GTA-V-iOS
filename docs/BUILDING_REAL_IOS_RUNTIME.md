# Real GTA V iOS runtime: build gates

This document separates a diagnostic IPA from an actual GTA V runtime build.

## Current state in this repository

- `ios/App.swift` and `ios/MetalRenderer.swift` are a SwiftUI/Metal diagnostic shell.
- The current GitHub Actions workflow builds that shell only. Its IPA is **not GTA V** and must not be presented as a playable game build.
- `upstream/gtav-recomp` is pinned to `2a76184f563e4b604a88bea8eeed1334e77f3220`; the upstream iOS host, renderer, SDL/UIKit setup and game-data installer exist there.
- The upstream host is not yet linked into this repository's Xcode target.

## Runtime integration sequence

1. Prepare the exact third-party trees and patches documented by upstream:
   - ReXGlue SDK: `rexglue/rexglue-sdk` at `f5337cd`, apply `rexglue-sdk-gtav-linux.patch`.
   - Plume: `renderbag/plume` at `0ce184b`, recursive submodules, apply `plume-gtav.patch`.
   - XenosRecomp: `hedge-dev/XenosRecomp` at `990d03b`, recursive submodules, apply `xenosrecomp-gtav.patch`.
   - SDL3 and FFmpeg patches are applied inside the SDK tree as specified by upstream's iOS port notes.
2. Build the iOS ReXGlue runtime for arm64 (iOS 17 deployment target).
3. Build the GTA V host with `GTAV_GAME_DLL=ON` for the clean shell, and compile the native renderer's own shaders with the macOS DXC toolchain.
4. Package the host with the iOS MoltenVK dynamic library and the SDK runtime libraries. This is still only the shell.
5. On the owner's computer, generate the game library and translate game shaders from the owner's own Xbox 360 Disc 1, Disc 2 and TU27. Those generated outputs are Rockstar-derived and must stay private; they must never be committed or uploaded as CI artifacts.
6. Package/sign the owner's local game library and shaders into the final IPA. The phone then installs the game data through the upstream iOS setup screen.

## Hard constraints

- Upstream's documented iPhone build target is A14 / iPhone 12 or newer, iOS 17+. An iPhone 11 (A13) is below that published baseline; a successful build does not prove it will run.
- The upstream iOS build requires a macOS/Xcode build environment for the iOS SDK, renderer shader compilation and the game-library build. An iPhone-only build is not supported by the upstream instructions.
- A shell-only IPA cannot show the GTA V world. The first meaningful scene milestone is after the native host, game library and required SPIR-V shaders are all present.
- Never put ISOs, TU27, extracted game assets, generated game C++, game libraries, game shaders, or a completed game IPA in this repository or public CI artifacts.

## Source of the build procedure

Use the pinned upstream files:
- `docs/IOS_PORT.md`
- `tools/ios/make_shell.sh`
- `tools/ios/make_app.sh`
- `tools/ios/make_spirv.sh`
- `tools/release/build_release_macos.sh`

This repository's source-audit script checks upstream source presence; it is not a runtime build test.
