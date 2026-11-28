# GTA V iOS Port — Shwezoc

Experimental iOS porting and compatibility workspace targeting iPhone 11 (A13 Bionic).

> This repository contains original integration code and tooling only. It does not include Rockstar Games source code, proprietary RAGE Engine code, or GTA V game assets. Use only game data you are legally entitled to use.

## Target
- Prototype device baseline: iPhone 11 (A13 Bionic) for the lightweight SceneKit test only
- Full upstream ReXGlue runtime target: iPhone 12 (A14) or newer, iOS 17+ (per upstream iOS port notes)
- Platform: iOS 15+ for the prototype; iOS 17+ required for the upstream runtime
- Native shell: SwiftUI
- 3D prototype renderer: SceneKit (Metal-backed)
- Portable integration layer: C++17

## Current status
- The iOS app now contains an interactive 3D walk-test scene with a procedural proxy character, ground plane, basic environment, lighting, and orbit camera.
- The proxy character is not the original Michael De Santa model.
- The SceneKit prototype is a rendering/device test only. It is not the RAGE Engine and does not run GTA V.
- The C++ integration layer and upstream runtime are not yet connected to the iOS scene.
- iOS IPA build is performed by GitHub Actions; check the Actions run for the actual build result.

## Layout
- `ios/` — native iOS application and rendering prototype
- `engine/` — portable C++ integration layer
- `docs/` — architecture and porting research

## Principles
1. Keep platform-specific code in `ios/`.
2. Keep portable runtime code in `engine/`.
3. Do not commit copyrighted game archives, decrypted executables, keys, or proprietary source.
4. Profile memory, CPU, GPU, and thermal load on real target hardware.
