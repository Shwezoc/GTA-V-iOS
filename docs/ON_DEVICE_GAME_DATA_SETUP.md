# On-device GTA V data setup (upstream iOS port)

This document describes the part of the upstream iOS port that runs on the iPhone itself. It is not a substitute for the generated game library or a signed app build.

## What the upstream iPhone setup screen already does

The pinned upstream source `gtav/src/ios_setup.mm` implements a UIKit document picker and installer:

- It can select files or folders from the iOS Files picker, including iCloud Drive and attached USB storage.
- It classifies the selected inputs by inspecting their contents, rather than trusting the row in which they were selected.
- It expects three inputs from the owner's own game copy:
  - Xbox 360 Disc 1 (Install)
  - Xbox 360 Disc 2 (Play)
  - Title Update 27 (TU27; upstream identifies the STFS package by its contents)
- It calls the upstream `loader::RunDataInstall` routine to copy and verify the data against the app's bundled `expected.txt` hashes.
- Installation runs in the app's Documents directory and supports continuing an interrupted install.
- The upstream setup screen reports progress and logs, and can remove source images after a successful copy if the user chooses.

## Phone-side workflow

1. Keep the three source files in a location visible in the iOS Files app (On My iPhone, iCloud Drive, or an attached USB drive).
2. Launch the upstream-built `GTAV.app` on a compatible, properly signed device.
3. In the GTA V setup screen, use **Choose** to select Disc 1, Disc 2, and TU27. The picker may identify the correct input even if it was selected from a different row.
4. Wait for the content checks and installation to finish. The upstream implementation estimates roughly 16 GB of copied data; leave sufficient free storage for the install.
5. Keep the source files until installation has completed successfully. Only then decide whether to delete them.

Use only game files the device owner is authorized to use. Do not upload disc images, TU files, extracted assets, generated game code, game libraries, or game shaders to this repository or public CI artifacts.

## What this does not solve

The iPhone-side installer only places and verifies game data. It does **not** generate or compile `gtav_game.dylib`, compile the game's shaders, sign the app, or make the game playable by itself.

The pinned upstream build currently uses a macOS/Xcode toolchain for the ReXGlue code generator, iOS SDK build, shader compilation, and generated game-library build. A workflow initiated from an iPhone but executed by GitHub Actions on a Mac runner is still a cloud/macOS build, not an on-device build.

## Device compatibility warning

The upstream documentation states an A14-class minimum/test baseline. An iPhone 11 uses A13, so the repository's experimental A13 build is not evidence that the full game will run reliably on that device.
