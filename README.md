# Optimizt monorepo

This repository contains two workspaces:

- [`@343dev/optimizt`](packages/optimizt) — the published Optimizt command-line image optimizer.
- [`@343dev/optimizt-sharp`](packages/optimizt-sharp) — a private build workspace that reproducibly generates the WASM-only sharp distribution vendored into Optimizt.

## Development

```sh
npm ci
npm run check
```

`npm run build` downloads the exact upstream sharp tarball pinned by `packages/optimizt-sharp/package.json`, verifies its integrity, generates the wrapper, and copies it into the ignored `packages/optimizt/vendor` directory. Only `@343dev/optimizt` is published.
