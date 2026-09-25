# Optimizt monorepo

This repository contains four workspaces:

- [`@343dev/optimizt`](packages/optimizt) — the published Optimizt command-line image optimizer.
- [`@343dev/optimizt-sharp`](packages/optimizt-sharp) — a private build workspace that reproducibly generates the WASM-only Sharp distribution vendored into Optimizt.
- [`@343dev/optimizt-guetzli`](packages/optimizt-guetzli) — the private Guetzli WebAssembly build and provenance workspace.
- [`@343dev/optimizt-gifsicle`](packages/optimizt-gifsicle) — the private Gifsicle WebAssembly build and provenance workspace.

## Development

```sh
npm ci
npm run check
```

`npm run build` downloads the exact upstream Sharp tarball pinned by `packages/optimizt-sharp/package.json`, verifies its integrity, generates the wrapper, and copies all three codec runtimes into the ignored `packages/optimizt/vendor` directory. Only `@343dev/optimizt` is published.
