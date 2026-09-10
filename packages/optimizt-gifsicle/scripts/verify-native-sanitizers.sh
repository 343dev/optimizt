#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gifsicle-sanitize.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

NATIVE_SANITIZE=1 NATIVE_OUTPUT="$TEMP_DIR/gifsicle-native" \
  "$ROOT/scripts/build-native.sh"

run_case() {
  local fixture="$1"
  local name="$2"
  shift 2
  ASAN_OPTIONS='detect_leaks=1:halt_on_error=1' \
    UBSAN_OPTIONS='halt_on_error=1:print_stacktrace=1' \
    "$TEMP_DIR/gifsicle-native" \
      "$ROOT/test/fixtures/$fixture" "$@" "$TEMP_DIR/$name.gif"
}

run_case animated.gif no-options 0 0 0 0 0 2.2
run_case animated.gif lossless 3 1 256 0 1 1
run_case animated.gif lossy 3 0 256 100 1 1
run_case transparent.gif transparent 3 1 128 20 0 2.2

printf 'Verified native bridge with AddressSanitizer and UndefinedBehaviorSanitizer.\n'
