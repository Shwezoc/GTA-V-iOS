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
   - Emscripten can emit 64-bit-pointer builds, but that does not make browser linear memory behave like a native process address space or provide the fixed mappings the guest-memory implementation expects. Memory64 is supported by current Chromium/Firefox but is not supported by Safari/iOS Safari 27.2. A browser build intended for iPhone therefore cannot assume Memory64; it would need either a 32-bit host-pointer port with a redesigned guest-address translation layer, or a browser/runtime constraint that excludes iPhone Safari.

2. **No WebGPU renderer in Plume**
   - The upstream Plume build contains Vulkan as its portable backend, Metal on Apple, and D3D12 on Windows.
   - There is no WebGPU backend in the inspected source tree.
   - Emscripten does not automatically translate Vulkan calls into WebGPU. A real port needs a new WebGPU implementation of the Plume render-device interface (or a separately maintained translation layer).
   - WebGPU is available in Safari on iOS 27, but implementation support and limits still need device-level validation on the target iPhone. Safari 27 release notes continue to list WebGPU fixes, so the backend must handle validation errors and device loss rather than assuming desktop parity.
   - The Plume RHI contract has 103 pure-virtual methods across its resource, pipeline, command, queue, and device interfaces. It covers buffers and texture views, descriptor sets, graphics/compute pipelines, command lists and barriers, swapchains, fences/semaphores, query pools, plus ray-tracing interfaces. A WebGPU backend must implement the subset the GTAV renderer actually calls and explicitly reject unsupported paths; it is not just a canvas-present function.
   - The inspected GTAV renderer hard-codes `CreateVulkanInterface()` in `gtav/src/native/renderer.cpp` and creates shaders with `RenderShaderFormat::SPIRV` in `gtav/src/native/backend.cpp`. A browser backend therefore needs a renderer factory change as well as a shader-format path; adding a WebGPU implementation to Plume alone will not make GTAV select it.
   - The renderer marks upload/storage buffers as `DEVICE_ADDRESSABLE`, calls `getDeviceAddress()`, and passes those GPU addresses in push constants. The actual `native_memory.hlsl` shader carries a `uint64_t Address` and writes through `vk::RawBufferStore`. WebGPU does not expose a general GPU virtual-address model or raw device-address stores. This requires redesigning the renderer/shader binding ABI around WebGPU bind groups and storage-buffer bindings; a SPIR-V-to-WGSL translation alone cannot preserve it.
   - `native_resolve_compute.comp` uses non-uniformly indexed runtime texture/storage-image descriptor arrays (`nonuniformEXT`); `native_resolve_fetch.frag` uses Vulkan subpass input attachments. The compute resolve is the more promising WebGPU path, but its descriptor arrays must be replaced with WebGPU-compatible binding layouts. The fetch-resolve variant needs to remain disabled or be rewritten as a separate pass.
   - Plume's current `RenderShaderFormat` enum contains only `DXIL`, `SPIRV`, and `METAL`; it has no `WGSL` option. WebGPU's browser shader path needs WGSL-compatible modules. The renderer's rectangle-list path already has a CPU fallback when geometry shaders are unavailable, which is promising; compute resolves and the renderer's descriptor/resource model still need a real backend implementation.
   - The Xenos GPU plugin is currently built with Vulkan SPIR-V/Vulkan sources when `REXGLUE_USE_VULKAN` is enabled, while the GTAV host links the plugin for shader/texture helpers. A browser build must either port the needed plugin functionality or split out a genuinely platform-neutral helper target.

3. **Shader pipeline mismatch**
   - The runtime currently produces and consumes SPIR-V for Vulkan.
   - Browser WebGPU needs a compatible WebGPU shader path, normally WGSL. A port must translate/validate the guest shader output and all renderer shaders against WebGPU's supported feature set; merely copying SPIR-V files into a web package is not sufficient.

4. **Platform services and build graph**
   - `include/rex/platform.h` currently recognizes only Apple, Windows, Android, and GNU/Linux; an Emscripten target reaches `#error Unsupported target OS.` There is no `REX_PLATFORM_WEB` macro.
   - The SDK's `src/core/CMakeLists.txt` selects native Windows sources or a generic `elseif(UNIX)` POSIX set, including fibers, mapped memory, exception handling, sockets, and threading. Emscripten may satisfy broad UNIX checks, but browser Wasm is not a normal POSIX process; these sources need explicit browser replacements or exclusions.
   - The SDK's `src/ui/CMakeLists.txt` selects Vulkan UI sources and, on non-Apple Unix, requires X11/XCB and Wayland packages. That Linux desktop path must be excluded from a browser build and replaced with browser presentation/input.
   - The runtime uses SDL3 for windowing, input, and audio. SDL3's browser platform can cover part of this, but browser lifecycle, file access, threading, audio activation, and persistent storage still need explicit handling.

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
- ReXGlue SDK `include/rex/platform.h`: Emscripten currently reaches `#error Unsupported target OS.`
- ReXGlue SDK `src/core/CMakeLists.txt`: non-Windows builds select native POSIX source files; no browser-specific implementation exists.
- ReXGlue SDK `src/graphics/CMakeLists.txt` and `src/ui/CMakeLists.txt`: Vulkan/D3D12 backend selection and platform-specific UI sources.
- Plume `CMakeLists.txt` and `plume_render_interface.h`: Vulkan, Apple Metal, and Windows D3D12 sources; no WebGPU backend; 103 pure-virtual RHI methods.
- Plume `plume_render_interface_types.h`: shader formats are DXIL, SPIR-V, and Metal; no WGSL.
- GTAV `gtav/src/native/renderer.cpp` and `gtav/src/native/backend.cpp`: Vulkan interface is selected directly and native shaders are requested as SPIR-V.
- GTAV `gtav/src/native/shaders/native_memory.hlsl`: uses a 64-bit GPU device address and `vk::RawBufferStore`; `native_resolve_compute.comp` uses non-uniform descriptor arrays and `native_resolve_fetch.frag` uses a subpass input attachment.
- [Naga shader translation support](https://github.com/gfx-rs/wgpu/tree/trunk/naga): accepts SPIR-V and can emit WGSL, but its WGSL backend is documented as best-effort.
- Upstream `docs/IOS_PORT.md` and the successful CI build log: the iOS shell is not a playable game and requires separately generated private game outputs.


## Target-browser compatibility snapshot

- Safari on iOS 27.2 supports WebGPU, but WebGPU feature/limit parity must be validated on the actual device. See [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes).
- Memory64 is not supported by Safari/iOS Safari 27.2. See [Memory64 browser support](https://caniuse.com/wf-wasm-memory64).
- This makes the current native 64-bit host assumptions a direct iPhone-browser blocker unless the guest-memory layer is redesigned for wasm32. WebGPU availability alone does not solve it.


## First implementation sequence (code-level)

The first code work should be split into independently testable gates rather than attempting a full GTA V link immediately:

1. **Emscripten platform configure gate:** introduce an explicit `REX_PLATFORM_WEB`/Emscripten branch in `include/rex/platform.h` and the SDK CMake source selection, disable native X11/Wayland and Vulkan-only targets, and produce a configure report listing every unsupported source/target. Do not silently route Emscripten through the generic POSIX branch.
2. **Guest-memory prototype:** implement a browser memory arena and guest-address translation for a tiny test that reserves, commits, protects, and releases guest pages. The prototype must not claim compatibility until it passes the SDK's memory tests without native `mmap` assumptions.
3. **Plume WebGPU vertical slice:** implement only the RHI subset needed for a clear + triangle + indexed draw, with WGSL shaders, swapchain resize, and device-loss handling. Keep this as a Plume backend test, not a GTA/RAGE milestone.
4. **GTAV renderer backend selection:** replace the hard-coded Vulkan factory and SPIR-V-only shader creation path with an explicit backend/shader interface. The Vulkan path must remain unchanged and continue passing its existing tests.
5. **Xenos shader path:** add WGSL generation/translation for the Xenos guest shaders and validate format, integer, texture, and synchronization semantics against known-good Vulkan output. Naga is a candidate SPIR-V-to-WGSL translator (its documented WGSL output is best-effort), so test it against the real native shader set before committing to it. In parallel, replace native GPU-device-address shader inputs with bind-group/resource-index inputs; this is a shader ABI change, not only a shader syntax conversion.
6. **Actual runtime integration:** only after gates 1–5 pass, build the browser host and run the real GTAV runtime with locally supplied compatible game data. The first accepted result is a logged real runtime frame, not a mock scene.

### iPhone browser support constraints

| Capability in Safari on iOS 27.2 | Status | Port consequence |
|---|---|---|
| WebAssembly (wasm32) | Supported | Basic Wasm modules can run |
| Memory64 (wasm64) | Not supported | Cannot rely on a 64-bit-pointer Emscripten build on iPhone Safari |
| WebGPU | Supported | A WebGPU backend is technically possible, but feature/limit validation is still required |

The Memory64 restriction makes a wasm32-compatible guest-memory design a requirement if iPhone Safari is a target. A desktop-only wasm64 build would not meet the user's iPhone browser goal.


## WebGPU backend mapping — native renderer call surface

A source scan of `gtav/src/native/backend.cpp` found 41 distinct Plume operation names used by the current native backend. The following are the main browser-backend translations to implement or explicitly gate:

| Existing Plume operation | WebGPU direction | Status / caveat |
|---|---|---|
| Buffers, textures, texture views | `GPUBuffer`, `GPUTexture`, `GPUTextureView` | Feasible, but guest-addressed buffers need a new binding model |
| Descriptor sets and dynamic offsets | `GPUBindGroupLayout`, `GPUBindGroup`, dynamic buffer offsets | Feasible with a resource-binding redesign; descriptor arrays are feature-gated |
| Graphics and compute pipelines | `GPURenderPipeline`, `GPUComputePipeline` | Requires WGSL shaders and layout translation |
| Command lists, draw, dispatch, copies | `GPUCommandEncoder`, render/compute pass encoders | Feasible, but explicit Vulkan barriers become WebGPU usage/state validation |
| Swapchain and present | Canvas `GPUCanvasContext` + current texture | Feasible; browser resize and device-loss lifecycle required |
| Occlusion/timestamp queries | `GPUQuerySet` | Occlusion is available; timestamp queries are optional and must be capability-gated |
| GPU device addresses / raw buffer stores | No direct equivalent | Must rewrite shader ABI and storage-buffer access |
| Fragment shading rate | No general core equivalent | Disable or provide a quality fallback |
| Vulkan input attachments / subpass load | No direct equivalent | Keep fetch-resolve path disabled or split into separate passes |
| Ray-tracing interfaces | No WebGPU core equivalent | Can be rejected if the GTAV renderer does not invoke them |

This is a backend implementation plan, not evidence that any of these WebGPU operations are implemented yet.


## First automated shader-probe results (2026-11-27)

Run: [RAGE WebGPU Shader Translation Probe #46004068098](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46004068098)

| Upstream shader | SPIR-V compile | Naga SPIR-V → WGSL | Finding |
|---|---:|---:|---|
| `native_resolve_fetch.vert` | Pass | Pass | Simple fullscreen vertex shader converts and validates |
| `native_resolve_compute.comp` | Pass | Blocked | Naga rejects storage-image writes without a declared format; the shader also uses non-uniform descriptor arrays |
| `native_resolve_fetch.frag` | Pass | Blocked | Naga rejects Vulkan input attachments / `subpassInput` |

This proves that a generic SPIR-V-to-WGSL conversion is not enough for the native renderer. The vertex shader is portable, but the compute and input-attachment paths need explicit WebGPU rewrites.

Two first rewrites are now in `webgpu/shaders/`:

- `native_resolve_compute_rgba16float.wgsl`: replaces descriptor arrays with one explicitly bound source texture and one `rgba16float` storage texture; replaces Vulkan push constants with a uniform buffer.
- `native_memory_segmented.wgsl`: replaces the 64-bit GPU address / `vk::RawBufferStore` path with a bounded storage-buffer binding and 32-bit segment-relative byte offset.

These are shader-level prototypes only. They are not yet wired into Plume or the GTAV renderer. Both now pass Naga WGSL validation in [probe run #46004467066](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46004467066). This confirms syntax/IR validation only; it does not prove runtime binding compatibility, pixel equivalence, or a functioning WebGPU backend.


## Shader portability probe result (2026-11-27)

GitHub Actions run [RAGE WebGPU Shader Translation Probe #46004467066](https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46004467066) completed successfully as a diagnostic job. The job itself passed because it correctly reports unsupported upstream shaders rather than treating them as successful translations.

Observed results:
- `native_resolve_fetch.vert`: SPIR-V -> WGSL translation and WGSL validation **PASS**.
- `native_resolve_compute.comp`: **BLOCKED**. Naga rejects storage image read/write without a format (`StorageImageWriteWithoutFormat`); unknown non-uniform indexing capabilities/decorations are also reported.
- `native_resolve_fetch.frag`: **BLOCKED**. Naga rejects Vulkan input attachments (`InputAttachment`, `InputAttachmentIndex`) and an unsupported image dimension.
- Two separately authored WebGPU WGSL variants (`native_memory_segmented` and `native_resolve_compute_rgba16float`) pass Naga validation. These are compatibility probes, not evidence that the upstream renderer has been ported.

Artifact: `rage-webgpu-shader-probe` (13 files, 6,906 bytes), attached to the workflow run.

Conclusion: the probe demonstrates that a small part of the native shader path is translatable, but the native resolve compute/fragment path needs explicit WebGPU redesign. The successful workflow status must not be interpreted as a successful RAGE browser build.
