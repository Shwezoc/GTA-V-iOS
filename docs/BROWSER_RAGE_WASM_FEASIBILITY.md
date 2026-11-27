# Browser RAGE runtime — feasibility audit

Audit date: 2026-11-27

Pinned game runtime: `andrewnakas/gtav-recomp@2a76184f563e4b604a88bea8eeed1334e77f3220`  
Pinned ReXGlue SDK: `rexglue/rexglue-sdk@f5337cdc947ff6d4c4196737e2c807a48f2a1fc2`  
Pinned Plume revision in the upstream integration: `renderbag/plume@0ce184b`

## Decision

There is no browser/WebAssembly target in the pinned upstream runtime. The current `browser/` folder is a separate Three.js prototype and does not execute RAGE, ReXGlue, or the GTA V runtime.

A genuine browser port is a separate engine-porting project, not a build-flag change. Do not label the existing browser prototype as RAGE.

## Verified blockers

1. **ReXGlue platform and address-space assumptions**
   - The pinned SDK CMake project recognizes Windows, Linux, and Apple platforms; other systems fail platform detection.
   - It explicitly requires 64-bit pointers.
   - The POSIX memory implementation relies on `mmap`, fixed-address mappings, `mprotect`, shared file mappings, and executable-memory behavior. Those semantics do not map directly to browser WebAssembly linear memory.
   - Emscripten can emit 64-bit-pointer builds, but that does not make browser linear memory behave like a native process address space or provide the fixed mappings the guest-memory implementation expects. Full Memory64 support is available in current desktop Chromium/Firefox, but is not supported by Safari/iOS Safari as of this audit. Safari on iOS 27.2 does expose WebGPU, but that does not remove the memory-model blocker.

2. **No WebGPU renderer in Plume**
   - The upstream Plume build contains Vulkan as its portable backend, Metal on Apple, and D3D12 on Windows.
   - There is no WebGPU backend in the inspected source tree.
   - Emscripten does not automatically translate Vulkan calls into WebGPU. A real port needs a new WebGPU implementation of the Plume render-device interface (or a separately maintained translation layer).
   - Safari/iOS WebGPU support is still listed as partial, so the WebGPU feature set and device-loss behavior need explicit validation on the target iPhone.
   - The Plume RHI contract is broad: buffers and texture views, descriptor sets, graphics/compute pipelines, command lists and barriers, swapchains, fences/semaphores, query pools, plus ray-tracing interfaces. A WebGPU backend must implement the subset the GTAV renderer actually calls and explicitly reject unsupported paths; it is not just a canvas-present function.

3. **Shader pipeline mismatch**
   - The runtime currently produces and consumes SPIR-V for Vulkan.
   - Browser WebGPU needs a compatible WebGPU shader path, normally WGSL. A port must translate/validate the guest shader output and all renderer shaders against WebGPU's supported feature set; merely copying SPIR-V files into a web package is not sufficient.

4. **Platform services**
   - The runtime uses SDL3 for windowing, input, and audio, but the SDK's UI platform source selection currently covers Windows, Apple, and Linux.
   - Browser-specific lifecycle, file access, threading, audio, input, and persistent storage need explicit handling.

5. **No playable game payload in the current CI artifact**
   - The latest RAGE iOS job builds `gtav_fast`, `librexruntime.dylib`, and `librexgpu-xenos.dylib` for arm64.
   - The executable imports a separately generated `gtav_game.dylib`; the artifact deliberately contains no such game library, game data, or translated game shaders.
   - A real GTA V scene requires the owner's own compatible Xbox 360 Disc 1, Disc 2, and TU27, plus locally generated game code and shaders. Those Rockstar-derived outputs must remain private and must never be uploaded to this repository or CI artifacts.

## Practical routes

### Route A — true in-browser RAGE/WASM port

This requires, at minimum:

1. Define and implement a browser-compatible guest-memory/address-space model for ReXGlue.
2. Add a supported WebAssembly target and resolve 64-bit pointer/address assumptions.
3. Port the Plume RenderDevice abstraction to WebGPU, including resource heaps, render/compute passes, barriers, formats, and presentation.
4. Implement a WGSL shader pipeline compatible with the Xenos shader translator and the renderer's internal shaders.
5. Port runtime platform services to browser lifecycle, SDL3/Emscripten, browser file APIs, and WebAudio.
6. Build a private local game-data pipeline and validate a first frame using owner-supplied game data. Never put generated game code, assets, shaders, or game libraries in GitHub.

This is a substantial port. It is not currently buildable from the pinned source with a single CMake option.

### Route B — browser display of a real native RAGE instance

A native desktop/device build can render the actual game and stream its frames to a browser (for example, through WebRTC). This avoids rewriting the renderer for WebGPU, but still requires a separate host with a compatible GPU, a complete private game build, and a streaming service. GitHub Actions artifacts are not an interactive GPU host.

## Acceptance criteria — what may be called “RAGE in browser”

Do not mark the browser milestone complete until all are true:

- The browser loads a build of the actual pinned ReXGlue/GTAV runtime, or visibly receives frames from a live native instance of that runtime.
- The runtime reports successful initialization and frame progression; a static screenshot or Three.js scene is not evidence.
- The frame is produced by the actual upstream game/runtime path, not a hand-authored replacement scene.
- Any owner-derived game data remains local/private and is not committed or published.

## Evidence checked

- Upstream `gtav/CMakeLists.txt`: the GTAV host links Plume and the Xenos GPU plugin; iOS uses the native runtime path.
- ReXGlue SDK `CMakeLists.txt`: platform detection and 64-bit pointer requirement.
- ReXGlue SDK `src/graphics/CMakeLists.txt` and `src/ui/CMakeLists.txt`: Vulkan/D3D12 backend selection and platform-specific UI sources.
- Plume `CMakeLists.txt`: Vulkan, Apple Metal, and Windows D3D12 sources; no WebGPU backend.
- Upstream `docs/IOS_PORT.md` and the successful CI build log: the iOS shell is not a playable game and requires separately generated private game outputs.
