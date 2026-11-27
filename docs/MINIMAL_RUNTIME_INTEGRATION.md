# Minimal runtime integration — verified status

## Objective

Reach the first frame produced by the actual GTA V runtime on iOS. Do not substitute a hand-built scene, a mock character, or the current diagnostic Metal triangle and call it GTA V.

## Repository audit (2026-11-27)

- `ios/App.swift` creates a SwiftUI application and an `MTKView`.
- `ios/MetalRenderer.swift` creates a Metal pipeline and draws exactly one three-vertex triangle.
- `ios/Shaders.metal` contains only that triangle's vertex and fragment shaders.
- `engine/src/GameLoop.cpp` advances a generic frame/time counter; it does not call game code.
- `engine/src/PortCore.cpp` measures frame duration; it does not initialize a game.
- `engine/src/TouchBridge.cpp` exposes touch events, but there is no game input consumer connected to them.
- `ios/ShwezovGTAV.xcodeproj/project.pbxproj` builds the iOS shell and touch bridge; it does not compile or link the upstream GTA runtime.
- `.gitmodules` references `andrewnakas/gtav-recomp`. A Git submodule reference alone does not link or build that runtime.

## Integration direction

Use the upstream project as the runtime source of truth, not the unrelated experimental WebAssembly port. Keep the native Swift/Metal shell only as the iOS host if it can be adapted to the upstream renderer and lifecycle.

The integration boundary must eventually cover:

1. upstream runtime initialization and shutdown;
2. game-data discovery from files supplied by the user;
3. renderer/device and drawable ownership;
4. per-frame game tick and command submission;
5. touch-to-game input translation;
6. suspend/resume, audio session, and memory-pressure handling.

Do not invent function names or call an upstream API until its current headers and build targets have been inspected at the pinned submodule revision.

## Blocking constraints

- The current iOS target has no upstream runtime libraries, generated game code, renderer backend, or shader artifacts linked.
- The upstream build is a cross-compilation/package pipeline and is not an iPhone-only compilation process.
- The upstream project's published device baseline is newer than iPhone 11. The iPhone 11's A13/4 GB configuration is below the stated baseline; successful launch and stable memory use are unverified.
- Game executable/data must come from the user's own legally obtained copy. This repository must not contain proprietary game archives, keys, or extracted game assets.

## Next engineering gate

Before writing a runtime adapter, inspect the exact pinned upstream revision's iOS entry point, CMake targets, renderer interface, and required generated artifacts. Then make the smallest real link: compile/link the upstream iOS runtime target and call its actual initialization path. A successful CI build of the shell alone is not evidence that GTA V is running.
