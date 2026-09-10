#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly UPSTREAM="$ROOT/upstream/gifsicle"
readonly OUTPUT="${NATIVE_OUTPUT:-$ROOT/verification/gifsicle-native}"
readonly CC="${CC:-gcc}"
readonly EXPECTED_GCC='14.2.0'

actual_version="$($CC -dumpfullversion -dumpversion)"
if [[ "$actual_version" != "$EXPECTED_GCC" ]]; then
  printf 'Expected GCC %s, got %s\n' "$EXPECTED_GCC" "$actual_version" >&2
  exit 1
fi
if [[ "${NATIVE_SANITIZE:-0}" != '1' ]]; then
  actual_system="$(uname -s)"
  actual_target="$($CC -dumpmachine)"
  if [[ "$actual_system" != 'Linux' || "$actual_target" != x86_64*-linux-gnu ]]; then
    printf 'Expected Linux x64 GCC target, got %s %s\n' \
      "$actual_system" "$actual_target" >&2
    exit 1
  fi
fi

build_dir="$(mktemp -d "${TMPDIR:-/tmp}/gifsicle-native.XXXXXX")"
cleanup() {
  rm -rf "$build_dir"
}
trap cleanup EXIT
(
  cd "$UPSTREAM"
  sha256sum --check --strict --quiet "$ROOT/upstream/gifsicle.sha256"
)
cp -a "$UPSTREAM/." "$build_dir/"
(
  cd "$build_dir"
  git apply --check "$ROOT/upstream/gifsicle-wasm.patch"
  git apply "$ROOT/upstream/gifsicle-wasm.patch"
)
cp "$ROOT/src/wasm/config.h" "$build_dir/config.h"
mkdir -p "$build_dir/objects" "$(dirname "$OUTPUT")"

sources=(
  clp.c fmalloc.c giffunc.c gifread.c gifunopt.c gifwrite.c kcolor.c
  merge.c optimize.c quantize.c support.c xform.c gifsicle.c
  gifsicle_bridge.c
)
objects=()
compile_flags=(-O3 -DNDEBUG -DHAVE_CONFIG_H=1 -std=gnu11)
link_flags=(-O3 -DNDEBUG -std=gnu11)
if [[ "${NATIVE_SANITIZE:-0}" == '1' ]]; then
  compile_flags=(
    -O1 -g -DNDEBUG -DHAVE_CONFIG_H=1 -std=gnu11 -fno-omit-frame-pointer
    -fsanitize=address,undefined
  )
  link_flags=(
    -O1 -g -DNDEBUG -std=gnu11 -fno-omit-frame-pointer
    -fsanitize=address,undefined
  )
fi
"$CC" "${compile_flags[@]}" \
  -I"$build_dir" -I"$build_dir/include" \
  -c "$ROOT/src/wasm/stable-qsort.c" \
  -o "$build_dir/objects/stable-qsort.o"
objects+=("$build_dir/objects/stable-qsort.o")
for source in "${sources[@]}"; do
  object="$build_dir/objects/${source%.c}.o"
  extra=()
  if [[ "$source" == 'gifsicle.c' ]]; then
    extra=(-Dmain=gifsicle_cli_main)
  fi
  "$CC" "${compile_flags[@]}" \
    -I"$build_dir" -I"$build_dir/include" "${extra[@]}" \
    -c "$build_dir/src/$source" -o "$object"
  objects+=("$object")
done
"$CC" "${link_flags[@]}" \
  -I"$build_dir" -I"$build_dir/include" \
  "$ROOT/src/wasm/native-driver.c" "${objects[@]}" -lm -o "$OUTPUT"
printf 'Built native reference at %s with GCC %s\n' "$OUTPUT" "$actual_version"
