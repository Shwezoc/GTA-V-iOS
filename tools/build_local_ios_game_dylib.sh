#!/bin/bash
# Build the user's local iOS game library from their locally generated ReXGlue sources.
# This script MUST run on macOS. It never uploads or commits generated game code.
#
# Usage:
#   tools/build_local_ios_game_dylib.sh LLVM_BIN GENERATED_DIR IOS_SHELL_ROOT OUT_DIR [JOBS]
#
# IOS_SHELL_ROOT is the extracted no-game-data artifact root containing:
#   GTAV.app/librexruntime.dylib, interface/, include/simde/
#
# GENERATED_DIR must be produced locally from the user's own legally obtained game data
# by the pinned upstream code-generation/build workflow. It is not a public CI input.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: the upstream iOS game-library build requires a macOS host."
  exit 2
fi
if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "Usage: $0 LLVM_BIN GENERATED_DIR IOS_SHELL_ROOT OUT_DIR [JOBS]"
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="$ROOT/upstream/gtav-recomp"
LLVM_BIN="$(cd "$1" && pwd)"
GENERATED="$(cd "$2" && pwd)"
SHELL_ROOT="$(cd "$3" && pwd)"
OUT="$4"
JOBS="${5:-4}"
APP="$SHELL_ROOT/GTAV.app"
INTERFACE="$SHELL_ROOT/interface"
SIMDE_ROOT="$SHELL_ROOT/include"
RUNTIME="$APP/librexruntime.dylib"

for path in \
  "$UPSTREAM/tools/game_dll/build_game_dll.py" \
  "$UPSTREAM/tools/game_dll/libSystem_ios.tbd" \
  "$UPSTREAM/gtav/fs/gtav_pch.h" \
  "$APP/gtav" \
  "$RUNTIME" \
  "$INTERFACE/gtav_hooks.h" \
  "$INTERFACE/gtav_game.exports" \
  "$INTERFACE/gtav_game.undefs" \
  "$SIMDE_ROOT/simde"; do
  if [[ ! -e "$path" ]]; then
    echo "ERROR: required input missing: $path"
    exit 3
  fi
done

if ! find "$GENERATED" -maxdepth 1 -type f -name 'gtav_recomp.*.cpp' -print -quit | grep -q .; then
  echo "ERROR: GENERATED_DIR has no gtav_recomp.*.cpp files."
  exit 4
fi
if ! find "$GENERATED" -maxdepth 1 -type f -name "gtav_init.cpp" -print -quit | grep -q .; then
  echo "ERROR: GENERATED_DIR is missing gtav_init.cpp."
  exit 4
fi
if ! find "$GENERATED" -maxdepth 1 -type f -name "gtav_funcs*.h" -print -quit | grep -q .; then
  echo "ERROR: GENERATED_DIR is missing gtav_funcs*.h."
  exit 4
fi

mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gtav-ios-game-build.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
GENERATED_COPY="$WORK/generated"
mkdir -p "$GENERATED_COPY"
ditto "$GENERATED" "$GENERATED_COPY"

echo "=== Building local gtav_game.dylib ==="
echo "Upstream: $(git -C "$UPSTREAM" rev-parse HEAD)"
echo "Generated source: $GENERATED"
echo "Shell bundle: $APP"
echo "No game data or generated source will be uploaded."

python3 "$UPSTREAM/tools/game_dll/build_game_dll.py" \
  "$LLVM_BIN" \
  "$GENERATED_COPY" \
  "$INTERFACE" \
  "$OUT" \
  -j "$JOBS" \
  --ios \
  --runtime "$RUNTIME" \
  --simde "$SIMDE_ROOT"

DYLIB="$OUT/gtav_game.dylib"
if [[ ! -s "$DYLIB" ]]; then
  echo "ERROR: build did not produce $DYLIB"
  exit 5
fi

file "$DYLIB"
ARCHS="$(lipo -archs "$DYLIB")"
echo "Architectures: $ARCHS"
case " $ARCHS " in
  *" arm64 "*) ;;
  *) echo "ERROR: game library is not arm64"; exit 6 ;;
esac
otool -L "$DYLIB" | tee "$OUT/GTAV-GAME-DYLIB-AUDIT.txt"
grep -q 'librexruntime.dylib' "$OUT/GTAV-GAME-DYLIB-AUDIT.txt" || {
  echo "ERROR: expected ReXGlue runtime dependency was not found"
  exit 7
}

if [[ -n "${IOS_APP_DIR:-}" ]]; then
  if [[ ! -d "$IOS_APP_DIR" || ! -s "$IOS_APP_DIR/gtav" ]]; then
    echo "ERROR: IOS_APP_DIR must point to an extracted GTAV.app bundle."
    exit 8
  fi
  cp "$DYLIB" "$IOS_APP_DIR/gtav_game.dylib"
  echo "Copied local game library into: $IOS_APP_DIR/gtav_game.dylib"
  echo "The app is still unsigned; sign it locally with your own Apple development identity."
fi

cat > "$OUT/LOCAL-BUILD-STATUS.txt" <<EOF
Local iOS game library build completed.
Architecture: $ARCHS
Upstream revision: $(git -C "$UPSTREAM" rev-parse HEAD)
This output is generated from locally supplied game data and must remain local.
Do not commit, publish, or upload gtav_game.dylib or generated game sources.
The resulting app bundle still requires local signing and compatible game data/shaders.
EOF

echo "SUCCESS: $DYLIB"
