# RPF7 runtime integration — source trace (2026-11-28)

## Result of the source trace

The upstream iOS path currently has two distinct data paths:

1. `gtav/src/ios_setup.mm` classifies and installs the user's Disc 1, Disc 2 and TU27 inputs. It delegates to `loader/src/install.h` and `loader/src/sources.h`.
2. The iOS runtime starts the recompiled game through `gtav/src/main.cpp` / ReXGlue. The game code is generated from the user's own game data; `gtav/src/game_bridge.cpp` exposes runtime services to that generated code.

The iOS setup code is **not** an RPF7 DLC mount implementation. It is a source/install selector for the original disc/update inputs. The native renderer path in `gtav/src/native/paths.h` only establishes app Documents paths for SPIR-V, logs and caches; it does not mount DLC archives.

## Additional runtime bridge inspection

The current upstream tree was checked recursively, including `gtav/fs` and `gtav/src`:

- `gtav/fs/fs_crt.cpp` provides freestanding C runtime primitives (`memcpy`, `memmove`, `memset`, `memcmp`); it is not a virtual filesystem.
- `gtav/fs/game_dll.cpp` exports the generated PPC image configuration only.
- `gtav/src/game_bridge.cpp` exports MMIO, timebase, indirect PPC resolution, global locking and trap services. It does not expose a file-open, file-read, archive-mount or DLC-registration API.
- `gtav/src/main.cpp` selects the generated image configuration and creates the ReXGlue app; it contains no DLC mount sequence.
- No standalone filesystem/RPF implementation or RPF7 mount adapter is tracked in the inspected app-side upstream tree.

This is a bounded source-tree finding. It does **not** prove that generated TU27 game code or an external SDK dependency has no internal file-device implementation. It does establish that adding a mount call to the existing iOS app bridge would be guesswork until the generated game-side initialization is traced.

## Consequence for the Franklin + BMW package

The repository's RPF7 package is a packaging artifact. CodeWalker's round-trip check verifies archive structure and entry enumeration; the independent Python inspector checks the unencrypted/open RPF7 TOC and directory/file bounds. Neither check makes the game discover or load the archive.

Do not wire the package into the app by copying it into an arbitrary folder or by editing a guessed DLC list. The correct integration point must be established by tracing the actual generated game-side file-device / packfile initialization and the expected TU27 DLC directory conventions.

## Next engineering steps

- Trace generated TU27 game initialization and file-device / packfile call sites using symbols and call references from the user's own local build.
- Identify the actual file-device ABI, archive registration lifecycle, and path resolution behavior before writing an adapter.
- Build a synthetic test archive and exercise the real game-side resource lookup path; do not treat a standalone parser test as a mount test.
- If a supported extension point exists, add a narrowly scoped RPF7 adapter and test lookup/open/read/seek/close against synthetic fixtures.
- Only after runtime resource resolution works should Franklin spawn/animation and BMW spawn tests be attempted in-app.

## Validation boundary

Current verified results remain separate:
- RPF7 packaging and CodeWalker round-trip: previously passed.
- iOS runtime shell CI: passed.
- RPF7 structural inspector synthetic tests: passed (including the empty root-directory name case).
- RPF7 mounting in the RAGE runtime: **not implemented / not verified**.
- Franklin/BMW in-game spawning, animation playback, vehicle handling and playable gameplay: **not verified**.

Game-derived code, shader caches and proprietary game data remain user-local; do not upload them to public CI artifacts or commit them to this repository.

## Loader confirmation

A follow-up read of upstream `loader/src/install.cpp` and `loader/src/sources.cpp` confirms the boundary:

- The install layout writes Disc 2 files and TU default.xexp under `data/game`, the TU's `update.rpf` under `data/update`, and Disc 1 install partitions under `data/user/.../545408A7/00000002`.
- `sources.cpp` implements source readers for XDVDFS disc images, extracted disc folders and STFS packages (the TU input). These are installer/source readers, not an RPF7 runtime DLC packfile mount.
- On iOS, `install.cpp` explicitly compiles with `LOADER_NO_SPAWN`; the phone performs data-copy/install stages only. Code generation and game compilation are not performed by the iOS setup screen.

This narrows the next target: the RPF7 mount must be integrated on the **game runtime / generated-game filesystem side**, not into the iOS disc-import picker or the installer's XDVDFS/STFS readers.
