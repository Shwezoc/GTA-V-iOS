# Godot native mobile prototype

## Why this branch exists
This is a parallel, self-contained native 3D gameplay foundation. It does not replace or claim to reproduce Rockstar's proprietary RAGE engine. It removes the dependency on original GTA executable inputs for developing the first playable character/vehicle/city slice.

## Current prototype
- Godot 4 project under `godot/`, mobile renderer selected.
- Procedural test street, buildings, lighting and third-person follow camera.
- CharacterBody3D player controller with walk/run.
- Arcade vehicle controller with throttle, reverse, steering and brake.
- E toggles entering/exiting the vehicle when close enough.
- Existing BMW GLB is detected and loaded if available.
- Character and vehicle primitive meshes remain as fallbacks; no unverified claim of Franklin GLB integration.

## Next integration gates
1. Run headless Godot import/parse validation in GitHub Actions.
2. Stage the already-audited Franklin animation GLB and load it as a PackedScene.
3. Retarget the scene camera and character animation state machine.
4. Replace the temporary vehicle body with a mobile-optimized BMW GLB/LOD and wheel colliders.
5. Add touch joystick, throttle, brake and interaction buttons.
6. Export/sign an iOS app and verify it on the target phone.

## Licensing and asset hygiene
Godot is MIT-licensed. Third-party code and every model/texture/animation retain their own licenses. This project must keep provenance and license notices for downloaded assets. No proprietary GTA executable, game archive, or Rockstar source code is included.
