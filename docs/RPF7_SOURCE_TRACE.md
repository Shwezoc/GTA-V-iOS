# RPF7 runtime integration — source trace (2026-11-28)

## Result of the source trace

The upstream iOS path currently has two distinct data paths:

1. `gtav/src/ios_setup.mm` classifies and installs the user's Disc 1, Disc 2 and TU27 inputs. It delegates to `loader/src/install.h` and `loader/src/sources.h`.
2. The iOS runtime then starts the recompiled game through `gtav/src/main.cpp` / ReXGlue. The game code is generated from the user's own game data; `gtav/src/game_bridge.cpp` exposes runtime services to that generated code.

The iOS setup code is **not** an RPF7 DLC mount implementation. It is a source/install selector for the original disc/update inputs. The native renderer path in `gtav/src/native/paths.h` only establishes app Documents paths for SPIR-V, logs and caches; it does not mount DLC archives.

The public upstream tree inspected for this trace contains no dedicated RPF7/DLC mount adapter in the app-side `gtav/src` files. This is a bounded finding, not proof that the generated game code or every SDK dependency lacks archive support.

## Consequence for the Franklin + BMW package

The repository's RPF7 package is a valid packaging artifact (the existing CodeWalker round-trip check verifies archive structure and entry enumeration). That alone does not make the game discover or load it.

Do not wire the package into the app by copying it into an arbitrary folder or by editing a guessed DLC list. The correct integration point must be established by tracing the actual game-side file-device / packfile initialization and the expected TU27 DLC directory conventions.

## Next engineering steps

- Trace `loader/src/install.cpp` and `loader/src/sources.cpp` to document exactly which files are installed and where.
- Inspect the generated TU27 game initialization / file-device hooks available to the clean-room build; identify the supported archive mount path and lifecycle.
- If an extension point exists, add a narrowly scoped adapter for a test RPF7 archive; otherwise document the missing hook before designing a reader.
- Add synthetic archive fixtures and assert that all 26 entries in the current Franklin + BMW slice are enumerated and resolvable.
- Only after the runtime can resolve the resources should Franklin spawn/animation and BMW spawn tests be attempted in-app.

## Validation boundary

Current verified results remain separate:
- RPF7 structural packaging and CodeWalker round-trip: passed.
- iOS runtime shell CI: passed.
- RPF7 mounting in the RAGE runtime: **not implemented / not verified**.
- Franklin/BMW in-game spawning, animation playback, vehicle handling and playable gameplay: **not verified**.

Game-derived code, shader caches and proprietary game data remain user-local; do not upload them to public CI artifacts or commit them to this repository.


## Loader confirmation

A follow-up read of upstream `loader/src/install.cpp` and `loader/src/sources.cpp` confirms the boundary:

- The install layout writes Disc 2 files and TU default.xexp under `data/game`, the TU's `update.rpf` under `data/update`, and Disc 1 install partitions under `data/user/.../545408A7/00000002`.
- `sources.cpp` implements source readers for XDVDFS disc images, extracted disc folders and STFS packages (the TU input). These are installer/source readers, not an RPF7 runtime DLC packfile mount.
- On iOS, `install.cpp` explicitly compiles with `LOADER_NO_SPAWN`; the phone performs data-copy/install stages only. Code generation and game compilation are not performed by the iOS setup screen.

This narrows the next target: the RPF7 mount must be integrated on the **game runtime / generated-game filesystem side**, not into the iOS disc-import picker or the installer's XDVDFS/STFS readers.
