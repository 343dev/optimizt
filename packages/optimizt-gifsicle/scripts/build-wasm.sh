#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/emsdk-version.sh
source "$ROOT/scripts/emsdk-version.sh"
readonly EMSDK_VERSION
readonly UPSTREAM="$ROOT/upstream/gifsicle"
readonly PATCH="$ROOT/upstream/gifsicle-wasm.patch"
readonly OUTPUT_DIR="${WASM_OUTPUT_DIR:-$ROOT/dist}"
readonly SDK_DIR="${EMSDK_INSTALL_DIR:-$ROOT/.cache/emsdk}"
readonly EMCC="$SDK_DIR/upstream/emscripten/emcc"

if [[ ! -x "$EMCC" ]]; then
  printf 'Emscripten is not installed at %s. Run npm run setup-emsdk.\n' \
    "$SDK_DIR" >&2
  exit 1
fi

actual_version="$("$EMCC" --version | grep -m 1 emcc)"
if [[ "$actual_version" != *" $EMSDK_VERSION "* ]]; then
  printf 'Expected Emscripten %s, got: %s\n' \
    "$EMSDK_VERSION" "$actual_version" >&2
  exit 1
fi

build_dir="$(mktemp -d "${TMPDIR:-/tmp}/gifsicle-wasm.XXXXXX")"
cleanup() {
  rm -rf "$build_dir"
}
trap cleanup EXIT

cp -a "$UPSTREAM/." "$build_dir/"
(
  cd "$build_dir"
  git apply --check "$PATCH"
  git apply "$PATCH"
)
cp "$ROOT/src/wasm/config.h" "$build_dir/config.h"

sources=(
  clp.c
  fmalloc.c
  giffunc.c
  gifread.c
  gifunopt.c
  gifwrite.c
  kcolor.c
  merge.c
  optimize.c
  quantize.c
  support.c
  xform.c
  gifsicle.c
  gifsicle_bridge.c
)
objects=()
mkdir -p "$build_dir/objects" "$OUTPUT_DIR"
"$EMCC" \
  -O3 \
  -DNDEBUG \
  -DHAVE_CONFIG_H=1 \
  -ffile-prefix-map="$ROOT"=/gifsicle-package \
  -fdebug-prefix-map="$ROOT"=/gifsicle-package \
  -fmacro-prefix-map="$ROOT"=/gifsicle-package \
  -std=gnu11 \
  -I"$build_dir" \
  -I"$build_dir/include" \
  -c "$ROOT/src/wasm/stable-qsort.c" \
  -o "$build_dir/objects/stable-qsort.o"
objects+=("$build_dir/objects/stable-qsort.o")
for source in "${sources[@]}"; do
  object="$build_dir/objects/${source%.c}.o"
  extra=(-I"$build_dir" -I"$build_dir/include")
  if [[ "$source" == 'gifsicle.c' ]]; then
    extra+=(-Dmain=gifsicle_cli_main)
  fi
  "$EMCC" \
    -O3 \
    -DNDEBUG \
    -DHAVE_CONFIG_H=1 \
    -ffile-prefix-map="$build_dir"=/gifsicle-source \
    -fdebug-prefix-map="$build_dir"=/gifsicle-source \
    -fmacro-prefix-map="$build_dir"=/gifsicle-source \
    -std=gnu11 \
    "${extra[@]}" \
    -c "$build_dir/src/$source" \
    -o "$object"
  objects+=("$object")
done

"$EMCC" \
  -O3 \
  -DNDEBUG \
  "${objects[@]}" \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sENVIRONMENT=node \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMAXIMUM_MEMORY=4GB \
  -sFILESYSTEM=0 \
  -sINCOMING_MODULE_JS_API=print,printErr \
  -sEXPORTED_FUNCTIONS=_malloc,_free,_gifsicle_optimize,_gifsicle_output_data,_gifsicle_output_size,_gifsicle_error_message,_gifsicle_reset \
  -sEXPORTED_RUNTIME_METHODS=HEAPU8,UTF8ToString \
  -o "$OUTPUT_DIR/gifsicle.mjs"

if [[ ! -f "$OUTPUT_DIR/gifsicle.wasm" ]]; then
  printf 'Emscripten did not produce %s/gifsicle.wasm\n' "$OUTPUT_DIR" >&2
  exit 1
fi
printf 'Built %s and %s\n' \
  "$OUTPUT_DIR/gifsicle.mjs" "$OUTPUT_DIR/gifsicle.wasm"
