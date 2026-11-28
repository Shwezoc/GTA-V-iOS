# Native iOS runtime status

This repository has two separate deliverables. Do not describe the browser Three.js scene as RAGE.

## What the native build produces

The `RAGE iOS Runtime Shell (no game data)` workflow builds the upstream GTAV iOS host shell from the pinned `andrewnakas/gtav-recomp` iOS branch and its required third-party dependencies. The shell contains the host executable, ReXGlue runtime libraries, MoltenVK, the iOS app metadata, and the interface files needed by a separately built game library.

A successful shell build is **not a playable GTA V app**. It intentionally does not contain:
- generated/recompiled GTA V game code (`gtav_game.dylib`);
- game-derived shader cache or translated SPIR-V;
- Rockstar game data, disc images, update files, or extracted assets;
- an Apple provisioning profile or a signed/installable IPA.

The CI build may validate the shell binaries and package them as an unsigned artifact. It cannot manufacture the missing game library or shaders without the owner's own installed game data.

## Device compatibility

The upstream iOS development notes identify an iPhone 13 mini with A15 as the tested device and use an A14 target for the separately compiled iOS game library. This repository's experimental A13 compile target is not evidence that an A13 phone is supported. In particular, the user's iPhone 11 (A13) is **not an upstream-supported target at this time**.

Do not promise that an A13 artifact will install, launch, render, or run the game. The A13 shell build is experimental only. The A14 shell build is also only a host shell until the local game library, shaders, data, and signing steps are completed.

## Required local build path

The upstream iOS workflow requires a macOS host with Xcode/iOS SDK and the user's own legally installed game data:

1. Build the macOS ReXGlue code generator and iOS ReXGlue runtime.
2. Build the iOS host shell and bundle MoltenVK.
3. On the Mac, generate the game code from the user's own installed game and compile `gtav_game.dylib` for `arm64-apple-ios17.0 -mcpu=apple-a14`.
4. Translate the user's shader cache to iOS SPIR-V on the Mac.
5. Copy the user's game data and generated files to the app's Documents container.
6. Sign the app with the user's own Apple development/sideloading identity and test on supported hardware.

The repository's GitHub Actions runner can build the open-source host shell, but it must not receive or publish Rockstar game data, generated game code, or game shaders. The iPhone itself is not the supported environment for the upstream game-code generation and shader conversion steps.

## Current development priority

Keep the native runtime build reproducible and auditable, then document the Mac-side local build inputs and validate the iOS bundle. Treat the Three.js BMW/Franklin scene as a separate visual prototype until the native game runtime is actually running.
