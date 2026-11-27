# Upstream iOS host audit

## Verified upstream design

The pinned upstream is not a simple library that can be linked to the current SwiftUI triangle app. Its iOS port is a complete host/runtime integration:

- `gtav/src/main.cpp` declares the ReXGlue application via `REX_DEFINE_APP(gtav, GtavApp::Create)`.
- `gtav/src/gtav_app.h` implements `GtavApp`, registers the touch input driver in `OnPreSetup`, and handles iOS data roots in `OnFinalizePaths`.
- `gtav/src/ios_setup.mm` is the UIKit document-picker and first-run game-data installer.
- `gtav/src/native/renderer.cpp` owns the native render thread and Plume/Vulkan renderer.
- The upstream iOS port uses SDL3's UIKit video driver and a bundled MoltenVK dynamic library. It does not render through the current app's simple Metal triangle pipeline.
- The upstream build needs a separately built ReXGlue iOS SDK, Plume/SDL/FFmpeg trees with project patches, generated ReXGlue CMake inputs, native renderer shaders, and game shader SPIR-V.

## Consequence for this repository

Do not try to link `gtav/CMakeLists.txt` directly into the existing Xcode target. That target currently contains only the Swift shell and touch bridge. The correct next integration is to reproduce the upstream's documented iOS build/package pipeline as a separate build target, then replace the triangle view with the upstream SDL/UIKit host. A thin C ABI wrapper is only appropriate if the upstream app lifecycle can be hosted without duplicating its SDL main loop.

## Device constraint

Upstream documents iPhone 12/A14 as its minimum build target and an iPhone 13 mini/A15 as its tested device. This repository targets iPhone 11/A13. The existing target is therefore below the upstream's published baseline; compatibility cannot be promised.

## Legal / clean-room constraint

The upstream project explicitly separates its own GPL code from Rockstar/Microsoft game-derived code. Do not commit game archives, TU files, generated game C++, compiled game libraries, game shaders, IPA files containing game code, or game data. Build those only from the user's own legally obtained game copy, locally.

## Automated audit

Run `tools/verify_upstream_ios.sh` after initializing the submodule. It verifies source files and reports the additional generated/third-party build inputs. It intentionally does not claim that a successful shell build is a successful GTA V build.
