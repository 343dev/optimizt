# Upstream provenance

## Google Guetzli

- Project: [Google Guetzli](https://github.com/google/guetzli)
- Version: 1.0.1
- Commit: `a0f47a297f802630f937a3091964838eaf3b87d8`
- License: Apache-2.0
- Source archive SHA-256: `98fe2f9befc06eb1796a8906b3e940eccd8c4a634ee05ddf3b36c59c15504fc7`
- Official Linux x64 release binary SHA-256: `44d32910aa2a0e5a5076c12ba7115ff5d2bd1192afdda0f8fe55421c374cba18`

`upstream/guetzli/` is an unmodified snapshot of the commit above. `upstream/guetzli.sha256` records every vendored file. WebAssembly integration is kept outside that directory.

The official release binary is corroborating evidence only. The source commit is authoritative. The native reference used by parity tests is compiled from the vendored source for Linux x64 with GCC 14.2.0 and the upstream release flags.

## WebAssembly toolchain

- Emscripten SDK: 6.0.9
- emsdk commit: `5eb0bde7585670252e8ba05e9d361627bffd08b5`
- Emscripten compiler revision: `4e4223852a0835923411059a3929907d7df1232e`

The WebAssembly distribution is built from the unmodified Guetzli library sources plus `src/wasm/bridge.cc`. The original filesystem CLI and PNG reader are not compiled. The internal Optimizt integration intentionally supports JPEG input only and applies no preflight memory limit.
