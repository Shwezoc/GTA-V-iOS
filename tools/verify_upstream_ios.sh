#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
UPSTREAM="$ROOT/upstream/gtav-recomp"

fail=0
check_file() {
  if [ -f "$UPSTREAM/$1" ]; then
    printf 'OK      %s\n' "$1"
  else
    printf 'MISSING %s\n' "$1"
    fail=1
  fi
}

if [ ! -d "$UPSTREAM/.git" ] && [ ! -f "$UPSTREAM/.git" ]; then
  echo "ERROR: upstream submodule is not initialized. Run: git submodule update --init --recursive"
  exit 2
fi

echo "=== Upstream iOS host source ==="
check_file README.md
check_file gtav/CMakeLists.txt
check_file gtav/src/main.cpp
check_file gtav/src/gtav_app.h
check_file gtav/src/ios_setup.mm
check_file gtav/src/ios_setup.h
check_file gtav/src/native/renderer.cpp
check_file tools/ios/make_shell.sh
check_file docs/IOS_PORT.md

echo "=== Generated / external build inputs (not assumed to exist) ==="
for p in \
  "$UPSTREAM/gtav/generated/rexglue.cmake" \
  "$UPSTREAM/rexglue-sdk/CMakeLists.txt" \
  "$UPSTREAM/thirdparty/plume/CMakeLists.txt" \
  "$UPSTREAM/thirdparty/sdl3/CMakeLists.txt" \
  "$UPSTREAM/thirdparty/FFmpeg/CMakeLists.txt"; do
  if [ -f "$p" ]; then
    printf 'PRESENT %s\n' "${p#"$UPSTREAM/"}"
  else
    printf 'NEEDED  %s\n' "${p#"$UPSTREAM/"}"
  fi
done

echo "=== Pinned source revision ==="
git -C "$UPSTREAM" rev-parse HEAD

if [ "$fail" -ne 0 ]; then
  echo "ERROR: required upstream source files are missing."
  exit 1
fi

echo "Source audit passed. This does NOT mean the runtime is linked or the iOS app is built."
