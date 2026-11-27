# Port architecture

## Scope
Build an original iOS compatibility and integration layer around legally obtained game data. This repository is not a redistribution of GTA V or the RAGE Engine.

## Components
- **iOS host** — lifecycle, permissions, file access, audio session, touch and controller input.
- **Graphics backend** — Metal device, command queue, drawable lifecycle, frame pacing, GPU resources.
- **Portable core** — C++ interfaces for timing, input, filesystem access, logging and platform services.
- **Asset pipeline** — manifests and validation for user-provided files; no proprietary assets in Git.
- **Diagnostics** — frame-time metrics, memory pressure and thermal-state reporting.

## Implementation order
1. Establish a buildable Swift + C++ iOS shell.
2. Add a Metal frame loop and on-screen diagnostics.
3. Add touch and supported game-controller input.
4. Add a virtual filesystem and asset-manifest validation.
5. Research documented compatibility requirements and implement only components whose source and licensing permit use.
6. Profile and optimize against iPhone 11 memory, GPU and thermal constraints.

## iPhone 11 constraints
Treat memory and sustained thermal performance as first-class constraints. Use asset streaming, bounded caches, asynchronous I/O and adaptive rendering quality. Do not assume desktop GPU features or desktop memory budgets.

## Non-goals
- No bundled commercial game files.
- No circumvention of platform security or DRM.
- No claim that the original game engine is already running on iOS.
