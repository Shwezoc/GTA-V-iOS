#!/bin/sh
# Prepare the exact upstream third-party source trees required by the pinned iOS port.
# Run on macOS (or a machine with git); this fetches source only, never game data.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
UPSTREAM="$ROOT/upstream/gtav-recomp"
PATCHES="$UPSTREAM"

if [ ! -d "$UPSTREAM/.git" ] && [ ! -f "$UPSTREAM/.git" ]; then
  echo "ERROR: initialize upstream/gtav-recomp first:"
  echo "  git submodule update --init --recursive"
  exit 2
fi

clone_pinned() {
  url="$1"
  dir="$2"
  commit="$3"
  if [ ! -d "$dir/.git" ] && [ ! -f "$dir/.git" ]; then
    mkdir -p "$(dirname "$dir")"
    git clone "$url" "$dir"
  fi
  git -C "$dir" fetch --tags origin
  expected="$(git -C "$dir" rev-parse "$commit^{commit}")"
  actual="$(git -C "$dir" rev-parse HEAD)"
  if [ "$actual" != "$expected" ]; then
    if [ -n "$(git -C "$dir" status --porcelain)" ]; then
      echo "ERROR: $dir has local changes at an unexpected revision; refusing to overwrite them."
      exit 3
    fi
    git -C "$dir" checkout --detach "$expected"
  fi
  git -C "$dir" submodule update --init --recursive
  actual="$(git -C "$dir" rev-parse HEAD)"
  if [ "$actual" != "$expected" ]; then
    echo "ERROR: wrong revision in $dir: $actual (expected $expected)"
    exit 4
  fi
  echo "PINNED $dir @ $actual"
}

apply_once() {
  repo_dir="$1"
  patch_file="$2"
  if [ ! -f "$patch_file" ]; then
    echo "ERROR: missing patch: $patch_file"
    exit 5
  fi
  if git -C "$repo_dir" apply --reverse --check "$patch_file" >/dev/null 2>&1; then
    echo "PATCHED $repo_dir (already applied)"
  elif git -C "$repo_dir" apply --check "$patch_file"; then
    git -C "$repo_dir" apply "$patch_file"
    echo "PATCHED $repo_dir"
  else
    echo "ERROR: patch does not apply cleanly: $patch_file"
    exit 6
  fi
}

SDK="$UPSTREAM/rexglue-sdk"
PLUME="$UPSTREAM/thirdparty/plume"
XENOS="$UPSTREAM/thirdparty/XenosRecomp"

clone_pinned "https://github.com/rexglue/rexglue-sdk.git" "$SDK" "f5337cd"
apply_once "$SDK" "$PATCHES/rexglue-sdk-gtav-linux.patch"
apply_once "$SDK/thirdparty/sdl3" "$PATCHES/sdl3-gtav.patch"
apply_once "$SDK/thirdparty/FFmpeg" "$PATCHES/ffmpeg-gtav.patch"

clone_pinned "https://github.com/renderbag/plume.git" "$PLUME" "0ce184b"
apply_once "$PLUME" "$PATCHES/plume-gtav.patch"

clone_pinned "https://github.com/hedge-dev/XenosRecomp.git" "$XENOS" "990d03b"
apply_once "$XENOS" "$PATCHES/xenosrecomp-gtav.patch"

# Apply the depth-tested Plume 3D cube bring-up to the pinned upstream RAGE present pass; keep this patch idempotent. Validate unified diff before applying.
apply_once "$UPSTREAM" "$ROOT/patches/rage-scene-probe.patch"
grep -q "DrawSceneProbe" "$UPSTREAM/gtav/src/native/backend.cpp"
grep -q "scene_probe_depth_" "$UPSTREAM/gtav/src/native/renderer.cpp"

echo
echo "Third-party source trees are pinned and patched."
echo "This is dependency preparation only; it does not build the iOS runtime or include GTA V data."
