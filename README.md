# GTA V iOS Port — Shwezoc

Experimental iOS porting and compatibility workspace.

> This repository contains original integration code and tooling only. It does not include Rockstar Games source code, proprietary RAGE Engine code, or GTA V game assets. Use only game data you are legally entitled to use.

## Target
- Device baseline: iPhone 11 (A13 Bionic)
- Platform: iOS
- Rendering target: Metal
- Native shell: Swift
- Portable core: C++17

## Current status
Initial iOS shell and C++ input/frame scaffolding. The `gtav-recomp` upstream is referenced as a Git submodule, but its runtime is not yet linked into the iOS target. The current Metal renderer is a diagnostic triangle, not GTA V gameplay.

## Layout
- `ios/` — native iOS application shell
- `engine/` — portable C++ integration layer
- `docs/` — architecture and porting research
- `tools/` — validation and asset-manifest utilities

## Principles
1. Keep platform-specific code in `ios/`.
2. Keep portable runtime code in `engine/`.
3. Do not commit copyrighted game archives, decrypted executables, keys, or proprietary source.
4. Profile memory, CPU, GPU, and thermal load on real target hardware.
