# RPF7 runtime integration status

## Current verified milestone

The combined Franklin + BMW native DLC-style archive was successfully created and reopened with CodeWalker, then independently inspected by the Python RPF7 TOC validator:

- CI run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46118348542
- Latest validation run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46122131838 (all steps passed)
- 51,657,728-byte RPF7 archive, 4 RPF archives, 26 resource entries
- 3 BMW vehicle resources, 18 tuning/mod-part resources, 5 Franklin ped/animation resources
- Three synthetic RPF7 inspector tests passed; only the metadata report was retained, and the generated archive was deleted from the runner

This proves archive structure and packaging only. It does not prove that the RAGE runtime mounts the archive, resolves resources, spawns Franklin or the BMW, or plays the animation clips.

## Upstream investigation

The current public `andrewnakas/gtav-recomp` source was searched for `dlclist`, `RpfManager`, `Packfile`, and `RPF7`. No runtime DLC/RPF7 mounting implementation was found in the code-search results. The RPF7 hit was planning documentation, not a runtime loader.

The upstream iOS runtime uses the recompiled GTA V code with the ReXGlue runtime. The existing RPF7 package workflow is therefore not enough to integrate our assets into the running game.

## New local-only tracing tool\n\nThe local game-library helper now runs `tools/audit_generated_filesystem.py` against the user's locally generated TU27 C/C++ source before compiling `gtav_game.dylib`. It searches for candidate RAGE file-device, RPF/packfile, resource archive, mount/DLC, and file-I/O call sites. Its source snippets and report stay on the local machine; they are never uploaded to CI or committed. Synthetic tests for the scanner pass in the public pipeline audit. This is the next step toward identifying the real game-side filesystem ABI, not a mount implementation.\n\n## Required implementation sequence

1. Trace the upstream virtual file-system and resource-loading interfaces used by the recompiled game.
2. Document the exact RPF7 archive fields, entry path/hash rules, resource metadata and compression variants needed by the package we generate.
3. Implement a clean-room RPF7 reader/mount adapter in the open-source runtime layer if no compatible mount path exists.
4. Add synthetic archive fixtures and automated tests that mount the package and enumerate all 26 entries.
5. Add resource-resolution smoke tests for the Franklin ped, its animation dictionary, and the BMW vehicle resources.
6. Validate in the actual runtime before describing any asset as integrated or playable.

Tracking issue: https://github.com/Shwezoc/GTA-V-iOS/issues/1

## Distribution boundary

Do not commit or publish generated game code, proprietary game data, game shader caches, or an IPA containing game code. Use synthetic fixtures for parser tests and keep any game-derived integration inputs private.
