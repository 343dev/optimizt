#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly SDK_DIR="${EMSDK_INSTALL_DIR:-$ROOT/.cache/emsdk}"
readonly EMSDK_VERSION='6.0.9'
readonly EMSDK_COMMIT='5eb0bde7585670252e8ba05e9d361627bffd08b5'

if [[ -e "$SDK_DIR" && ! -d "$SDK_DIR/.git" ]]; then
  printf '%s exists but is not an emsdk Git checkout\n' "$SDK_DIR" >&2
  exit 1
fi

if [[ ! -d "$SDK_DIR/.git" ]]; then
  mkdir -p "$(dirname "$SDK_DIR")"
  git clone --filter=blob:none --no-checkout \
    https://github.com/emscripten-core/emsdk.git "$SDK_DIR"
  git -C "$SDK_DIR" fetch --depth 1 origin "$EMSDK_COMMIT"
  git -C "$SDK_DIR" checkout --detach "$EMSDK_COMMIT"
fi

actual_commit="$(git -C "$SDK_DIR" rev-parse HEAD 2>/dev/null || true)"
if [[ "$actual_commit" != "$EMSDK_COMMIT" ]]; then
  printf 'Expected emsdk commit %s, found %s in %s\n' \
    "$EMSDK_COMMIT" "$actual_commit" "$SDK_DIR" >&2
  printf 'Remove that checkout or choose another EMSDK_INSTALL_DIR.\n' >&2
  exit 1
fi

if [[ ! -x "$SDK_DIR/emsdk" ]]; then
  git -C "$SDK_DIR" reset --hard "$EMSDK_COMMIT"
fi

"$SDK_DIR/emsdk" install "$EMSDK_VERSION"
"$SDK_DIR/emsdk" activate "$EMSDK_VERSION"

actual_version="$($SDK_DIR/upstream/emscripten/em++ --version | head -n 1)"
if [[ "$actual_version" != *" $EMSDK_VERSION "* ]]; then
  printf 'Expected Emscripten %s, got: %s\n' \
    "$EMSDK_VERSION" "$actual_version" >&2
  exit 1
fi

printf 'Emscripten %s is ready at %s\n' "$EMSDK_VERSION" "$SDK_DIR"
