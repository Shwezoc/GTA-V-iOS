# Real GTA V iOS runtime: build gates

This document distinguishes the upstream native runtime from the lightweight content scope planned by this project.

## Verified current state

- The repository contains a native iOS shell and a separate upstream RAGE/recompilation build workflow.
- The upstream submodule is pinned to `andrewnakas/gtav-recomp` commit `2a76184f563e4b604a88bea8eeed1334e77f3220`.
- The cloud macOS workflow `RAGE iOS Runtime Shell (no game data)` has successfully built the upstream arm64 iOS host shell, ReXGlue runtime libraries and MoltenVK.
- The resulting unsigned shell is not a playable GTA V app: it has no generated `gtav_game.dylib`, game-derived SPIR-V, game data or signing profile.
- Franklin and BMW assets are processed separately and pass the structural asset audit; see [LIGHTWEIGHT_PORT_SCOPE.md](LIGHTWEIGHT_PORT_SCOPE.md).

## User-side device constraint

The user has an iPhone only. **No local Mac or Windows PC is assumed.**

The open-source host/runtime build can run on GitHub Actions' cloud macOS runner. The next challenge is to move the game-specific generation and shader translation into a private, ephemeral cloud workflow without placing game-derived files in public Git history or public artifacts.

This cloud game-data workflow is not implemented yet. Do not claim that the current shell workflow already builds the game library.

## Lightweight port vs upstream full installer

The target is a small playable GTA V slice, not the full game world. We want to retain selected original gameplay systems and selected GTA V resources while streaming a limited area.

The pinned upstream installer is currently not a lightweight install. Its default data installation expects Disc 2 files, Disc 1 install partitions and TU27, with roughly 15.4 GB of game data copied to the phone (plus translated shaders). The first slice cannot simply delete arbitrary RPF files: the required resources must be identified and tested against the actual game code.

The static-recompilation code-generation step stages `default.xex` and TU `default.xexp` as executable/patch inputs. This is distinct from the full set of map, mission and vehicle assets. A potential slim mode therefore has two separate jobs:
1. build the matching game library from the legally owned executable/patch inputs on a cloud macOS runner;
2. implement and validate a selective resource installer/loader for the first playable area and its required assets.

## Runtime integration sequence

1. Keep the upstream source revision and third-party dependency preparation pinned and reproducible.
2. Build the native iOS host/runtime and verify its arm64 binaries and bundle metadata in cloud CI.
3. Design a private game-code generation job that receives only the user's legally obtained matching inputs through a private, short-lived transfer. Do not store source inputs, generated C++, compiled game libraries or game shaders in the public repository or public artifacts.
4. Determine the minimum resource set required for a small first playable area; add a selective data-install path only after the actual required files are known.
5. Connect Franklin and BMW using native RAGE resource formats where supported. GLB remains an interchange/validation format unless the runtime's actual loader proves otherwise.
6. Build/sign an installable iOS package using an appropriate Apple signing/sideloading workflow.
7. Test on hardware. The upstream baseline is A14 or newer; iPhone 11/A13 remains experimental.

## Local generated-code filesystem audit

After the private TU27 code-generation stage has produced the generated C/C++ source directory, the local build helper now runs:

```sh
python3 tools/audit_generated_filesystem.py /path/to/private/generated --output /path/to/private/output/GENERATED-FILESYSTEM-CANDIDATES.json
```

The scanner looks for candidate references to RAGE file-device types, RPF/packfile/resource archive symbols, mount/DLC registration terms, and common platform file-I/O calls. It records local source basenames, line numbers, categories and short matching lines so the owner can trace call sites and surrounding call graphs. The report stays on the local machine and must not be uploaded to GitHub Actions or committed.

This is a triage aid, not a parser for the generated game's ABI and not proof that an RPF7 mount hook exists. A real adapter still requires tracing the candidate calls into their definitions, determining object layout/calling convention/lifecycle, and testing open/read/seek/close through the actual generated game code. No runtime API is guessed or added until those facts are established.

Synthetic tests for this scanner run in the public pipeline audit; only synthetic fixtures are used there.

## Hard constraints

- A successful shell compile is not a successful game-library build.
- A successful game-library build is not proof that selected game data load.
- A static asset preview is not a first frame from the actual GTA V runtime.
- The current upstream iOS installer requires far more game content than the planned first slice. Selective installation is an engineering task, not a setting that already exists.
- Never put ISOs, TU27 packages, extracted proprietary assets, generated game C++, compiled game libraries, game shaders, or a completed game IPA in public repository history or public CI artifacts.

## Pinned upstream references

- `docs/IOS_PORT.md`
- `tools/ios/make_shell.sh`
- `tools/ios/make_app.sh`
- `tools/ios/make_spirv.sh`
- `tools/game_dll/build_game_dll.py`
