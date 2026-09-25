#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly IMAGE='gcc:14.2.0@sha256:b99b86a28812b1e6453a231a947dc43d76fe192788a12f344a9b568bf9f5d24c'
readonly ENGINE="${CONTAINER_ENGINE:-docker}"

"$ENGINE" run --rm \
  --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$ROOT:/workspace" \
  --workdir /workspace \
  "$IMAGE" \
  ./scripts/build-native.sh
