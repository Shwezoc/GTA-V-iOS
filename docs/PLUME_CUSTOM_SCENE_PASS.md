# Custom 3D scene pass in the upstream RAGE/Plume renderer

Status: the native RAGE present-pass patch and diagnostic cube shaders compile successfully in both iOS CI targets (experimental Apple A13 and A14). The unsigned shell artifacts contain the native arm64 executable and embedded `VSSceneProbe`, `PSSceneProbe`, and `gtav_native_scene_probe` symbols. **Actual on-device rendering, D32 depth behavior, and visual capture are still pending.** This is not yet a GLB importer or BMW integration.

Latest verified CI run:
- Run: https://github.com/Shwezoc/GTA-V-iOS/actions/runs/46098630311
- Commit built: `dcc9939b9bb61c1b3c7a510dcc81e8ac20359cf6`
- A13 job: success; artifact `rage-ios-gtav-app-shell-apple-a13-no-game-data` (7,979,001 bytes)
- A14 job: success; artifact `rage-ios-gtav-app-shell-apple-a14-no-game-data` (7,995,533 bytes)
- Both artifacts are unsigned native iOS shell packages with no Rockstar game data and are not playable IPAs.

Pinned revisions:
- GTAV/ReXGlue: `andrewnakas/gtav-recomp@2a76184f563e4b604a88bea8eeed1334e77f3220`
- Plume: `renderbag/plume@0ce184b`

## Correct integration point

The native renderer's frame loop in `gtav/src/native/renderer.cpp` records the guest frame through:

1. `backend_.Execute(frame, record_list, &front_descriptor)`
2. Acquires the swapchain image and binds its framebuffer.
3. Calls `backend_.Blit(list_, front_descriptor, kSwapchainFormat)` when a guest front buffer exists.
4. Draws the FPS counter and ImGui menu.
5. Transitions the swapchain image to PRESENT and submits the command list.

A custom scene pass belongs after the game `Blit` and before `DrawCounter` / `DrawMenu`. It must be recorded on the existing Plume command list and use the renderer's existing device/queue. It must not create a second SDL window, second Vulkan device, SceneKit renderer, or Three.js canvas.

## Important architectural distinction

The upstream `Backend` is a guest Xenos command-stream replay backend. Its vertex/index buffers, shader translation, descriptor heaps, and render-target handling are specialized for replaying the game's GPU commands. It is not a general-purpose glTF scene graph or asset loader.

The proposed pass is therefore a native Plume scene pass hosted by the RAGE renderer. It can render project-owned or legally supplied converted models through the same Plume graphics device and frame submission path. It does not magically turn arbitrary GLB geometry into GTA V game-world geometry, nor does it mean the game itself has loaded those models.

## Required implementation stages

### Stage 1 — Plume geometry proof

- Implemented: `Backend::DrawSceneProbe` creates a Plume graphics pipeline and draws a procedural 36-vertex cube from `SV_VertexID` in the existing RAGE present command list, after the guest front-buffer blit.
- Implemented: each swapchain image receives a matching D32 depth texture attached to its present framebuffer; the custom pass transitions and clears depth immediately before drawing.
- Verified by CI: the patched upstream iOS shell compiles for both A13 and A14; the resulting arm64 executable contains the diagnostic shader and CVar symbols.
- Not yet verified: the cube is actually visible on an iPhone, the D32 target works on the device's MoltenVK path, or depth occlusion is visually correct.
- Next: capture the real RAGE renderer output on device, validate depth behavior, then replace procedural vertices with an uploaded indexed mesh.

The pinned Plume `examples/triangle/main.cpp` and `examples/cube/main.cpp` demonstrate the relevant API families: `createPipelineLayout`, `createShader`, `createGraphicsPipeline`, `createBuffer`, `setGraphicsPipelineLayout`, `setPipeline`, `setVertexBuffers`, and `drawInstanced`.

### Stage 2 — depth-tested scene

- Give each swapchain image a matching depth texture using Plume's `RenderTextureDesc::DepthTarget(width, height, RenderFormat::D32_FLOAT)` (confirm format support on the target device before relying on it).
- Attach the depth texture through `RenderFramebufferDesc::depthAttachment` when creating each present framebuffer.
- Configure the custom `RenderGraphicsPipelineDesc` with `depthEnabled = true`, `depthWriteEnabled = true`, `depthFunction = RenderComparisonFunction::LESS`, and `depthTargetFormat = RenderFormat::D32_FLOAT`.
- Record `clearDepthStencil(true, false, 1.0f, 0)` at the start of the custom pass.
- Keep the game's color blit as the background, then draw opaque custom geometry with depth testing/writes enabled.
- Recreate depth textures and framebuffers on swapchain resize.
- Respect the existing frames-in-flight lifetime and never reuse a depth resource while its frame is in flight.

Without a depth attachment, a car and character may draw in the wrong order; a color-only overlay is not an acceptable 3D scene implementation.

### Stage 3 — BMW M5 asset path

- Parse the already converted BMW GLB on CPU.
- Extract indexed positions, normals, UVs, material assignments, and image textures.
- Upload geometry and textures to Plume resources.
- Use bounded GPU-memory allocations and release resources only after the relevant frame fence.
- Start with one static LOD/mesh and a small texture subset; do not load the full high-detail asset blindly on an A13-class device.

The upstream project currently has no ready-made GLB/glTF importer. The existing browser GLB viewer is not reusable as a renderer implementation.

### Stage 4 — character and camera

- Add a separately licensed/owned humanoid GLB using the same mesh/material pipeline.
- Add a shared perspective camera and per-object transforms.
- Add skeletal animation only after static geometry and materials are stable.
- Keep the custom scene behind an explicit diagnostic toggle so it cannot corrupt normal GTA V frame replay.

## Acceptance checks

Do not call this milestone complete until:
- The custom pass is compiled into the pinned upstream iOS runtime, not merely into the Swift diagnostic app. **Passed in A13 and A14 CI.**
- A Plume-rendered indexed mesh appears in the actual RAGE renderer's submitted frame. **Pending on-device capture.**
- Depth testing correctly occludes the mesh. **Pending on-device validation.**
- The pass survives swapchain resize and multiple frames in flight. **Pending on-device validation.**
- The BMW is loaded from the GLB asset path and appears in that same pass. **Not implemented.**
- The character appears in that same pass. **Not implemented.**
- Build logs and a runtime capture prove the renderer path; a Three.js/SceneKit preview is not evidence.

## Device and packaging constraints

- The upstream documented baseline is A14/iPhone 12; the project's iPhone 11/A13 target is below that baseline and must be treated as experimental.
- The iOS runtime shell build is not a playable game and does not contain game code or game data.
- Keep all Rockstar-derived game data, generated game code, game shaders, and private game libraries out of the repository and CI artifacts.

## Verified Plume depth API

The pinned `plume_render_interface_types.h` defines `RenderTextureDesc::DepthTarget(...)`, `RenderFormat::D32_FLOAT`, `RenderFramebufferDesc::depthAttachment`, and the pipeline fields `depthEnabled`, `depthWriteEnabled`, `depthFunction`, and `depthTargetFormat`. The command-list interface exposes `clearDepthStencil(...)`. These APIs compile in the current iOS CI build; actual D32 support and the required transition/layout behavior still need to be validated on the iOS MoltenVK device.

## Shader build integration

The `rage-scene-probe.patch` adds the HLSL shader to the upstream native shader generation commands, creates SPIR-V vertex and pixel shader headers, includes those headers in the native blit shader bundle, and wires the new HLSL file into CMake dependencies. The successful iOS build plus the embedded `VSSceneProbe` and `PSSceneProbe` strings in the executable confirm that the diagnostic shader code is part of the compiled binary.

This proves compilation, not visual output. Runtime validation on the actual device remains required.

## Render-target sequencing detail

The existing RAGE present framebuffer is created with the guest swapchain color attachment plus the new per-image depth attachment. Keep the guest front-buffer blit first; only clear the depth attachment immediately before the custom geometry draw, so the game's color image remains the background. The custom pass must set viewport/scissor and bind the framebuffer/pipeline explicitly, then leave the framebuffer in the state expected by the existing counter/menu and PRESENT transition.

The upstream source is a Git submodule pinned by this repository; its files are not ordinary tracked files in the parent repository. The implementation is carried as a reproducible patch applied by the dependency-preparation script.
