#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gifsicle-patch.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

cp -a "$ROOT/upstream/gifsicle/." "$TEMP_DIR/"
(
  cd "$TEMP_DIR"
  git apply --check "$ROOT/upstream/gifsicle-wasm.patch"
  git apply "$ROOT/upstream/gifsicle-wasm.patch"
)

printf 'Verified exact Gifsicle integration patch application.\n'
