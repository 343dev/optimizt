# Guetzli WebAssembly for Optimizt

Google Guetzli v1.0.1 compiled to WebAssembly for exclusive use inside the
Optimizt monorepo. This directory is not a public package.

The runtime is intentionally minimal:

- JPEG input is read from standard input.
- JPEG output is written to standard output.
- `--quality Q` accepts an integer from 84 to 110 and defaults to 90.
- There is no JavaScript API, filesystem interface, Worker, verbose mode, or
  application-level memory limit.

Optimizt must launch `cli.js` as a child Node.js process. Process isolation is
the memory-safety boundary: if Guetzli exhausts available memory, the runtime or
operating system may terminate only that child process.

```sh
node cli.js --quality 90 < input.jpg > output.jpg
```

## Resource use

Guetzli is deliberately CPU- and memory-intensive. Upstream estimates
approximately 300 MiB per megapixel and about one minute of CPU time per
megapixel. The integration does not estimate or limit memory before encoding.
WebAssembly's wasm32 address-space ceiling and the host operating system are the
effective limits.

Guetzli expects high-quality sRGB JPEG input with gamma 2.2. It ignores embedded
color-profile metadata and produces sequential JPEG output. A true
single-component grayscale JPEG is not supported by upstream Guetzli;
three-component YCbCr JPEGs with grayscale-looking pixels are supported.

See [UPSTREAM.md](UPSTREAM.md) for source and toolchain provenance.

## Development

Install the monorepo dependencies from the repository root:

```sh
npm ci --ignore-scripts
```

Before completing a change, run from the repository root:

```sh
npm run lint --workspace @343dev/optimizt-guetzli
npm test --workspace @343dev/optimizt-guetzli
```

Changes to the bridge, build scripts, Emscripten version, or committed
distribution also require:

```sh
npm run verify:dist
```
