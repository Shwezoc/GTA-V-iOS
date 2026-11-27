#!/usr/bin/env bash
set -uo pipefail

UPSTREAM="upstream/gtav-recomp/gtav/src/native/shaders"
OUT="${1:-webgpu-shader-probe}"
mkdir -p "$OUT"
REPORT="$OUT/REPORT.txt"
: > "$REPORT"

probe_shader() {
  local name="$1"
  local stage="$2"
  local source="$3"
  shift 3
  local spv="$OUT/$name.spv"
  local wgsl="$OUT/$name.wgsl"

  echo "=== $name ($stage) ===" | tee -a "$REPORT"
  if ! glslangValidator -V -S "$stage" "$@" -o "$spv" "$source" 2>&1 | tee "$OUT/$name.glslang.log"; then
    echo "BLOCKED: GLSL to SPIR-V compilation failed" | tee -a "$REPORT"
    return
  fi

  if ! naga "$spv" "$wgsl" >"$OUT/$name.naga.log" 2>&1; then
    cat "$OUT/$name.naga.log" | tee -a "$REPORT"
    echo "BLOCKED: SPIR-V to WGSL translation failed" | tee -a "$REPORT"
    return
  fi

  if ! naga "$wgsl" >>"$OUT/$name.naga.log" 2>&1; then
    cat "$OUT/$name.naga.log" | tee -a "$REPORT"
    echo "BLOCKED: generated WGSL validation failed" | tee -a "$REPORT"
    return
  fi

  echo "PASS: SPIR-V compiled, translated to WGSL, and WGSL validated" | tee -a "$REPORT"
}

if [ ! -d "$UPSTREAM" ]; then
  echo "ERROR: pinned upstream shader directory not found: $UPSTREAM" | tee -a "$REPORT"
  exit 2
fi

probe_shader "native_resolve_fetch_vert" vert "$UPSTREAM/native_resolve_fetch.vert"
probe_shader "native_resolve_compute" comp "$UPSTREAM/native_resolve_compute.comp"
probe_shader "native_resolve_fetch_frag" frag "$UPSTREAM/native_resolve_fetch.frag" -DSOURCE=0

echo | tee -a "$REPORT"
echo "This is a shader portability probe only. It does not build or execute RAGE." | tee -a "$REPORT"
