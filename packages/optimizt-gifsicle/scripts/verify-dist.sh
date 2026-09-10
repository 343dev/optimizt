#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gifsicle-dist.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

WASM_OUTPUT_DIR="$TEMP_DIR" "$ROOT/scripts/build-wasm.sh"

for artifact in gifsicle.mjs gifsicle.wasm; do
  if ! cmp -s "$ROOT/dist/$artifact" "$TEMP_DIR/$artifact"; then
    printf 'Committed dist/%s differs from a canonical rebuild.\n' \
      "$artifact" >&2
    exit 1
  fi
done

if grep -aF "$ROOT" "$ROOT/dist/gifsicle.mjs" "$ROOT/dist/gifsicle.wasm" >/dev/null; then
  printf 'Generated distribution contains the repository absolute path.\n' >&2
  exit 1
fi

if find "$ROOT/dist" -type f \( -name '*.map' -o -name '*.debug' \) -print -quit | grep -q .; then
  printf 'Generated distribution contains an unexpected debug artifact.\n' >&2
  exit 1
fi

(
  cd /tmp
  GIFSICLE_VERIFY_ROOT="$ROOT" node --input-type=module <<'EOF'
import { pathToFileURL } from 'node:url';

const modulePath = `${process.env.GIFSICLE_VERIFY_ROOT}/dist/gifsicle.mjs`;
const createModule = (await import(pathToFileURL(modulePath).href)).default;
const module = await createModule();
if (typeof module._gifsicle_optimize !== 'function') {
  throw new Error('Emscripten loader did not resolve gifsicle.wasm through import.meta.url');
}
EOF
)

printf 'Verified committed WebAssembly distribution.\n'
