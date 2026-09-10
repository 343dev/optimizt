#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

WASM_OUTPUT_DIR="$TEMP_DIR" "$ROOT/scripts/build-wasm.sh"

for artifact in guetzli.mjs guetzli.wasm; do
  if ! cmp -s "$ROOT/dist/$artifact" "$TEMP_DIR/$artifact"; then
    printf 'Committed dist/%s differs from a canonical rebuild.\n' \
      "$artifact" >&2
    exit 1
  fi
done

if grep -aF "$ROOT" "$ROOT/dist/guetzli.mjs" "$ROOT/dist/guetzli.wasm" >/dev/null; then
  printf 'Generated distribution contains the repository absolute path.\n' >&2
  exit 1
fi

(
  cd /tmp
  GUETZLI_VERIFY_ROOT="$ROOT" node --input-type=module <<'EOF'
import { pathToFileURL } from 'node:url';

const modulePath = `${process.env.GUETZLI_VERIFY_ROOT}/dist/guetzli.mjs`;
const createModule = (await import(pathToFileURL(modulePath).href)).default;
const module = await createModule();
const expected = [
  '_free',
  '_guetzli_encode',
  '_guetzli_output_data',
  '_guetzli_output_size',
  '_malloc',
];
const actual = Object.keys(module)
  .filter(name => name.startsWith('_') && typeof module[name] === 'function')
  .toSorted();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected runtime functions: ${actual.join(', ')}`);
}
EOF
)

printf 'Verified committed WebAssembly distribution.\n'
