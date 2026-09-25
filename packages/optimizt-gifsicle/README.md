# Gifsicle WebAssembly for Optimizt

Gifsicle v1.96 compiled to WebAssembly for exclusive use inside the Optimizt
monorepo. This directory is not a public package.

The internal runtime accepts a `Buffer` or `Uint8Array` containing one GIF and
returns a `Promise<Buffer>`. Every operation uses a fresh Worker Thread and
WebAssembly instance. The module uses wasm64 linear memory with a 16 GiB maximum
and requires Node.js 24.0.0 or newer. It has no filesystem interface, runtime
dependencies, native executables, install scripts, platform allowlist, or
first-run downloads.

Supported options are:

- `optimize`: `false` or an integer from 0 through 3
- `careful`: a boolean
- `colors`: `false` or an integer from 2 through 256
- `lossy`: `false` or an integer from 0 through 2,147,483,647
- `gamma`: `false`, a positive finite number, `srgb`, or `oklab`

Encoded input is limited to 128 MiB. Parsing also limits GIFs to 100,000 frames,
a 134,217,728-pixel logical canvas, and 134,217,728 total frame pixels.

See [UPSTREAM.md](UPSTREAM.md) for source and toolchain provenance.

## Development

Install the monorepo dependencies from the repository root:

```sh
npm ci --ignore-scripts
```

Before completing a change, run from the repository root:

```sh
npm run lint --workspace @343dev/optimizt-gifsicle
npm test --workspace @343dev/optimizt-gifsicle
```

Changes to the bridge, build scripts, Emscripten version, or committed
distribution also require:

```sh
npm run verify:dist --workspace @343dev/optimizt-gifsicle
```
